/* global document, requestAnimationFrame, getComputedStyle */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [];
const showcase = process.argv.includes("--showcase");
const prefix = showcase ? "red-bull-ring" : "presentation-playback";
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
    if (showcase) {
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption("red-bull-ring");
      await expect(page.locator(".track-caption strong")).toHaveText(
        "Red Bull Ring",
      );
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("navigation", { name: "Track source attribution" }),
      ).toContainText("© OpenStreetMap contributors");
    }
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
      if (showcase) {
        const credits = await page
          .locator(".track-attribution")
          .evaluate((element) => {
            const r = element.getBoundingClientRect(),
              panel = element.closest(".track-panel").getBoundingClientRect();
            return {
              text: element.textContent,
              height: r.height,
              contained:
                r.left >= panel.left &&
                r.right <= panel.right &&
                r.bottom <= panel.bottom,
              overflow: element.scrollWidth > element.clientWidth,
            };
          });
        expect(credits.contained).toBe(true);
        expect(credits.overflow).toBe(false);
        metrics.credits = credits;
      }
      await page.screenshot({
        path: `artifacts/${prefix}-${width}-${state}.png`,
        fullPage: state !== "fullscreen",
      });
      await page.locator(".track-panel").screenshot({
        path: `artifacts/${prefix}-scene-${width}-${state}.png`,
      });
      results.push({ width, height, state, ...metrics, errors: [...errors] });
    }
    await page.close();
  }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  process.stdout.write(JSON.stringify(results, null, 2));
  await browser.close();
}
