/* global document, getComputedStyle */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  ignoreDefaultArgs: ["--hide-scrollbars"],
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "typography";
try {
  for (const track of ["ardennes-development", "red-bull-ring"])
    for (const width of [1600, 1280, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [],
        warnings = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
        if (message.type() === "warning") warnings.push(message.text());
      });
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Inspect corner 1", exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({
        family: getComputedStyle(document.documentElement).fontFamily,
        loaded: [...document.fonts].some(
          (font) =>
            font.family === "Inter Variable" && font.status === "loaded",
        ),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        panelRight: Math.max(
          ...[
            ...document.querySelectorAll(".workspace > *, .topbar-actions"),
          ].map((node) => node.getBoundingClientRect().right),
        ),
      }));
      expect(metrics.family).toMatch(/^"Inter Variable"/);
      expect(metrics.loaded).toBe(true);
      expect(metrics.scrollWidth).toBe(metrics.clientWidth);
      expect(metrics.panelRight).toBeLessThanOrEqual(metrics.clientWidth);
      const stem = `artifacts/${prefix}-${track}-${width}`;
      // Preserve the requested viewport width and visible native scrollbar so
      // the right edge can be assessed alongside the actual panel bounds.
      await page.screenshot({ path: `${stem}-dashboard.png` });
      await page
        .locator(".telemetry-panel")
        .screenshot({ path: `${stem}-telemetry.png` });
      if (width < 400)
        for (const [part, selector] of [
          ["settings", ".settings-panel"],
          ["analysis", ".analysis-column"],
        ])
          await page
            .locator(selector)
            .screenshot({ path: `${stem}-${part}.png` });
      expect(errors).toEqual([]);
      records.push({ track, width, ...metrics, errors, warnings });
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  console.log(
    `Reviewed ${records.length} complete dashboards using the bundled font.`,
  );
  await browser.close();
}
