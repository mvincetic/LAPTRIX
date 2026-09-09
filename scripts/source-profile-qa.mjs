/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { profileTrack } from "../tests/fixtures/source-profile.ts";
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
    await page.getByLabel("Import track file", { exact: true }).setInputFiles({
      name: "original-ramp.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(profileTrack)),
    });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(profileTrack.id);
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("10");
    await page.getByText("Track geometry", { exact: true }).click();
    await page.getByText("Elevation & grade", { exact: true }).click();
    const profileDialog = page.getByRole("dialog", {
      name: "Source elevation & grade",
      exact: true,
    });
    const profile = page.getByRole("region", {
      name: "Source elevation and grade",
      exact: true,
    });
    const selector = profile.getByRole("slider", {
      name: "Source segment",
      exact: true,
    });
    await selector.fill("22");
    await profileDialog.screenshot({
      path: `artifacts/source-profile-ramp-${width}.png`,
    });
    const modalBounds = await profileDialog.boundingBox();
    expect(modalBounds.y).toBeGreaterThanOrEqual(0);
    expect(modalBounds.y + modalBounds.height).toBeLessThanOrEqual(height);
    const dimensions = await profile.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
    if (height < 500) {
      await profile
        .getByRole("button", { name: "Export source profile", exact: true })
        .scrollIntoViewIfNeeded();
      await profileDialog.screenshot({
        path: `artifacts/source-profile-values-${width}.png`,
      });
    }
    await profileDialog
      .getByRole("button", { name: "Close source profile", exact: true })
      .click();
    const cursor = await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue();
    expect(cursor).toBe("10");
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Import track GPX", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Import GPX circuit",
      exact: true,
    });
    await page.getByLabel("GPX source file", { exact: true }).setInputFiles({
      name: "original-analytic.gpx",
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(gpxFixture()),
    });
    await expect(
      dialog.getByRole("button", { name: "Import and simulate" }),
    ).toBeEnabled();
    await dialog.getByText("Elevation & grade", { exact: true }).click();
    const preview = dialog.getByRole("region", {
      name: "Source elevation and grade",
      exact: true,
    });
    await preview
      .getByRole("slider", { name: "Source segment", exact: true })
      .fill("11");
    await preview.screenshot({
      path: `artifacts/source-profile-gpx-${width}.png`,
    });
    const previewDimensions = await preview.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(previewDimensions.scroll).toBeLessThanOrEqual(
      previewDimensions.client + 1,
    );
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("10");
    findings.push({
      width,
      height,
      dimensions,
      previewDimensions,
      modalBounds,
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
  "artifacts/source-profile-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
