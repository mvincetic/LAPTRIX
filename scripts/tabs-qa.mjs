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
  for (const width of [1600, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    await page.locator("canvas").waitFor({ timeout: 60000 });
    await page.waitForTimeout(500);
    const viewer = page.getByRole("tablist", { name: "Viewer tools" });
    await viewer.getByRole("tab", { name: "Track View", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("tabpanel", { name: "Analysis Layers" }),
    ).toBeFocused();
    await page.screenshot({ path: `artifacts/tabs-layers-${width}.png` });

    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await viewer.getByRole("tab", { name: "Track View", exact: true }).focus();
    await page.keyboard.press("Tab");
    const legend = page.getByRole("tabpanel", {
      name: "Track View",
      exact: true,
    });
    await expect(legend).toBeFocused();
    await expect(legend).toHaveCSS("opacity", "1");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/tabs-chase-${width}.png` });

    const telemetry = page.getByRole("tablist", { name: "Telemetry view" });
    await telemetry.getByRole("tab", { name: "Lap Graphs" }).focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("tabpanel", { name: "Time Delta" }),
    ).toBeFocused();
    await page.screenshot({ path: `artifacts/tabs-delta-${width}.png` });
    await telemetry.getByRole("tab", { name: "Sector Analysis" }).focus();
    await page.screenshot({ path: `artifacts/tabs-sectors-${width}.png` });
    findings.push({
      width,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile("artifacts/tabs-qa.json", JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
