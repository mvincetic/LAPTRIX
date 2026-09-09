/* global document */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

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
    const first = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON().setup.solver === "optimized",
    );
    await page.goto("http://127.0.0.1:5173/");
    const reference = await (await first).json();
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
    const current = await (await solved).json();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    await page.locator(".advanced summary").click();
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    const toggle = page.getByRole("checkbox", {
      name: "Reference traces",
      exact: true,
    });
    await toggle.check();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    const entry = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    await entry.fill("20");
    await entry.press("Enter");
    await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
    const panel = page.getByRole("region", {
      name: "Telemetry graphs",
      exact: true,
    });
    await page.screenshot({
      path: `artifacts/telemetry-comparison-workspace-${width}.png`,
      fullPage: true,
    });
    for (const axis of ["Time", "Distance"]) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      await panel.screenshot({
        path: `artifacts/telemetry-comparison-${axis.toLowerCase()}-${width}.png`,
      });
    }
    const referenceValues = await page
      .locator('[data-testid^="reference-value-"]')
      .allTextContents();
    const traceCount = await page
      .locator('[data-testid^="reference-trace-"]')
      .count();
    const cursor = await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue();
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "laptrix-timing-reference-v1",
            label: "Timing-only QA reference",
            vehicleLabel: "Formula timing",
            origin: "external-simulation",
            source: "Original QA conversion; no channel claims",
            trackId: reference.trackId,
            lapTime: reference.lapTime,
            units: { time: "s", progress: "fraction" },
            alignment: reference.alignment,
            samples: reference.samples.map(({ time }) => ({ time })),
          }),
        ),
      });
    await expect(toggle).toBeDisabled();
    if (await dismiss.isVisible()) await dismiss.click();
    await panel.screenshot({
      path: `artifacts/telemetry-comparison-timing-${width}.png`,
    });
    findings.push({
      width,
      height,
      currentSamples: current.samples.length,
      referenceSamples: reference.samples.length,
      traceCount,
      referenceValues,
      cursor,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/telemetry-comparison-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
