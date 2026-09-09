import { test, expect, type Locator } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

async function viewportMatches(
  chart: Locator,
  start: number,
  end: number,
  extent: number,
) {
  const bounds = (await chart.getAttribute("viewBox"))!.split(" ").map(Number);
  expect(bounds[0]).toBeCloseTo((start / extent) * 1000, 9);
  expect(bounds[2]).toBeCloseTo(((end - start) / extent) * 1000, 9);
}

// Independent linear search for current distance-to-time correspondence.
function timeAt(lap: Lap, distance: number) {
  const upper = lap.samples.findIndex((sample) => sample.distance > distance);
  if (upper < 0) return lap.lapTime;
  const a = lap.samples[Math.max(0, upper - 1)],
    b = lap.samples[upper];
  const fraction = (distance - a.distance) / (b.distance - a.distance);
  return a.time * (1 - fraction) + b.time * fraction;
}

for (const width of [1600, 390]) {
  test(`sector inspection clips existing curves and retains the shared workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
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
    const lap: Lap = await (await solved).json();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    const initialLapTime = await page.getByTestId("lap-time").textContent();
    const fuel = page.getByRole("slider", { name: "Fuel load", exact: true });
    await fuel.fill("100");
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    const toggle = page.getByRole("checkbox", {
      name: "Reference traces",
      exact: true,
    });
    await toggle.check();
    const paths = await page
      .locator(
        '[data-testid^="current-trace-"], [data-testid^="reference-trace-"]',
      )
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    await expect(range).toHaveValue("all");
    await range.focus();
    await range.press("Home");
    await range.press("ArrowDown");
    await range.press("ArrowDown");
    await range.press("Enter");
    await expect(range).toHaveValue("2");
    await expect(cursor).toHaveValue("0");
    await expect(
      page.getByText("Cursor outside selected sector", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("channel-cursor")).toHaveCount(0);
    const chart = page.getByRole("img", { name: /Synchronized speed/ });
    const sector = lap.sectors[1];
    await viewportMatches(
      chart,
      sector.startDistance,
      sector.endDistance,
      lap.length,
    );
    expect(
      await page
        .locator(
          '[data-testid^="current-trace-"], [data-testid^="reference-trace-"]',
        )
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(paths);
    await expect(page.locator(".channel-x-ticks span").first()).toHaveText(
      sector.startDistance.toFixed(0),
    );
    await expect(page.locator(".channel-x-ticks span").last()).toHaveText(
      sector.endDistance.toFixed(0),
    );

    await page.getByRole("button", { name: "Time", exact: true }).click();
    await viewportMatches(
      chart,
      sector.split - sector.time,
      sector.split,
      lap.lapTime,
    );
    await expect(cursor).toHaveValue("0");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    // Native range inputs round their value to 0.01 s; the plotted clock keeps full precision.
    expect(
      (Number(
        await page
          .getByTestId("channel-cursor")
          .locator("line")
          .getAttribute("x1"),
      ) /
        1000) *
        lap.lapTime,
    ).toBeCloseTo(sector.split - sector.time, 8);
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("channel-cursor")).toBeVisible();
    for (const axis of ["Time", "Distance"] as const) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      const box = (await chart.boundingBox())!;
      await chart.click({ position: { x: box.width / 2, y: box.height / 2 } });
      const expected =
        axis === "Time"
          ? sector.split - sector.time / 2
          : timeAt(lap, (sector.startDistance + sector.endDistance) / 2);
      expect(Number(await cursor.inputValue())).toBeCloseTo(expected, 1);
      const projected = await page
        .getByTestId("channel-cursor")
        .locator("line")
        .boundingBox();
      const zeroText = await page
        .getByTestId("channel-scale-lateralG")
        .locator("span")
        .filter({ hasText: /^0$/ })
        .boundingBox();
      const zeroLine = await page
        .getByTestId("channel-zero-lateralG")
        .boundingBox();
      expect(
        Math.abs(
          zeroText!.y +
            zeroText!.height / 2 -
            zeroLine!.y -
            zeroLine!.height / 2,
        ),
      ).toBeLessThan(0.6);
      expect(projected!.x + projected!.width / 2 - box.x).toBeCloseTo(
        box.width / 2,
        0,
      );
    }
    const position = await cursor.inputValue();
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await expect(range).toHaveValue("2");
    const deltaChart = page.getByRole("img", {
      name: "Time difference to reference along the lap",
    });
    await viewportMatches(
      deltaChart,
      sector.startDistance,
      sector.endDistance,
      lap.length,
    );
    const deltaPaths = await deltaChart
      .locator("path")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    await page.getByRole("button", { name: "Full lap", exact: true }).click();
    await viewportMatches(deltaChart, 0, lap.length, lap.length);
    await expect(cursor).toHaveValue(position);
    expect(
      await deltaChart
        .locator("path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(deltaPaths);
    await range.selectOption("2");
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "sector-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "laptrix-timing-reference-v1",
            label: "Sector timing fixture",
            vehicleLabel: "Test vehicle",
            origin: "external-simulation",
            source: "Original test timing derived from current simulation",
            trackId: lap.trackId,
            lapTime: lap.lapTime * 1.1,
            units: { time: "s", progress: "fraction" },
            alignment: lap.alignment,
            samples: lap.samples.map(({ time }) => ({ time: time * 1.1 })),
          }),
        ),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Sector timing fixture",
    );
    await expect(range).toHaveValue("2");
    await expect(cursor).toHaveValue(position);
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const deltaBox = (await deltaChart.boundingBox())!;
    await deltaChart.click({
      position: { x: deltaBox.width / 2, y: deltaBox.height / 2 },
    });
    const time = Number(await cursor.inputValue());
    expect(time).toBeCloseTo(sector.split - sector.time / 2, 1);
    expect(
      parseFloat((await page.getByTestId("cursor-delta").textContent())!),
    ).toBeCloseTo(-0.1 * time, 2);
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    const entry = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    await entry.fill("0");
    await entry.press("Enter");
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await expect(range).toHaveValue("2");
    await expect(page.getByTestId("delta-cursor")).toHaveCount(0);
    await expect(
      page.getByText("Cursor outside selected sector", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("tab", { name: "Sector Analysis", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Inspect sector →", exact: true })
      .nth(2)
      .click();
    await expect(
      page.getByRole("tab", { name: "Lap Graphs", exact: true }),
    ).toBeFocused();
    await expect(range).toHaveValue("3");
    expect(
      (Number(
        await page
          .getByTestId("channel-cursor")
          .locator("line")
          .getAttribute("x1"),
      ) /
        1000) *
        lap.lapTime,
    ).toBeCloseTo(lap.sectors[2].split - lap.sectors[2].time, 8);
    await expect(toggle).toBeDisabled();
    await expect(page.getByTestId("lap-time")).toHaveText(initialLapTime!);
    await expect(fuel).toHaveValue("100");
    expect(requests).toBe(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);

    await page.route("**/api/simulate", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Range retention fixture" }),
      }),
    );
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Retry", exact: true }),
    ).toBeVisible();
    await expect(range).toHaveValue("3");
    await page.unroute("**/api/simulate");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByTestId("lap-time")).not.toHaveText(initialLapTime!);
    await expect(range).toHaveValue("all");
    await expect(cursor).toHaveValue("0");
  });
}
