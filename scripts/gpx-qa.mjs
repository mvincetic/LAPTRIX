/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { gpxFixture } from "../tests/fixtures/gpx.ts";

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
    [780, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Import track GPX", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Import GPX circuit",
      exact: true,
    });
    await dialog.screenshot({ path: `artifacts/gpx-empty-${width}.png` });
    if (width === 1600) {
      await page
        .getByLabel("GPX source file", { exact: true })
        .setInputFiles({
          name: "missing-elevation.gpx",
          mimeType: "application/gpx+xml",
          buffer: Buffer.from(gpxFixture().replace(/<ele>[^<]*<\/ele>/, "")),
        });
      await expect(dialog.getByRole("alert")).toContainText(
        "needs one elevation",
      );
      await dialog.screenshot({ path: "artifacts/gpx-error-1600.png" });
    }
    await page
      .getByLabel("GPX source file", { exact: true })
      .setInputFiles({
        name: "original-analytic-development.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(gpxFixture({ close: width !== 1280 })),
      });
    await dialog
      .getByLabel("Source description", { exact: true })
      .fill(
        "Original analytic QA fixture; no recorded or third-party geometry.",
      );
    await dialog
      .getByLabel("Assumed left half-width (m)", { exact: true })
      .fill("7");
    await dialog
      .getByLabel("Assumed right half-width (m)", { exact: true })
      .fill("8");
    await expect(
      dialog.getByRole("button", { name: "Import and simulate" }),
    ).toBeEnabled();
    await dialog.evaluate((element) => {
      element.scrollTop = 0;
    });
    await dialog.screenshot({ path: `artifacts/gpx-review-${width}.png` });
    await dialog.locator(".gpx-preview").scrollIntoViewIfNeeded();
    await dialog.screenshot({ path: `artifacts/gpx-preview-${width}.png` });
    await dialog
      .getByRole("button", { name: "Import and simulate" })
      .scrollIntoViewIfNeeded();
    await dialog.screenshot({ path: `artifacts/gpx-assumptions-${width}.png` });
    const dimensions = await dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(dimensions.top).toBeGreaterThanOrEqual(0);
    expect(dimensions.bottom).toBeLessThanOrEqual(height);
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    );
    expect(requests).toBe(0);
    await dialog.getByRole("button", { name: "Import and simulate" }).click();
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(/^gpx-/, { timeout: 60000 });
    expect(requests).toBe(2);
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    if (width === 1600 || width === 390)
      await page.screenshot({
        path: `artifacts/gpx-workspace-${width}.png`,
        fullPage: true,
      });
    findings.push({
      width,
      height,
      dimensions,
      requests,
      lapTime: await page.getByTestId("lap-time").textContent(),
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile("artifacts/gpx-qa.json", JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
