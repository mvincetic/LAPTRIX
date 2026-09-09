/* global document */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto("http://127.0.0.1:5173/");
await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
console.log(
  JSON.stringify(
    {
      errors,
      lap: await page.getByTestId("lap-time").textContent(),
      canvas: await page.locator("canvas").count(),
      bodyWidth: await page.evaluate(() => document.body.scrollWidth),
    },
    null,
    2,
  ),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
console.log(
  "Mobile width",
  await page.evaluate(() => document.body.scrollWidth),
);
await browser.close();
