/* global document */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  // Review the native overflow affordance; headless Chromium hides it by default.
  ignoreDefaultArgs: ["--hide-scrollbars"],
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "layers";
try {
  for (const track of ["ardennes-development", "red-bull-ring"])
    for (const width of [1600, 1280, 390, 780].filter(
      (value) =>
        !process.env.QA_WIDTH || Number(process.env.QA_WIDTH) === value,
    )) {
      const page = await browser.newPage({
        viewport: { width, height: width === 780 ? 390 : 900 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
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
      await page
        .getByRole("slider", { name: "Viewer lap position" })
        .fill("20");
      if (width === 780)
        await page
          .getByRole("button", { name: "Fullscreen viewer", exact: true })
          .click();
      for (const state of [
        "overlays",
        "source",
        "chase",
        "onboard",
        "ghost",
        "camera",
      ]) {
        const tab =
          state === "ghost"
            ? "Ghost Car"
            : state === "camera"
              ? "Camera"
              : "Analysis Layers";
        await page.getByRole("tab", { name: tab, exact: true }).click();
        if (state === "source") {
          await page.locator(".viewer-source-layers > summary").click();
          await page
            .getByRole("checkbox", { name: "Source road edges", exact: true })
            .scrollIntoViewIfNeeded();
        }
        if (state === "chase") {
          await page.locator(".viewer-source-layers > summary").click();
          await page
            .getByRole("button", { name: "Chase", exact: true })
            .click();
        }
        if (state === "onboard")
          await page
            .getByRole("button", { name: "Onboard", exact: true })
            .click();
        const panel = page.getByRole("tabpanel", { name: tab, exact: true });
        if (state !== "source")
          await panel.evaluate((node) => {
            node.scrollTop = 0;
          });
        const bounds = await page.evaluate(() => {
          const panel = document
              .querySelector(".viewer-popover:not([hidden])")
              .getBoundingClientRect(),
            actions = document
              .querySelector(".view-actions")
              .getBoundingClientRect(),
            scene = document.querySelector(".scene").getBoundingClientRect();
          return {
            overlap:
              Math.max(
                0,
                Math.min(panel.right, actions.right) -
                  Math.max(panel.left, actions.left),
              ) *
              Math.max(
                0,
                Math.min(panel.bottom, actions.bottom) -
                  Math.max(panel.top, actions.top),
              ),
            contained:
              panel.left >= scene.left &&
              panel.right <= scene.right &&
              panel.top >= scene.top &&
              panel.bottom <= scene.bottom,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
        await page.locator(".track-panel").screenshot({
          path: `artifacts/${prefix}-${track}-${width}-${state}.png`,
        });
        results.push({ track, width, state, ...bounds, errors: [...errors] });
        expect(bounds.overlap).toBe(0);
        expect(bounds.contained).toBe(true);
        expect(bounds.scrollWidth).toBeLessThanOrEqual(width);
        await expect(
          page.getByRole("slider", { name: "Viewer lap position" }),
        ).toHaveAttribute("value", "20");
        expect(errors).toEqual([]);
      }
      await page.screenshot({
        path: `artifacts/${prefix}-${track}-${width}-dashboard.png`,
        fullPage: true,
      });
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(`Reviewed ${results.length} viewer panel states.`);
  await browser.close();
}
