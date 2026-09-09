/* global document */
import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  locale: "en-US",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/");
await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
await page
  .getByLabel("Import track file", { exact: true })
  .setInputFiles({
    name: "crossing.json",
    mimeType: "application/json",
    buffer: await readFile("tests/fixtures/crossing-track.json"),
  });
await page
  .getByText("Track imported and simulated", { exact: true })
  .waitFor({ timeout: 60000 });
await page.locator(".track-details > summary").click();
for (const [label, width, height] of [
  ["desktop", 1600, 1000],
  ["mobile", 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page
    .getByRole("button", { name: "Export geometry report" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/geometry-${label}.png` });
  console.log(
    JSON.stringify({
      width,
      bodyWidth: await page.evaluate(() => document.body.scrollWidth),
      gap: await page.getByTestId("geometry-height-gap").textContent(),
    }),
  );
}
const pending = page.waitForEvent("download");
await page.getByRole("button", { name: "Export geometry report" }).click();
await (await pending).saveAs("artifacts/track-geometry-report.json");
console.log(JSON.stringify({ errors }));
await browser.close();
