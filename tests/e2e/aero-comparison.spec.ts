import { test, expect, type Page } from "@playwright/test";
import {
  lapSchema,
  defaultSetup,
  type Lap,
} from "../../packages/shared/schema";
import { formatTime } from "../../packages/telemetry";

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
    await dialog.getByRole("button", { name: "Close aero comparison" }).click();
    await expect(page.getByTestId("lap-time")).toHaveText(original!);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
