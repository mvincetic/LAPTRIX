import { test, expect, type Page } from "@playwright/test";
import {
  lapSchema,
  defaultSetup,
  type Lap,
} from "../../packages/shared/schema";
import { formatTime } from "../../packages/telemetry";
import { trackFingerprint } from "../../packages/track-engine";

async function exportStudy(page: Page) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export study JSON" }).click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function openComparison(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Compare aero settings", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Compare aero settings" });
}

test("real aero runs keep other settings fixed and apply the fastest checked lap with its reference intact", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  const original = await page.getByTestId("lap-time").textContent();
  await page.getByLabel("Project name").fill("Formula aero study");
  const results: Lap[] = [];
  await page.route("**/api/simulate", async (route) => {
    const response = await route.fetch();
    results.push(lapSchema.parse(await response.json()));
    await route.fulfill({ response });
  });
  const dialog = await openComparison(page);
  await dialog
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await expect(dialog.getByTestId("aero-status")).toHaveText(
    "Comparison complete · 5 checked results",
  );
  expect(results.map((lap) => lap.setup.aero)).toEqual([0, -5, -2, 2, 5]);
  for (const lap of results)
    expect({ ...lap.setup, aero: 0 }).toEqual(defaultSetup);
  const best = [...results].sort((a, b) => a.lapTime - b.lapTime)[0];
  await expect(page.getByTestId("lap-time")).toHaveText(original!);
  await expect(dialog.locator("input:checked")).toHaveAccessibleName(
    `Select aero ${best.setup.aero > 0 ? "+" : ""}${best.setup.aero}`,
  );
  const report = await exportStudy(page);
  expect(report.format).toBe("laptrix-aero-study-v1");
  expect(report.projectName).toBe("Formula aero study");
  expect(report.outcome).toBe("completed");
  expect(report.startingSetup).toEqual(defaultSetup);
  expect(report.source.trackFingerprint).toBe(
    await trackFingerprint(report.source.track),
  );
  expect(report.source.vehicle).toEqual(results[0].vehicle);
  expect(report.fastestCheckedAero).toBe(best.setup.aero);
  expect(report.selectedAero).toBe(best.setup.aero);
  expect(report.candidates).toHaveLength(5);
  expect(Date.parse(report.finishedAt)).toBeGreaterThanOrEqual(
    Date.parse(report.startedAt),
  );
  for (let i = 0; i < results.length; i++) {
    const candidate = report.candidates[i];
    expect(candidate.state).toBe("passed");
    expect(lapSchema.parse(candidate.result)).toEqual(results[i]);
    expect(candidate.deltaSeconds).toBeCloseTo(
      results[i].lapTime - results[0].lapTime,
      10,
    );
    expect(candidate.result.solverProvenance.sourceFingerprint).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
    expect(candidate.result.solverProvenance).toEqual(
      results[0].solverProvenance,
    );
  }
  await dialog.getByRole("button", { name: "Apply selected result" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("lap-time")).toHaveText(
    formatTime(best.lapTime),
  );
  await expect(page.getByRole("slider", { name: "Aero balance" })).toHaveValue(
    String(best.setup.aero),
  );
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(original!);
  await expect(
    page.getByRole("button", { name: "Additional actions" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("lap-time")).toHaveText(
    formatTime(best.lapTime),
  );
  await expect(page.getByRole("slider", { name: "Aero balance" })).toHaveValue(
    String(best.setup.aero),
  );
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(original!);
});

test("failed and numerically excluded runs cannot replace the workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const original = await page.getByTestId("lap-time").textContent();
  await page.route("**/api/simulate", async (route) => {
    if (route.request().postDataJSON().setup.aero === 0) {
      await route.fulfill({
        status: 503,
        json: { detail: "Injected comparison service failure" },
      });
      return;
    }
    const response = await route.fetch();
    const lap = await response.json();
    lap.numericalChecks.speedConverged = false;
    await route.fulfill({ response, json: lap });
  });
  const dialog = await openComparison(page);
  await dialog
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await expect(dialog.getByTestId("aero-status")).toHaveText(
    "Comparison complete · 0 checked results",
  );
  await expect(
    dialog.getByRole("button", { name: "Apply selected result" }),
  ).toBeDisabled();
  await expect(dialog.getByText("Excluded", { exact: true })).toHaveCount(4);
  await dialog.getByText("Failed", { exact: true }).click();
  await expect(
    dialog.getByText("Injected comparison service failure"),
  ).toBeVisible();
  await expect(dialog.locator("input:enabled")).toHaveCount(0);
  const report = await exportStudy(page);
  expect(report.selectedAero).toBeNull();
  expect(report.fastestCheckedAero).toBeNull();
  expect(report.candidates.map((row: { state: string }) => row.state)).toEqual([
    "failed",
    "excluded",
    "excluded",
    "excluded",
    "excluded",
  ]);
  expect(report.candidates[0].result).toBeNull();
  expect(
    report.candidates.every(
      (row: { deltaSeconds: number | null }) => row.deltaSeconds === null,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("lap-time")).toHaveText(original!);
});

test("stopping aborts an in-flight request and prevents the remaining candidate queue", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const original = await page.getByTestId("lap-time").textContent();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/simulate", async (route) => {
    requests++;
    await gate;
    await route.abort("aborted");
  });
  try {
    const dialog = await openComparison(page);
    const started = page.waitForRequest("**/api/simulate");
    await dialog
      .getByRole("button", { name: "Run comparison", exact: true })
      .click();
    await started;
    const aborted = page.waitForEvent("requestfailed", (request) =>
      request.url().endsWith("/api/simulate"),
    );
    await dialog.getByRole("button", { name: "Stop comparison" }).click();
    await aborted;
    await expect(dialog.getByTestId("aero-status")).toHaveText(
      "Comparison stopped · 0 checked results",
    );
    await expect(
      dialog.getByRole("button", { name: "Apply selected result" }),
    ).toBeDisabled();
    expect(requests).toBe(1);
    const report = await exportStudy(page);
    expect(report.outcome).toBe("stopped");
    expect(report.selectedAero).toBeNull();
    expect(report.candidates).toHaveLength(5);
    expect(
      report.candidates.every(
        (row: { state: string; result: unknown }) =>
          row.state === "not-run" && row.result === null,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Close aero comparison" }).click();
    await expect(page.getByTestId("lap-time")).toHaveText(original!);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
