/* global document, requestAnimationFrame, getComputedStyle */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [];
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
    [780, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    for (const [state, label] of [
      ["overview", null],
      ["top", "Top View"],
      ["chase", "Chase"],
      ["fullscreen", "Fullscreen viewer"],
    ]) {
      if (label)
        await page.getByRole("button", { name: label, exact: true }).click();
      if (state === "fullscreen")
        await expect(
          page.getByRole("button", { name: "Exit fullscreen viewer" }),
        ).toBeVisible();
      if (state === "top")
        await expect(
          page.getByRole("button", { name: "Inspect corner 1", exact: true }),
        ).toBeVisible();
      await page.locator(".scene-footer").scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const metrics = await page.evaluate(() => {
        const footer = document.querySelector(".scene-footer");
        const bounds = footer.getBoundingClientRect();
        const elements = [
          ...footer.querySelectorAll("dt, dd, .scene-playback-state"),
        ];
        return {
          playback: footer.textContent,
          pageWidth: document.documentElement.scrollWidth,
          overflow: footer.scrollWidth > footer.clientWidth,
          contained: elements.every((element) => {
            const r = element.getBoundingClientRect();
            return (
              r.left >= bounds.left &&
              r.right <= bounds.right &&
              r.top >= bounds.top &&
              r.bottom <= bounds.bottom
            );
          }),
          values: [...footer.querySelectorAll("dd")].map((element) => ({
            text: element.textContent,
            font: getComputedStyle(element).fontSize,
          })),
        };
      });
      expect(metrics.pageWidth).toBe(width);
      expect(metrics.overflow).toBe(false);
      expect(metrics.contained).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `artifacts/presentation-playback-${width}-${state}.png`,
        fullPage: state !== "fullscreen",
      });
      await page
        .locator(".track-panel")
        .screenshot({
          path: `artifacts/presentation-playback-scene-${width}-${state}.png`,
        });
      results.push({ width, height, state, ...metrics, errors: [...errors] });
    }
    await page.close();
  }
} finally {
  await writeFile(
    "artifacts/presentation-playback-qa.json",
    JSON.stringify(results, null, 2),
  );
  process.stdout.write(JSON.stringify(results, null, 2));
  await browser.close();
}
