/* global document */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
try {
  for (const width of [1600, 1280, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    await page.locator("canvas").waitFor({ timeout: 60000 });
    await page.getByRole("tab", { name: "Cursor Data" }).click();
    const entry = page.getByRole("spinbutton", {
      name: "Inspect at distance (m)",
    });
    await entry.fill("2500.125");
    await entry.press("Enter");
    await expect(
      page.getByRole("button", { name: "Play playback" }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/cursor-workspace-${width}.png` });
    await page
      .locator(".telemetry-panel")
      .screenshot({ path: `artifacts/cursor-panel-${width}.png` });
    if (width > 650) {
      const panel = page.getByRole("tabpanel", { name: "Cursor Data" });
      await panel.focus();
      await panel.press("PageDown");
      await expect(page.locator(".cursor-note")).toBeInViewport({ ratio: 1 });
      await page.waitForTimeout(200);
      await page
        .locator(".telemetry-panel")
        .screenshot({ path: `artifacts/cursor-scrolled-${width}.png` });
    }
    findings.push({
      width,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      cursor: await page
        .getByRole("slider", { name: "Lap playback position" })
        .getAttribute("aria-valuetext"),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile("artifacts/cursor-qa.json", JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
