/* global document */
import { chromium, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const original = JSON.parse(
  await readFile("data/tracks/ardennes-development.json", "utf8"),
);
const imported = {
  ...original,
  id: "selector-import",
  name: "Imported engineering circuit with a deliberately long descriptive name",
  country: "User supplied location",
  synthetic: false,
};
const browser = await chromium.launch({
  ignoreDefaultArgs: ["--hide-scrollbars"],
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "selection";
try {
  for (const width of [1600, 1280, 700, 390, 320]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [],
      warnings = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
      if (message.type() === "warning") warnings.push(message.text());
    });
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const select = page.getByRole("combobox", { name: "Track", exact: true });
    for (const [id, status] of [
      [original.id, "Development"],
      ["red-bull-ring", "Real · approximate"],
      [imported.id, "Imported · unverified"],
    ]) {
      if (id === "red-bull-ring") {
        await select.focus();
        await select.press("ArrowDown");
        await select.press("Enter");
      } else if (id === imported.id) {
        await page
          .getByLabel("Import track file", { exact: true })
          .setInputFiles({
            name: "selector-import.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(imported)),
          });
      }
      await expect(select).toHaveValue(id);
      await expect(select).toHaveAccessibleDescription(status);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      const cursor = page.getByRole("slider", { name: "Viewer lap position" });
      await cursor.fill("20");
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await expect
        .poll(async () => Number(await cursor.getAttribute("value")))
        .toBeGreaterThan(20.2);
      await page
        .getByRole("button", { name: "Pause viewer lap", exact: true })
        .click();
      const layout = await page.evaluate(() => {
        const status = document.querySelector(".track-category"),
          field = document
            .querySelector(".track-field")
            .getBoundingClientRect(),
          header = document.querySelector(".topbar").getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".brand-word"));
        const word = range.getBoundingClientRect(),
          actions = document
            .querySelector(".topbar-actions")
            .getBoundingClientRect();
        const vehicle = document
          .querySelector(".vehicle-field")
          .getBoundingClientRect();
        return {
          fieldsAligned: Math.abs(field.top - vehicle.top) < 1,
          brandOverlap:
            Math.max(
              0,
              Math.min(word.right, actions.right) -
                Math.max(word.left, actions.left),
            ) *
            Math.max(
              0,
              Math.min(word.bottom, actions.bottom) -
                Math.max(word.top, actions.top),
            ),
          statusFits: status.scrollWidth <= status.clientWidth + 1,
          fieldFits: field.left >= header.left && field.right <= header.right,
          scrollWidth: document.documentElement.scrollWidth,
          groups: [...document.querySelectorAll(".track-field optgroup")].map(
            (group) => ({
              label: group.label,
              names: [...group.children].map((option) => option.textContent),
            }),
          ),
        };
      });
      await page
        .locator(".topbar")
        .screenshot({ path: `artifacts/${prefix}-${width}-${id}-header.png` });
      await page.locator(".track-panel").screenshot({
        path: `artifacts/${prefix}-${width}-${id}-playback.png`,
      });
      results.push({
        width,
        id,
        status,
        ...layout,
        errors: [...errors],
        warnings: [...warnings],
      });
      expect(layout.statusFits).toBe(true);
      expect(layout.brandOverlap).toBe(0);
      expect(layout.fieldsAligned).toBe(true);
      expect(layout.fieldFits).toBe(true);
      expect(layout.scrollWidth).toBeLessThanOrEqual(width);
      expect(errors).toEqual([]);
    }
    await page.close();
  }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Reviewed ${results.length} track selections and real playback states.`,
  );
  await browser.close();
}
