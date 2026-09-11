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
  (fullscreen ? "onboard-continuous-fullscreen" : "onboard-continuous");
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
      await page.getByRole("button", { name: "Onboard", exact: true }).click();
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
      await page.evaluate(
        async (mount) => {
          const { _roots, addAfterEffect } =
            await import("/node_modules/.vite/deps/@react-three_fiber.js");
          const { Vector3 } = await import("/node_modules/.vite/deps/three.js");
          const { scene, camera } = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState();
          const car = scene.getObjectByName("current-ghost");
          const local = new Vector3(),
            right = new Vector3();
          const stats = (window.onboardSweep = {
            frames: 0,
            mountError: 0,
            horizonError: 0,
            peakTime: 0,
            bad: [],
            first: Infinity,
            last: 0,
          });
          window.stopOnboardSweep = addAfterEffect(() => {
            if (!document.querySelector('[aria-label="Pause viewer lap"]'))
              return;
            const time = Number(
              document
                .querySelector('[aria-label="Viewer lap position"]')
                .getAttribute("value"),
            );
            stats.frames++;
            stats.first = Math.min(stats.first, time);
            stats.last = Math.max(stats.last, time);
            local.copy(camera.position);
            car.worldToLocal(local);
            const mountError = local.distanceTo(
              new Vector3(0, mount.height, mount.forward),
            );
            const horizonError = Math.abs(
              right.set(1, 0, 0).applyQuaternion(camera.quaternion).y,
            );
            if (mountError > stats.mountError) stats.peakTime = time;
            stats.mountError = Math.max(stats.mountError, mountError);
            stats.horizonError = Math.max(stats.horizonError, horizonError);
            if (
              mountError > 1e-7 ||
              horizonError > 1e-10 ||
              camera.fov !== 60 ||
              camera.near !== 0.08
            ) {
              if (stats.bad.length < 5)
                stats.bad.push({
                  time,
                  mountError,
                  horizonError,
                  fov: camera.fov,
                  near: camera.near,
                });
              queueMicrotask(() =>
                document
                  .querySelector('[aria-label="Pause viewer lap"]')
                  ?.click(),
              );
            }
          });
        },
        vehicle === "gt-development"
          ? { height: 1.48, forward: -0.12 }
          : { height: 1.18, forward: -0.45 },
      );
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          window.onboardSweep.bad.length > 0 ||
          document
            .querySelector(".scene-playback-state-label")
            ?.textContent.includes("Lap complete"),
        null,
        { timeout: (duration + 90) * 1000 },
      );
      const result = await page.evaluate(() => {
        window.stopOnboardSweep();
        return window.onboardSweep;
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
        .fill(String(Number(result.peakTime.toFixed(2))));
      await page.locator(".track-panel").screenshot({
        path: `artifacts/${prefix}-${track}-${vehicle}-peak.png`,
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
