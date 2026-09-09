/* global document */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
let release = () => {};
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    locale: "en-US",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/");
  await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
  const lap = await page.getByTestId("lap-time").textContent();
  await page.getByRole("slider", { name: "Fuel load" }).focus();
  await page.keyboard.press("End");
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/simulate", async (route) => {
    await gate;
    await route.abort("aborted");
  });
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel calculation", exact: true })
    .waitFor();
  for (const state of ["pending", "cancelled"]) {
    if (state === "cancelled") {
      await page
        .getByRole("button", { name: "Cancel calculation", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Run Simulation", exact: true })
        .waitFor();
    }
    for (const [label, width, height] of [
      ["desktop", 1600, 1000],
      ["mobile", 390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.screenshot({
        path: `artifacts/calculation-${state}-${label}.png`,
      });
      console.log(
        JSON.stringify({
          state,
          width,
          bodyWidth: await page.evaluate(() => document.body.scrollWidth),
          retainedLap:
            (await page.getByTestId("lap-time").textContent()) === lap,
        }),
      );
    }
  }
  release();
  await page.unrouteAll({ behavior: "wait" });
  console.log(JSON.stringify({ errors }));
} finally {
  release();
  await browser.close();
}
