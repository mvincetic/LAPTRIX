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
const lap = await page.getByTestId("lap-time").textContent();
await page.route("**/api/simulate", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      detail: "Track calculation temporarily unavailable",
    }),
  }),
);
await page
  .getByLabel("Import track file", { exact: true })
  .setInputFiles({
    name: "crossing.json",
    mimeType: "application/json",
    buffer: await readFile("tests/fixtures/crossing-track.json"),
  });
await page
  .getByRole("alert")
  .filter({ hasText: "Current workspace kept" })
  .waitFor();
for (const [label, width, height] of [
  ["desktop", 1600, 1000],
  ["mobile", 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.screenshot({ path: `artifacts/track-failure-${label}.png` });
  console.log(
    JSON.stringify({
      width,
      bodyWidth: await page.evaluate(() => document.body.scrollWidth),
      retainedLap: (await page.getByTestId("lap-time").textContent()) === lap,
    }),
  );
}
await page.getByRole("button", { name: "Save", exact: true }).click();
await page.unroute("**/api/simulate");
await page.reload();
await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
console.log(
  JSON.stringify({
    restoredTrack: await page
      .getByRole("combobox", { name: "Track", exact: true })
      .inputValue(),
    errors,
  }),
);
await browser.close();
