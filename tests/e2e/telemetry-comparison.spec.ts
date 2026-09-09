import { test, expect, type Page } from "@playwright/test";
import type { Lap, Sample } from "../../packages/shared/schema";
import { formatTime } from "../../packages/telemetry";

// Independent linear scan oracle; comparison implementation uses binary search.
function at(axis: number[], values: number[], position: number) {
  if (position <= axis[0]) return values[0];
  const upper = axis.findIndex((value) => value > position);
  if (upper < 0) return values.at(-1)!;
  const fraction =
    (position - axis[upper - 1]) / (axis[upper] - axis[upper - 1]);
  return values[upper - 1] * (1 - fraction) + values[upper] * fraction;
}
function referenceValue(
  current: Lap,
  reference: Lap,
  time: number,
  key: keyof Sample,
) {
  const progress = at(
    current.samples.map((sample) => sample.time),
    current.alignment!.progress,
    time,
  );
  if (key === "gear") {
    const upper = reference.alignment!.progress.findIndex(
      (value) => value > progress,
    );
    return reference.samples[
      upper < 0 ? reference.samples.length - 1 : Math.max(0, upper - 1)
    ].gear;
  }
  return at(
    reference.alignment!.progress,
    reference.samples.map((sample) => sample[key]),
    progress,
  );
}
async function readouts(
  page: Page,
  current: Lap,
  reference: Lap,
  time: number,
) {
  for (const [key, scale, digits] of [
    ["speed", 3.6, 0],
    ["throttle", 100, 0],
    ["brake", 100, 0],
    ["rpm", 1, 0],
    ["gear", 1, 0],
    ["lateralG", 1, 1],
    ["y", 1, 0],
  ] as const) {
    await expect(page.getByTestId(`reference-value-${key}`)).toHaveText(
      `R ${(referenceValue(current, reference, time, key) * scale).toFixed(digits)}`,
    );
  }
}

for (const width of [1600, 390]) {
  test(`native reference traces share physical positions, units and the current cursor at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const first = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON().setup.solver === "optimized",
    );
    await page.goto("/");
    const reference: Lap = await (await first).json();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    const solved = page.waitForResponse((response) =>
      response.url().endsWith("/api/simulate"),
    );
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    const current: Lap = await (await solved).json();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    expect(current.samples.length).not.toBe(reference.samples.length);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const toggle = page.getByRole("checkbox", {
      name: "Reference traces",
      exact: true,
    });
    await expect(toggle).not.toBeChecked();
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();
    await expect(page.locator('[data-testid^="reference-trace-"]')).toHaveCount(
      7,
    );
    await expect(page.getByTestId("current-trace-gear")).toHaveAttribute(
      "d",
      /H.*V/,
    );
    await expect(page.getByTestId("reference-trace-gear")).toHaveAttribute(
      "d",
      /H.*V/,
    );
    const peak = reference.samples.reduce(
      (best, sample, i) =>
        sample.speed > reference.samples[best].speed ? i : best,
      0,
    );
    const peakProgress = reference.alignment!.progress[peak];
    const maximum =
      Math.ceil(
        (Math.max(
          ...current.samples.map((sample) => sample.speed),
          ...reference.samples.map((sample) => sample.speed),
        ) *
          3.6) /
          10,
      ) * 10;
    const y = 27 - ((reference.samples[peak].speed * 3.6) / maximum) * 24;
    for (const axis of ["distance", "time"] as const) {
      await page
        .getByRole("button", {
          name: axis === "time" ? "Time" : "Distance",
          exact: true,
        })
        .click();
      const path = await page
        .getByTestId("reference-trace-speed")
        .getAttribute("d");
      const points = [...path!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(
        (match) => [Number(match[1]), Number(match[2])],
      );
      expect(points).toHaveLength(
        new Set([
          ...current.alignment!.progress,
          ...reference.alignment!.progress,
        ]).size,
      );
      const x =
        (at(
          current.alignment!.progress,
          current.samples.map((sample) => sample[axis]),
          peakProgress,
        ) /
          (axis === "time" ? current.lapTime : current.length)) *
        1000;
      expect(
        points.some(
          (point) =>
            Math.abs(point[0] - x) < 0.011 && Math.abs(point[1] - y) < 0.011,
        ),
      ).toBe(true);
    }
    await expect(page.locator(".axis-label")).toContainText("Current lap");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    const entry = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    await entry.fill("9.125");
    await entry.press("Enter");
    await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
    await expect(toggle).toBeChecked();
    await readouts(page, current, reference, 9.125);
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    const path = await page
      .getByTestId("reference-trace-speed")
      .getAttribute("d");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.inputValue()))
      .toBeGreaterThan(9.3);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await readouts(page, current, reference, Number(await cursor.inputValue()));
    await expect(page.getByTestId("reference-trace-speed")).toHaveAttribute(
      "d",
      path!,
    );
    const position = await cursor.inputValue();
    const upload = async (value: unknown) =>
      page.getByLabel("Import reference file", { exact: true }).setInputFiles({
        name: "reference.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(value)),
      });
    await upload({
      format: "laptrix-timing-reference-v1",
      label: "Timing fixture",
      vehicleLabel: "Formula timing",
      origin: "external-simulation",
      source: "Original browser-test conversion; no channel claims",
      trackId: reference.trackId,
      lapTime: reference.lapTime,
      units: { time: "s", progress: "fraction" },
      alignment: reference.alignment,
      samples: reference.samples.map(({ time }) => ({ time })),
    });
    await expect(toggle).toBeDisabled();
    await expect(toggle).not.toBeChecked();
    await expect(
      page.getByText("Timing-only reference · no channels", { exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-testid^="reference-trace-"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-testid^="reference-value-"]')).toHaveCount(
      0,
    );
    await upload(reference);
    await expect(toggle).toBeChecked();
    await readouts(page, current, reference, Number(position));
    await toggle.uncheck();
    await expect(page.locator('[data-testid^="reference-trace-"]')).toHaveCount(
      0,
    );
    await expect(cursor).toHaveValue(position);
    await expect(page.getByTestId("lap-time")).toHaveText(
      formatTime(current.lapTime),
    );
    expect(requests).toBe(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
}
