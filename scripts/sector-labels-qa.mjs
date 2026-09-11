/* global document */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const prefix = process.env.PRESENTATION_QA_PREFIX ?? "sector-labels";
const records = [];
try {
  for (const track of ["ardennes-development", "red-bull-ring"].filter(
    (id) => !process.env.QA_TRACK || id === process.env.QA_TRACK,
  ))
    for (const [width, height] of [
      [1600, 1000],
      [1280, 900],
      [390, 844],
      [320, 844],
    ].filter(
      ([w]) => !process.env.QA_WIDTH || w === Number(process.env.QA_WIDTH),
    )) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await page
        .getByRole("combobox", { name: "Car profile", exact: true })
        .selectOption("gt-development");
      await expect(page.getByTestId("result-vehicle")).toContainText(
        "GT Development 01",
      );
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "Show reference ghost", exact: true })
        .check();
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      await page
        .getByRole("slider", { name: "Viewer lap position", exact: true })
        .fill("20");
      for (const state of ["orbit", "top", "selected", "tools", "return"]) {
        if (state === "top")
          await page
            .getByRole("button", { name: "Top View", exact: true })
            .click();
        if (state === "selected")
          await page
            .getByRole("button", { name: "Inspect corner 3", exact: true })
            .click();
        if (state === "tools")
          await page
            .getByRole("tab", { name: "Ghost Car", exact: true })
            .click();
        if (state === "return") {
          await page
            .getByRole("tab", { name: "Track View", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Chase", exact: true })
            .click();
          await page
            .getByRole("button", { name: "3D View", exact: true })
            .click();
        }
        await page.locator(".scene").scrollIntoViewIfNeeded();
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
        const measure = () =>
          page.locator(".scene").evaluate((scene) => {
            const canvas = scene
              .querySelector("canvas")
              .getBoundingClientRect();
            const badges = [...scene.querySelectorAll(".sector-label")];
            const visible = badges.filter((node) => !node.hidden),
              boxes = visible.map((node) => node.getBoundingClientRect());
            const obstacles = [
              ...scene.querySelectorAll(
                ".corner-marker,.start-marker,.event-marker,.ghost-tag,.legend,.viewer-popover,.scene-top-left,.compass,.scene-bottom",
              ),
            ]
              .filter((node) => !node.hidden)
              .map((node) => node.getBoundingClientRect())
              .filter((box) => box.width && box.height);
            const area = (a, b) =>
              Math.max(
                0,
                Math.min(a.right, b.right) - Math.max(a.left, b.left),
              ) *
              Math.max(
                0,
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
              );
            return {
              count: visible.length,
              omitted: badges
                .filter((node) => node.hidden)
                .map((node) => node.textContent),
              texts: visible.map((node) => node.textContent),
              overlap: boxes.reduce(
                (sum, box, i) =>
                  sum +
                  [...obstacles, ...boxes.slice(i + 1)].reduce(
                    (n, other) => n + area(box, other),
                    0,
                  ),
                0,
              ),
              contained: boxes.every(
                (box) =>
                  box.width > 0 &&
                  box.height > 0 &&
                  box.left >= canvas.left &&
                  box.right <= canvas.right &&
                  box.top >= canvas.top &&
                  box.bottom <= canvas.bottom,
              ),
              pageWidth: document.documentElement.scrollWidth,
            };
          });
        await expect
          .poll(async () => {
            const m = await measure();
            return (
              m.overlap === 0 &&
              m.contained &&
              m.count > 0 &&
              (state === "tools" || m.count === 3)
            );
          })
          .toBe(true);
        const result = await measure();
        expect(result.pageWidth).toBe(width);
        expect(errors).toEqual([]);
        await page
          .locator(".track-panel")
          .screenshot({
            path: `artifacts/${prefix}-${track}-${width}-${state}.png`,
          });
        if (width === 1600 && state === "orbit")
          await page.screenshot({
            path: `artifacts/${prefix}-${track}-dashboard.png`,
            fullPage: true,
          });
        expect(errors).toEqual([]);
        records.push({
          track,
          width,
          height,
          state,
          ...result,
          errors: [...errors],
        });
      }
      process.stdout.write(
        `${track} ${width}px: five annotation states passed\n`,
      );
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  await browser.close();
}
