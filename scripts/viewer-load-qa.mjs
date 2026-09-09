/* global document */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
for (const mode of ["loading", "failure"]) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    locale: "en-US",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let release = () => {};
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route(
    /\/apps\/web\/src\/components\/TrackView\.tsx(?:\?.*)?$/,
    async (route) => {
      requests++;
      if (mode === "failure" && requests === 1) await route.abort("failed");
      else {
        if (mode === "loading") await gate;
        await route.continue();
      }
    },
  );
  await page.goto("http://127.0.0.1:5173/");
  await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
  await page
    .getByText(
      mode === "loading"
        ? "Loading 3D viewer…"
        : "The 3D viewer could not load",
      { exact: true },
    )
    .waitFor();
  for (const [label, width, height] of [
    ["desktop", 1600, 1000],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `artifacts/viewer-${mode}-${label}.png` });
    console.log(
      JSON.stringify({
        mode,
        width,
        bodyWidth: await page.evaluate(() => document.body.scrollWidth),
      }),
    );
  }
  if (mode === "failure") {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page
      .getByRole("button", { name: "Reload page", exact: true })
      .click();
  } else release();
  await page.locator("canvas").waitFor({ timeout: 60000 });
  console.log(JSON.stringify({ mode, recovered: true, errors }));
  await page.close();
}
await browser.close();
