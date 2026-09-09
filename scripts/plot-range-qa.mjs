/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
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
    const lap = await (await solved).json();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    await page.locator(".advanced summary").click();
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    await page
      .getByRole("checkbox", { name: "Reference traces", exact: true })
      .check();
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    await range.selectOption("2");
    const panel = page.getByRole("region", {
      name: "Telemetry graphs",
      exact: true,
    });
    await panel.screenshot({
      path: `artifacts/plot-range-outside-${width}.png`,
    });
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    const chart = page.getByRole("img", { name: /Synchronized speed/ });
    const box = await chart.boundingBox();
    await chart.click({ position: { x: box.width * 0.4, y: box.height / 2 } });
    await page.screenshot({
      path: `artifacts/plot-range-workspace-${width}.png`,
      fullPage: true,
    });
    const axes = [];
    for (const axis of ["Distance", "Time"]) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      await panel.screenshot({
        path: `artifacts/plot-range-${axis.toLowerCase()}-${width}.png`,
      });
      axes.push({
        axis,
        bounds: await chart.getAttribute("viewBox"),
        ticks: await page.locator(".channel-x-ticks span").allTextContents(),
      });
    }
    const position = await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue();
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "sector-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "laptrix-timing-reference-v1",
            label: "Sector timing QA",
            vehicleLabel: "GT timing",
            origin: "external-simulation",
            source: "Original QA timing derived from current simulation",
            trackId: lap.trackId,
            lapTime: lap.lapTime * 1.1,
            units: { time: "s", progress: "fraction" },
            alignment: lap.alignment,
            samples: lap.samples.map(({ time }) => ({ time: time * 1.1 })),
          }),
        ),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Sector timing QA",
    );
    if (await dismiss.isVisible()) await dismiss.click();
    await panel.screenshot({ path: `artifacts/plot-range-delta-${width}.png` });
    await expect(range).toHaveValue("2");
    await page.getByRole("button", { name: "Full lap", exact: true }).click();
    await expect(range).toHaveValue("all");
    await expect(
      page.getByRole("slider", { name: "Lap playback position" }),
    ).toHaveValue(position);
    findings.push({
      width,
      height,
      axes,
      position,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/plot-range-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
