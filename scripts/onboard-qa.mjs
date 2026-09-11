/* global document, window */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "onboard";
try {
  for (const track of ["ardennes-development", "red-bull-ring"].filter(
    (id) => !process.env.QA_TRACK || process.env.QA_TRACK === id,
  ))
    for (const vehicle of ["formula-development", "gt-development"].filter(
      (id) => !process.env.QA_VEHICLE || process.env.QA_VEHICLE === id,
    ))
      for (const width of [1600, 1280, 390].filter(
        (width) =>
          !process.env.QA_WIDTH || Number(process.env.QA_WIDTH) === width,
      )) {
        const page = await browser.newPage({
            viewport: { width, height: width === 390 ? 844 : 1000 },
          }),
          errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
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
        const cursor = page.getByRole("slider", {
          name: "Viewer lap position",
        });
        const duration = Number(await cursor.getAttribute("max"));
        async function capture(state) {
          await page.locator(".scene-footer").scrollIntoViewIfNeeded();
          await expect
            .poll(() =>
              page.locator(".scene canvas").evaluate((canvas) => {
                const bounds = canvas.getBoundingClientRect();
                return (
                  canvas.width === Math.floor(bounds.width) &&
                  canvas.height === Math.floor(bounds.height)
                );
              }),
            )
            .toBe(true);
          await page.locator(".track-panel").screenshot({
            path: `artifacts/${prefix}-${track}-${vehicle}-${width}-${state}.png`,
          });
          const metrics = await page.evaluate(async () => {
            const { _roots } =
              await import("/node_modules/.vite/deps/@react-three_fiber.js");
            const { Vector3, Sphere, Matrix4 } =
              await import("/node_modules/.vite/deps/three.js");
            const { scene, camera, gl } = _roots
              .get(document.querySelector(".scene canvas"))
              .store.getState();
            const body = scene.getObjectByName("current-ghost");
            const sphere = new Sphere(),
              matrix = new Matrix4();
            let treeBoundOverflow = 0,
              treeBatches = 0;
            scene.traverse((node) => {
              if (
                !node.isInstancedMesh ||
                !node.name.startsWith("context-tree-")
              )
                return;
              treeBatches++;
              for (let i = 0; i < node.count; i++) {
                node.getMatrixAt(i, matrix);
                sphere.copy(node.geometry.boundingSphere).applyMatrix4(matrix);
                treeBoundOverflow = Math.max(
                  treeBoundOverflow,
                  sphere.center.distanceTo(node.boundingSphere.center) +
                    sphere.radius -
                    node.boundingSphere.radius,
                );
              }
            });
            const panel = document
              .querySelector(".track-panel")
              .getBoundingClientRect();
            return {
              fov: camera.fov,
              treeBoundOverflow,
              treeBatches,
              near: camera.near,
              position: camera.position.toArray(),
              body: body.position.toArray(),
              distance: camera.position.distanceTo(body.position),
              horizon: new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
                .y,
              time: document
                .querySelector('[aria-label="Viewer lap position"]')
                .getAttribute("value"),
              pageWidth: document.documentElement.scrollWidth,
              panel: {
                x: panel.x,
                y: panel.y,
                width: panel.width,
                height: panel.height,
              },
              calls: gl.info.render.calls,
              triangles: gl.info.render.triangles,
              controls: [
                ...document.querySelectorAll(
                  ".view-actions button, .scene-footer button, .scene-footer select, .scene-footer input, .scene-footer .scene-identity-entry",
                ),
              ].every((node) => {
                const b = node.getBoundingClientRect();
                return (
                  b.width > 0 &&
                  b.left >= 0 &&
                  b.right <= window.innerWidth &&
                  b.left >= panel.left &&
                  b.right <= panel.right &&
                  b.top >= panel.top &&
                  b.bottom <= panel.bottom
                );
              }),
            };
          });
          results.push({
            track,
            vehicle,
            width,
            state,
            ...metrics,
            errors: [...errors],
          });
          expect(metrics.fov).toBe(60);
          expect(metrics.treeBatches).toBe(2);
          expect(metrics.treeBoundOverflow).toBeLessThan(0.001);
          expect(metrics.near).toBe(0.08);
          expect(metrics.distance).toBeLessThan(2);
          expect(Math.abs(metrics.horizon)).toBeLessThan(1e-10);
          expect(metrics.controls).toBe(true);
          expect(metrics.pageWidth).toBe(width);
          expect(errors).toEqual([]);
        }
        for (const fraction of [0, 0.25, 0.5, 0.75]) {
          await cursor.fill(
            String(Math.floor(duration * fraction * 100) / 100),
          );
          await capture(String(fraction));
        }
        if (width === 390) {
          await page
            .getByRole("button", { name: "Fullscreen viewer", exact: true })
            .click();
          await expect(
            page.getByRole("button", { name: "Exit fullscreen viewer" }),
          ).toBeVisible();
          await capture("fullscreen");
          await page
            .getByRole("button", { name: "Exit fullscreen viewer" })
            .click();
        }
        await page.close();
      }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(`Verified ${results.length} onboard scenes.`);
  await browser.close();
}
