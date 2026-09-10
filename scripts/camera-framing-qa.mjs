/* global document, requestAnimationFrame */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { largeFramingTrack } from "../tests/fixtures/camera.ts";
import { racingLinePixels } from "../tests/fixtures/viewer-pixels.ts";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    locale: "en-US",
  });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.goto("http://127.0.0.1:5173/");
  await page.getByTestId("lap-time").waitFor();
  for (const source of ["original", "large"]) {
    if (source === "large") {
      await page
        .getByLabel("Import track file", { exact: true })
        .setInputFiles({
          name: "large-framing.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(largeFramingTrack)),
        });
      await expect(
        page.getByRole("combobox", { name: "Track", exact: true }),
      ).toHaveValue(largeFramingTrack.id);
    }
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    for (const [width, height] of [
      [1600, 1000],
      [1280, 900],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      for (const [mode, label] of [
        ["orbit", "3D View"],
        ["top", "Top View"],
      ]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await page
          .getByRole("button", { name: "Reset camera", exact: true })
          .click();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await expect
          .poll(async () => (await racingLinePixels(page)).count)
          .toBeGreaterThan(100);
        const pixels = await racingLinePixels(page);
        expect(pixels.error).toBe(0);
        await page
          .locator(".scene")
          .screenshot({
            path: `artifacts/camera-framing-${source}-${mode}-${width}.png`,
          });
        const cursor = await page
          .getByRole("slider", { name: "Lap playback position" })
          .inputValue();
        expect(cursor).toBe("20");
        const scrollWidth = await page.evaluate(
          () => document.body.scrollWidth,
        );
        expect(scrollWidth).toBe(width);
        findings.push({
          source,
          width,
          height,
          mode,
          scene: await page.locator(".scene").boundingBox(),
          pixels,
          cursor,
          scrollWidth,
        });
      }
    }
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await expect
      .poll(async () => (await racingLinePixels(page)).count)
      .toBeGreaterThan(100);
    await page
      .locator(".scene")
      .screenshot({ path: `artifacts/camera-framing-${source}-chase-390.png` });
    findings.push({
      source,
      mode: "chase",
      pixels: await racingLinePixels(page),
      cursor: await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    });
  }
  findings.push({ errors });
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/camera-framing-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
