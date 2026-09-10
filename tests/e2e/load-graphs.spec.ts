import { expect, test, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

async function exported(page: Page, action = "Export project") {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: action, exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
function linear(xs: number[], ys: number[], value: number) {
  if (value <= xs[0]) return ys[0];
  const upper = xs.findIndex((x) => x > value);
  if (upper < 0) return ys.at(-1)!;
  const f = (value - xs[upper - 1]) / (xs[upper] - xs[upper - 1]);
  return ys[upper - 1] * (1 - f) + ys[upper] * f;
}
function legacyShape(lap: Lap) {
  const legacy = structuredClone(lap);
  delete legacy.verticalDynamics;
  delete legacy.solverProvenance;
  delete legacy.numericalChecks!.minNormalLoadG;
  for (const sample of legacy.samples) {
    sample.verticalG = 0;
    delete sample.normalLoadG;
  }
  return legacy;
}

for (const width of [1600, 390]) {
  test(`load graphs compare real unequal grids without inventing legacy reference channels at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toContainText(
      "GT Development 01",
    );
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("formula-development");
    await expect(page.getByTestId("result-vehicle")).toContainText(
      "Formula Development 01",
    );
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await exported(page);
    const lap: Lap = before.lap,
      reference: Lap = before.reference;
    expect(lap.samples.length).not.toBe(reference.samples.length);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const group = page.getByRole("combobox", { name: "Graph channels" });
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    await group.selectOption("loads");
    await page.getByRole("checkbox", { name: "Reference traces" }).check();
    const sourceProgress = linear(
      lap.samples.map((sample) => sample.time),
      lap.alignment!.progress,
      20,
    );
    const referenceTime = linear(
      reference.alignment!.progress,
      reference.samples.map((sample) => sample.time),
      sourceProgress,
    );
    const channels = [
      ["speed", 3.6, 0],
      ["longitudinalG", 1, 3],
      ["lateralG", 1, 3],
      ["verticalG", 1, 3],
      ["normalLoadG", 1, 3],
      ["trackGradient", 100, 2],
      ["y", 1, 0],
    ] as const;
    for (const axis of ["Distance", "Time"]) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      for (const [key, scale, digits] of channels) {
        const currentValue =
          linear(
            lap.samples.map((sample) => sample.time),
            lap.samples.map((sample) => sample[key]!),
            20,
          ) * scale;
        const referenceValue =
          linear(
            reference.samples.map((sample) => sample.time),
            reference.samples.map((sample) => sample[key]!),
            referenceTime,
          ) * scale;
        await expect(page.getByTestId(`current-value-${key}`)).toHaveText(
          currentValue.toFixed(digits),
        );
        await expect(page.getByTestId(`reference-value-${key}`)).toHaveText(
          `R ${referenceValue.toFixed(digits)}`,
        );
        await expect(page.getByTestId(`current-trace-${key}`)).toHaveAttribute(
          "d",
          /^M/,
        );
        await expect(
          page.getByTestId(`reference-trace-${key}`),
        ).toHaveAttribute("d", /^M/);
      }
    }
    const maximum = Math.max(
      1.25,
      Math.ceil(
        Math.max(
          ...lap.samples.map((sample) => sample.normalLoadG!),
          ...reference.samples.map((sample) => sample.normalLoadG!),
        ) * 4,
      ) / 4,
    );
    expect(
      await page
        .getByTestId("channel-scale-normalLoadG")
        .getAttribute("aria-label"),
    ).toContain(`0 to ${maximum} × weight`);
    expect(
      Number(
        await page.getByTestId("channel-guide-normalLoadG").getAttribute("y1"),
      ),
    ).toBeCloseTo(4 * 33 + 27 - 24 / maximum, 10);
    const path = await page
      .getByTestId("current-trace-verticalG")
      .getAttribute("d");
    await page.getByRole("combobox", { name: "Plot range" }).selectOption("2");
    expect(
      await page.getByTestId("current-trace-verticalG").getAttribute("d"),
    ).toBe(path);
    expect(await cursor.inputValue()).toBe("20");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
    await expect(group).toHaveValue("loads");
    await expect(
      page.getByRole("checkbox", { name: "Reference traces" }),
    ).toBeChecked();
    await group.selectOption("overview");
    await expect(page.getByTestId("current-trace-throttle")).toHaveCount(1);
    await group.selectOption("loads");
    expect(await cursor.inputValue()).toBe("20");
    await page
      .getByRole("combobox", { name: "Plot range" })
      .selectOption("all");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.inputValue()))
      .toBeGreaterThan(20.2);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    // SVG position retains the exact clock; the native slider rounds to 0.01 s.
    const exactTime =
      (Number(
        await page
          .getByTestId("channel-cursor")
          .locator("line")
          .getAttribute("x1"),
      ) /
        1000) *
      lap.lapTime;
    const progress = linear(
      lap.samples.map((s) => s.time),
      lap.alignment!.progress,
      exactTime,
    );
    const refTime = linear(
      reference.alignment!.progress,
      reference.samples.map((s) => s.time),
      progress,
    );
    for (const key of ["verticalG", "normalLoadG"] as const) {
      await expect(page.getByTestId(`current-value-${key}`)).toHaveText(
        linear(
          lap.samples.map((s) => s.time),
          lap.samples.map((s) => s[key]!),
          exactTime,
        ).toFixed(3),
      );
      await expect(page.getByTestId(`reference-value-${key}`)).toHaveText(
        `R ${linear(
          reference.samples.map((s) => s.time),
          reference.samples.map((s) => s[key]!),
          refTime,
        ).toFixed(3)}`,
      );
    }
    await expect(page.getByTestId("current-trace-verticalG")).toHaveAttribute(
      "d",
      path!,
    );
    await cursor.fill("20");
    expect(await exported(page)).toEqual(before);
    await page
      .getByRole("combobox", { name: "Plot range" })
      .selectOption("all");
    await page
      .locator(".telemetry-panel")
      .screenshot({ path: `artifacts/load-graphs-native-${width}.png` });
    const legacy = legacyShape(reference);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "legacy-load-reference.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(legacy)),
      });
    await expect(page.getByRole("alert")).toHaveCount(0);
    for (const key of ["verticalG", "normalLoadG"]) {
      await expect(page.getByTestId(`reference-trace-${key}`)).toHaveCount(0);
      await expect(page.getByTestId(`reference-value-${key}`)).toHaveText(
        "R —",
      );
      await expect(page.getByTestId(`current-trace-${key}`)).toHaveAttribute(
        "d",
        /^M/,
      );
    }
    await expect(page.getByTestId("reference-trace-speed")).toHaveAttribute(
      "d",
      /^M/,
    );
    await expect(page.locator(".telemetry-comparison-controls")).toContainText(
      "Reference unavailable: Vertical G, Normal tyre load",
    );
    const currentMaximum = Math.max(
      1.25,
      Math.ceil(
        Math.max(...lap.samples.map((sample) => sample.normalLoadG!)) * 4,
      ) / 4,
    );
    expect(
      await page
        .getByTestId("channel-scale-normalLoadG")
        .getAttribute("aria-label"),
    ).toContain(`0 to ${currentMaximum} × weight`);
    const mixed = await exported(page);
    expect(mixed.lap).toEqual(before.lap);
    expect(mixed.reference.samples).toEqual(legacy.samples);
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).toBeHidden();
    await page
      .locator(".telemetry-panel")
      .screenshot({ path: `artifacts/load-graphs-legacy-${width}.png` });
    const timing = await exported(page, "Export timing reference");
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "timing-only.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(timing)),
      });
    await expect(
      page.getByRole("checkbox", { name: "Reference traces" }),
    ).toBeDisabled();
    await expect(page.locator(".telemetry-comparison-controls")).toContainText(
      "Timing-only reference",
    );
    await expect(page.getByTestId("reference-trace-speed")).toHaveCount(0);
    await expect(group).toHaveValue("loads");
    expect((await exported(page)).lap).toEqual(before.lap);
    expect(await cursor.inputValue()).toBe("20");
    expect(requests).toBe(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

test("a legacy-current result cannot relabel reserved zeros as load graphs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const group = page.getByRole("combobox", { name: "Graph channels" });
  await group.selectOption("loads");
  await page.route("**/api/simulate", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: legacyShape(await response.json()) });
  });
  await page.getByRole("slider", { name: "Fuel load" }).fill("22");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(group).toHaveValue("overview");
  // Check the browser's native option semantics, including actual keyboard selection.
  expect(
    await group
      .locator("option[value='loads']")
      .evaluate((option) => option.matches(":disabled")),
  ).toBe(true);
  await group.focus();
  await group.press("ArrowDown");
  await expect(group).toHaveValue("overview");
  await expect(page.locator(".load-graph-note")).toHaveText(
    "Vertical/load telemetry is unavailable for this lap.",
  );
  await expect(page.getByTestId("current-trace-normalLoadG")).toHaveCount(0);
  await expect(page.getByTestId("current-trace-throttle")).toHaveAttribute(
    "d",
    /^M/,
  );
});
