/* global document, requestAnimationFrame, getComputedStyle */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [];
const showcase = process.argv.includes("--showcase");
const prefix =
  process.env.PRESENTATION_QA_PREFIX ??
  (showcase ? "red-bull-ring" : "presentation-playback");
try {
  const sizes = process.argv.includes("--compact")
    ? [
        [320, 844],
        [360, 844],
      ]
    : [
        [1600, 1000],
        [1280, 900],
        [390, 844],
        [780, 390],
      ];
  for (const [width, height] of sizes) {
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
    if (process.argv.includes("--gt")) {
      await page
        .getByRole("combobox", { name: "Car profile" })
        .selectOption("gt-development");
      await expect(page.getByTestId("result-vehicle")).toHaveText(
        "GT Development 01",
      );
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
    }
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    if (process.argv.includes("--interval")) {
      await page
        .getByRole("combobox", { name: "Plot range", exact: true })
        .selectOption("2");
      await page
        .getByRole("button", { name: "Loop sector", exact: true })
        .click();
      await expect(page.locator(".scene-loop-summary")).toBeVisible();
    }
    if (process.argv.includes("--reference")) {
      await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "Show reference ghost" })
        .check();
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
    }
    if (process.argv.includes("--entry")) {
      await page.getByRole("slider", { name: "Viewer lap position" }).fill("0");
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Chase", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(async () =>
          Number(
            await page
              .getByRole("slider", { name: "Viewer lap position" })
              .getAttribute("value"),
          ),
        )
        .toBeGreaterThan(0.3);
      await page
        .getByRole("button", { name: "Pause viewer lap", exact: true })
        .click();
    }
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
      await expect
        .poll(() =>
          page.locator(".scene canvas").evaluate((canvas) => {
            const box = canvas.getBoundingClientRect();
            return (
              canvas.width === Math.floor(box.width) &&
              canvas.height === Math.floor(box.height)
            );
          }),
        )
        .toBe(true);
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
          ...footer.querySelectorAll(
            "dt, dd, .scene-playback-state, button, select, .scene-identity, .scene-scrub, .scene-loop-summary",
          ),
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
