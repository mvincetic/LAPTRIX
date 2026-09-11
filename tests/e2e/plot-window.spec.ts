import { expect, test, type Page, type Locator } from "@playwright/test";
import { referenceGeometry } from "./reference-geometry";
import type { Lap } from "../../packages/shared/schema";

async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
// Independent piecewise-linear oracle, using a linear search rather than app helpers.
function distanceAt(lap: Lap, time: number) {
  const upper = lap.samples.findIndex((sample) => sample.time > time);
  if (upper < 0) return lap.length;
  const a = lap.samples[Math.max(0, upper - 1)],
    b = lap.samples[upper];
  return (
    a.distance +
    ((b.distance - a.distance) * (time - a.time)) / (b.time - a.time)
  );
}
async function viewport(
  chart: Locator,
  start: number,
  end: number,
  extent: number,
) {
  const box = (await chart.getAttribute("viewBox"))!.split(" ").map(Number);
  expect(box[0]).toBeCloseTo((start / extent) * 1000, 9);
  expect(box[2]).toBeCloseTo(((end - start) / extent) * 1000, 9);
}

for (const width of [1600, 390]) {
  test(`exact custom windows preserve curves, playback and project state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const result = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON()?.setup.solver === "optimized",
    );
    await page.goto("/");
    const lap: Lap = await (await result).json();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("5");
    await page
      .getByRole("checkbox", { name: "Reference traces", exact: true })
      .check();
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const chart = page.getByRole("img", { name: /Synchronized speed/ });
    const traces = () =>
      page
        .locator('[data-testid^="current-trace-"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    const paths = await traces();
    const references = await page
      .locator('[data-testid^="reference-trace-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")!));
    const scales = await page.locator(".channel-scales").textContent();
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    const custom = page.getByRole("button", {
      name: "Custom window",
      exact: true,
    });
    const start = page.getByRole("spinbutton", { name: "Window start (s)" });
    const end = page.getByRole("spinbutton", { name: "Window end (s)" });
    const form = page.getByRole("form", { name: "Custom telemetry window" });
    async function edit(from: string, to: string) {
      await custom.click();
      await start.fill(from);
      await end.fill(to);
      await end.press("Enter");
    }
    await custom.focus();
    await custom.press("Enter");
    await start.fill("18.125");
    await end.fill("20.375");
    await end.press("Enter");
    await expect(form).toHaveCount(0);
    await expect(custom).toBeFocused();
    await expect(range).toHaveValue("custom");
    await expect(cursor).toHaveValue("5");
    await expect(page.getByTestId("channel-cursor")).toHaveCount(0);
    await expect(
      page.getByText("Cursor outside selected window", { exact: true }),
    ).toBeVisible();
    await viewport(
      chart,
      distanceAt(lap, 18.125),
      distanceAt(lap, 20.375),
      lap.length,
    );
    expect(await traces()).toEqual(paths);
    await referenceGeometry(chart, references);
    expect(await page.locator(".channel-scales").textContent()).toBe(scales);
    const applied = await chart.getAttribute("viewBox");
    await edit("20", "19");
    await expect(form.getByRole("alert")).toContainText("increasing times");
    expect(await chart.getAttribute("viewBox")).toBe(applied);
    await start.fill("18.125");
    await end.fill("18.1255");
    await end.press("Enter");
    await expect(form.getByRole("alert")).toContainText("0.001 s");
    await end.press("Escape");
    await expect(form).toHaveCount(0);
    expect(await chart.getAttribute("viewBox")).toBe(applied);
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await viewport(chart, 18.125, 20.375, lap.lapTime);
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    const projectedTime =
      (Number(
        await page
          .getByTestId("channel-cursor")
          .locator("line")
          .getAttribute("x1"),
      ) /
        1000) *
      lap.lapTime;
    expect(projectedTime).toBeCloseTo(18.125, 10);
    const loop = page.getByRole("button", { name: "Loop window", exact: true });
    await loop.focus();
    await loop.press("Space");
    await expect(loop).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("status")).toContainText(
      "Custom interval · 0:18.125–0:20.375",
    );
    await cursor.fill("20.3");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.inputValue()))
      .toBeLessThan(19);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    const delta = page.getByRole("img", {
      name: "Time difference to reference along the lap",
    });
    await viewport(delta, 18.125, 20.375, lap.lapTime);
    await expect(
      page.getByRole("button", { name: "Loop window", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const deltaPaths = await delta
      .locator("path")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    await page.getByRole("button", { name: "Full lap", exact: true }).click();
    await viewport(delta, 0, lap.lapTime, lap.lapTime);
    expect(
      await delta
        .locator("path")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    ).toEqual(deltaPaths);
    await expect(page.getByRole("status")).toContainText("Custom interval");
    await edit("30", "30.001");
    await expect(page.getByRole("status")).toContainText("0:18.125–0:20.375");
    await viewport(delta, 30, 30.001, lap.lapTime);
    const ticks = await page.locator(".delta-x-ticks span").allTextContents();
    expect(new Set(ticks).size).toBe(6);
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("button", { name: "Distance", exact: true }).click();
    await viewport(
      delta,
      distanceAt(lap, 30),
      distanceAt(lap, 30.001),
      lap.length,
    );
    expect(await project(page)).toEqual(before);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "window-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "laptrix-timing-reference-v1",
            label: "Original custom-window timing",
            vehicleLabel: "Test vehicle",
            origin: "external-simulation",
            source: "Original test timing derived from the current simulation",
            trackId: lap.trackId,
            lapTime: lap.lapTime * 1.1,
            units: { time: "s", progress: "fraction" },
            alignment: lap.alignment,
            samples: lap.samples.map((sample) => ({ time: sample.time * 1.1 })),
          }),
        ),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Original custom-window timing",
    );
    await expect(range).toHaveValue("custom");
    await expect(cursor).toHaveValue("30");
    await expect(page.getByTestId("cursor-delta")).toHaveText("-3.000 s");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
    await expect(range).toHaveValue("custom");
    const boundary = Array.from(
      { length: 10000 },
      (_, i) => 10 + (i + 1) / 1000,
    ).find((time) => (time / lap.lapTime) * lap.lapTime < time)!;
    expect(Number.isFinite(boundary)).toBe(true);
    await edit(String(boundary), String(boundary + 1));
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    await expect(page.getByTestId("delta-cursor")).toBeVisible();
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(range).toHaveValue("all");
    await expect(cursor).toHaveValue("0");
    await expect(custom).toHaveAttribute("aria-expanded", "false");
  });
}
