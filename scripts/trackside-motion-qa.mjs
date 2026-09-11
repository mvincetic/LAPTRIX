/* global document, window */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "trackside-motion";
try {
  for (const track of ["ardennes-development", "red-bull-ring"])
    for (const vehicle of ["formula-development", "gt-development"])
      for (const width of track === "red-bull-ring" ? [1600, 390] : [1600]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
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
          .getByRole("combobox", { name: "Car profile" })
          .selectOption(vehicle);
        await expect(
          page.getByRole("button", { name: "Run Simulation", exact: true }),
        ).toBeEnabled();
        await expect(
          page.getByRole("button", { name: "Inspect corner 1", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Onboard", exact: true })
          .click();
        if (width === 390)
          await page
            .getByRole("button", { name: "Fullscreen viewer", exact: true })
            .click();
        await page.locator(".track-panel").screenshot({
          path: `artifacts/${prefix}-${track}-${vehicle}-${width}-start.png`,
        });
        await page.evaluate(async () => {
          const { _roots, addAfterEffect } =
            await import("/node_modules/.vite/deps/@react-three_fiber.js");
          const { Matrix4, Vector3 } =
            await import("/node_modules/.vite/deps/three.js");
          const { scene, camera } = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState();
          const posts = scene.getObjectByName("context-guardrail-posts"),
            car = scene.getObjectByName("current-ghost");
          const matrix = new Matrix4(),
            point = new Vector3(),
            projected = new Vector3();
          let chosen = -1,
            best = Infinity;
          for (let i = 0; i < posts.count; i++) {
            posts.getMatrixAt(i, matrix);
            point
              .set(0, 0.5, 0)
              .applyMatrix4(matrix)
              .applyMatrix4(posts.matrixWorld);
            projected.copy(point).project(camera);
            const distance = point.distanceTo(camera.position),
              score = Math.abs(distance - 110);
            if (
              projected.z > -1 &&
              projected.z < 1 &&
              Math.abs(projected.x) < 0.85 &&
              Math.abs(projected.y) < 0.9 &&
              distance > 70 &&
              distance < 150 &&
              score < best
            ) {
              chosen = i;
              best = score;
            }
          }
          if (chosen < 0)
            throw new Error(
              "No forward support is available for the parallax probe.",
            );
          posts.getMatrixAt(chosen, matrix);
          const anchor = new Vector3(0, 0.5, 0)
            .applyMatrix4(matrix)
            .applyMatrix4(posts.matrixWorld);
          const start = car.position.clone();
          const stats = (window.tracksideMotion = {
            frames: 0,
            seen: 0,
            minX: Infinity,
            maxX: -Infinity,
            carDistance: 0,
            anchorDrift: 0,
            firstTime: Infinity,
            lastTime: 0,
          });
          window.stopTracksideMotion = addAfterEffect(() => {
            if (!document.querySelector('[aria-label="Pause viewer lap"]'))
              return;
            const time = Number(
              document
                .querySelector('[aria-label="Viewer lap position"]')
                .getAttribute("value"),
            );
            stats.frames++;
            stats.firstTime = Math.min(stats.firstTime, time);
            stats.lastTime = Math.max(stats.lastTime, time);
            stats.carDistance = Math.max(
              stats.carDistance,
              car.position.distanceTo(start),
            );
            posts.getMatrixAt(chosen, matrix);
            point
              .set(0, 0.5, 0)
              .applyMatrix4(matrix)
              .applyMatrix4(posts.matrixWorld);
            stats.anchorDrift = Math.max(
              stats.anchorDrift,
              point.distanceTo(anchor),
            );
            projected.copy(point).project(camera);
            if (
              projected.z > -1 &&
              projected.z < 1 &&
              Math.abs(projected.x) <= 1 &&
              Math.abs(projected.y) <= 1
            ) {
              stats.seen++;
              stats.minX = Math.min(stats.minX, projected.x);
              stats.maxX = Math.max(stats.maxX, projected.x);
            }
          });
        });
        await page
          .getByRole("button", { name: "Play viewer lap", exact: true })
          .click();
        await expect
          .poll(
            async () =>
              Number(
                await page
                  .getByRole("slider", { name: "Viewer lap position" })
                  .getAttribute("value"),
              ),
            { timeout: 12000 },
          )
          .toBeGreaterThan(2);
        await page
          .getByRole("button", { name: "Pause viewer lap", exact: true })
          .click();
        const stats = await page.evaluate(() => {
          window.stopTracksideMotion();
          return window.tracksideMotion;
        });
        await page.locator(".track-panel").screenshot({
          path: `artifacts/${prefix}-${track}-${vehicle}-${width}-after.png`,
        });
        results.push({ track, vehicle, width, ...stats, errors });
        expect(stats.frames).toBeGreaterThan(10);
        expect(stats.seen).toBeGreaterThan(3);
        expect(stats.maxX - stats.minX).toBeGreaterThan(0.08);
        expect(stats.carDistance).toBeGreaterThan(20);
        expect(stats.anchorDrift).toBe(0);
        expect(errors).toEqual([]);
        await page.close();
      }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Verified ${results.length} real-time trackside motion sequences.`,
  );
  await browser.close();
}
