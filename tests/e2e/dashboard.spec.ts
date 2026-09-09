import { test, expect } from "@playwright/test";

test("lap-time refinement reports its real gain, persists and drives playback", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const seed = await page.getByTestId("lap-time").textContent();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Solver mode" })
    .selectOption("lap-time");
  await expect(
    page.getByText(/Vehicle-aware search · 78 candidates/),
  ).toBeVisible();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/simulate") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  const data = await (await response).json();
  expect(data.optimization.refinement.seedLapTime - data.lapTime).toBeCloseTo(
    data.optimization.refinement.gainSeconds,
    8,
  );
  expect(data.optimization.refinement.gainSeconds).toBeGreaterThan(0);
  expect(data.numericalChecks.maxDemandRatio).toBeLessThanOrEqual(
    data.numericalChecks.demandTolerance,
  );
  await expect(page.getByTestId("refinement-summary")).toContainText(
    "78 candidates",
  );
  await expect(page.getByTestId("lap-time")).not.toHaveText(seed!);
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(seed!);
  await page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .click();
  await expect(page.locator(".corner-detail")).toBeInViewport({ ratio: 1 });
  expect(
    Number(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ),
  ).toBeCloseTo(data.samples[data.corners[1].apexIndex].time, 1);
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export telemetry JSON", exact: true })
    .click();
  const stream = await (await downloaded).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.optimization.refinement).toEqual(
    data.optimization.refinement,
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Solver mode" })).toHaveValue(
    "lap-time",
  );
  await expect(page.getByTestId("refinement-summary")).toContainText(
    "78 candidates",
  );
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(seed!);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator(".advanced summary").click();
  const density = page.getByRole("slider", { name: "Air density" });
  await density.scrollIntoViewIfNeeded();
  await expect(density).toBeInViewport();
  const note = await page.locator(".model-note").boundingBox();
  const panel = await page.locator(".settings-panel").boundingBox();
  expect(note!.y + note!.height).toBeLessThanOrEqual(panel!.y + panel!.height);
});

test("real simulation, settings, comparison and playback stay synchronized", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toHaveText(/\d+:\d{2}\.\d{3}/);
  await expect(page.locator("canvas")).toBeVisible();
  const initial = await page.getByTestId("lap-time").textContent();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Fuel load", exact: true })
    .fill("100");
  await expect(page.getByText("Setup changed · run to apply")).toBeVisible();
  await expect(page.getByTestId("lap-time")).toHaveText(initial!);
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page.getByText("Setup matches current run")).toBeVisible();
  await expect(page.getByTestId("lap-time")).not.toHaveText(initial!);
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(() => page.getByTestId("playback-time").textContent())
    .not.toBe("0:00.000");
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  const time = await page.getByTestId("playback-time").textContent();
  await page.waitForTimeout(150);
  await expect(page.getByTestId("playback-time")).toHaveText(time!);
  await page.getByRole("slider", { name: "Lap playback position" }).fill("30");
  await expect(page.getByTestId("playback-time")).toHaveText("0:30.000");
  await page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .click();
  await expect(page.getByText("T2 · Left corner")).toBeVisible();
  await expect(page.locator(".corner-detail")).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId("playback-time")).not.toHaveText("0:30.000");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Project saved on this device")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Fuel load", exact: true }),
  ).toHaveValue("100");
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(initial!);
  expect(errors).toEqual([]);
});

test("layers, camera modes, exports, telemetry tabs and responsive layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("tab", { name: "Analysis Layers", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Centerline debug", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Racing line", exact: true })
    .uncheck();
  await expect(
    page.getByRole("checkbox", { name: "Racing line", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Top View", exact: true }).click();
  await page.getByRole("button", { name: "Chase", exact: true }).click();
  await page.getByRole("button", { name: "3D View", exact: true }).click();
  await page.getByRole("tab", { name: "Sector Analysis", exact: true }).click();
  await expect(page.getByText("Inspect sector →")).toHaveCount(3);
  await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
  await page.getByRole("button", { name: "Time", exact: true }).click();
  await expect(
    page.getByText("Time (s) · click or drag to inspect"),
  ).toBeVisible();
  const temperature = page.getByRole("spinbutton", { name: "Temperature" });
  await temperature.focus();
  await temperature.press("ControlOrMeta+A");
  await temperature.pressSequentially("32");
  await temperature.press("Tab");
  await expect(temperature).toHaveValue("32");
  await temperature.fill("60");
  await temperature.press("Tab");
  await expect(temperature).toHaveValue("45");
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export telemetry CSV (SI)", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe(
    "laptrix-telemetry-si.csv",
  );
  for (const width of [1280, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
});

test("API failure is recoverable without destroying the last completed lap", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const time = await page.getByTestId("lap-time").textContent();
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Temporary simulation failure" }),
    }),
  );
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Temporary simulation failure",
  );
  await expect(page.getByTestId("lap-time")).toHaveText(time!);
  await page.unroute("**/api/simulate");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
});
