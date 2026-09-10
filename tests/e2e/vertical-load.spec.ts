import { expect, test, type Page } from "@playwright/test";
import { lapSchema, type Lap } from "../../packages/shared/schema";

async function exportFile(page: Page, action: string) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: action, exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

function legacyShape(lap: Lap) {
  const legacy = structuredClone(lap);
  delete legacy.verticalDynamics;
  delete legacy.solverProvenance;
  delete legacy.numericalChecks!.minNormalLoadG;
  for (const sample of legacy.samples) {
    delete sample.normalLoadG;
    sample.verticalG = 0;
  }
  return legacy;
}

for (const width of [1600, 390]) {
  test(`normal-load telemetry remains authoritative through inspection and mixed-generation project restoration at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const before = await exportFile(page, "Export project");
    const lap = lapSchema.parse(before.lap);
    expect(lap.verticalDynamics).toBe("quasi-steady-road-normal-v1");
    expect(lap.numericalChecks!.minNormalLoadG).toBeGreaterThan(0);
    expect(lap.numericalChecks!.minNormalLoadG).toBe(
      Math.min(...lap.samples.map((sample) => sample.normalLoadG!)),
    );
    expect(
      Math.min(...lap.samples.map((sample) => sample.verticalG)),
    ).toBeLessThan(0);
    expect(
      Math.max(...lap.samples.map((sample) => sample.verticalG)),
    ).toBeGreaterThan(0);
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    const upper = lap.samples.findIndex((sample) => sample.time > 20);
    const a = lap.samples[upper - 1],
      b = lap.samples[upper];
    const fraction = (20 - a.time) / (b.time - a.time);
    for (const [key, unit] of [
      ["verticalG", "G"],
      ["normalLoadG", "× weight"],
    ] as const) {
      const expected = a[key]! * (1 - fraction) + b[key]! * fraction;
      await expect(page.getByTestId(`cursor-${key}`)).toHaveText(
        `${Number(expected.toFixed(3)).toFixed(3)}${unit}`,
      );
    }
    await expect(page.locator(".cursor-note")).toContainText(
      "excluding gravity",
    );
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    await page.getByTestId("cursor-normalLoadG").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/vertical-load-cursor-${width}.png`,
      fullPage: true,
    });
    const invalid = structuredClone(lap);
    delete invalid.samples[4].normalLoadG;
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "incomplete-load.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(invalid)),
      });
    await expect(page.getByRole("alert")).toContainText(
      "Current reference kept",
    );
    expect(await exportFile(page, "Export project")).toEqual(before);
    const legacy = legacyShape(lap);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "legacy-native-fixture.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(legacy)),
      });
    await expect(page.getByRole("alert")).toHaveCount(0);
    const mixed = await exportFile(page, "Export project");
    expect(mixed.lap).toEqual(before.lap);
    expect(mixed.reference).not.toHaveProperty("verticalDynamics");
    expect(
      mixed.reference.samples.every(
        (sample: Lap["samples"][number]) =>
          sample.normalLoadG === undefined && sample.verticalG === 0,
      ),
    ).toBe(true);
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("20");
    expect(calculations).toBe(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const saved = await exportFile(page, "Export project");
    expect(saved.lap.samples).toEqual(mixed.lap.samples);
    expect(saved.lap.verticalDynamics).toBe(lap.verticalDynamics);
    expect(saved.reference).toEqual(mixed.reference);
    expect(errors).toEqual([]);
    await page.close();
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:5173",
      viewport: { width, height: 1000 },
    });
    try {
      const fresh = await context.newPage();
      fresh.on("pageerror", (error) => errors.push(error.message));
      await fresh.goto("/");
      await expect(fresh.getByTestId("lap-time")).toBeVisible();
      const calculated = fresh.waitForResponse(
        (response) =>
          response.url().endsWith("/api/simulate") &&
          response.request().method() === "POST",
      );
      await fresh
        .getByLabel("Import project file", { exact: true })
        .setInputFiles({
          name: "load-project.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(mixed)),
        });
      await calculated;
      await expect(
        fresh.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(fresh.getByRole("alert")).toHaveCount(0);
      const restored = await exportFile(fresh, "Export project");
      expect(restored.lap.samples).toEqual(mixed.lap.samples);
      expect(restored.lap.verticalDynamics).toBe(lap.verticalDynamics);
      expect(restored.lap.numericalChecks.minNormalLoadG).toBe(
        lap.numericalChecks!.minNormalLoadG,
      );
      expect(restored.reference).toEqual(mixed.reference);
      await fresh
        .getByRole("tab", { name: "Cursor Data", exact: true })
        .click();
      await expect(fresh.getByTestId("cursor-normalLoadG")).toBeVisible();
      expect(await fresh.evaluate(() => document.body.scrollWidth)).toBe(width);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("legacy-shaped API telemetry keeps vertical dynamics explicitly unavailable", async ({
  page,
}) => {
  await page.route("**/api/simulate", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: legacyShape(await response.json()) });
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
  await expect(page.getByText("Not modelled", { exact: true })).toBeVisible();
  await expect(page.getByTestId("cursor-verticalG")).toHaveCount(0);
  await expect(page.getByTestId("cursor-normalLoadG")).toHaveCount(0);
  const lap = await exportFile(page, "Export telemetry JSON");
  expect(lap).not.toHaveProperty("verticalDynamics");
  expect(lap.samples[0]).not.toHaveProperty("normalLoadG");
  expect(
    lap.samples.every(
      (sample: Lap["samples"][number]) => sample.verticalG === 0,
    ),
  ).toBe(true);
});
