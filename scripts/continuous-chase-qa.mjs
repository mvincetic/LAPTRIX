/* global document, window, queueMicrotask */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
// Read-only inspection of each presented development frame; no extra clock.
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
const fullscreen = process.argv.includes("--fullscreen");
const prefix =
  process.env.PRESENTATION_QA_PREFIX ??
  (fullscreen ? "continuous-fullscreen" : "continuous-chase");
try {
  for (const track of fullscreen
    ? ["red-bull-ring", "ardennes-development"]
    : ["ardennes-development", "red-bull-ring"])
    for (const vehicle of ["formula-development", "gt-development"]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await page
        .getByRole("combobox", { name: "Car profile", exact: true })
        .selectOption(vehicle);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Inspect corner 1", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      if (fullscreen)
        await page
          .getByRole("button", { name: "Fullscreen viewer", exact: true })
          .click();
      await page
        .getByRole("button", { name: "Loop viewer playback", exact: true })
        .click();
      const duration = Number(
        await page
          .getByRole("slider", { name: "Viewer lap position", exact: true })
          .getAttribute("max"),
      );
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
      await page.evaluate(async () => {
        const { _roots, addAfterEffect } =
          await import("/node_modules/.vite/deps/@react-three_fiber.js");
        const { Box3, Vector3 } =
          await import("/node_modules/.vite/deps/three.js");
        const { scene, camera } = _roots
          .get(document.querySelector(".scene canvas"))
          .store.getState();
        const car = scene.getObjectByName("current-ghost"),
          body = car.getObjectByName("vehicle-body");
        const box = new Box3(),
          point = new Vector3();
        const stats = (window.chaseSweep = {
          frames: 0,
          x: 0,
          y: 0,
          widestTime: 0,
          bad: [],
          first: Infinity,
          last: 0,
        });
        window.stopChaseSweep = addAfterEffect(() => {
          if (!document.querySelector('[aria-label="Pause viewer lap"]'))
            return;
          const time = Number(
            document
              .querySelector('[aria-label="Viewer lap position"]')
              .getAttribute("value"),
          );
          box.setFromObject(body);
          stats.frames++;
          stats.first = Math.min(stats.first, time);
          stats.last = Math.max(stats.last, time);
          let x = 0,
            y = 0,
            z = 0;
          for (const px of [box.min.x, box.max.x])
            for (const py of [box.min.y, box.max.y])
              for (const pz of [box.min.z, box.max.z]) {
                point.set(px, py, pz).project(camera);
                x = Math.max(x, Math.abs(point.x));
                y = Math.max(y, Math.abs(point.y));
                z = Math.max(z, Math.abs(point.z));
              }
          if (x > stats.x) stats.widestTime = time;
          stats.x = Math.max(stats.x, x);
          stats.y = Math.max(stats.y, y);
          if (x >= 1 || y >= 1 || z >= 1) {
            if (stats.bad.length < 5)
              stats.bad.push({
                time,
                x,
                y,
                z,
                position: car.position.toArray(),
              });
            queueMicrotask(() =>
              document
                .querySelector('[aria-label="Pause viewer lap"]')
                ?.click(),
            );
          }
        });
      });
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          window.chaseSweep.bad.length > 0 ||
          document
            .querySelector(".scene-playback-state-label")
            ?.textContent.includes("Lap complete"),
        null,
        { timeout: (duration + 90) * 1000 },
      );
      const result = await page.evaluate(() => {
        window.stopChaseSweep();
        return window.chaseSweep;
      });
      await page
        .locator(".track-panel")
        .screenshot({ path: `artifacts/${prefix}-${track}-${vehicle}.png` });
      records.push({ track, vehicle, duration, errors, ...result });
      process.stdout.write(JSON.stringify(records.at(-1)) + "\n");
      expect(result.frames).toBeGreaterThan(100);
      expect(result.bad).toEqual([]);
      expect(errors).toEqual([]);
      await page
        .getByRole("slider", { name: "Viewer lap position", exact: true })
        .fill(String(Number(result.widestTime.toFixed(2))));
      await page.locator(".track-panel").screenshot({
        path: `artifacts/${prefix}-${track}-${vehicle}-widest.png`,
      });
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  await browser.close();
}
