/* global document */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Inspect the real paused vehicle on its road. Close camera poses are QA-only;
// the application still exposes its existing four camera choices.
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "vehicle-shape";
try {
  for (const track of ["ardennes-development", "red-bull-ring"].filter(
    (id) => !process.env.QA_TRACK || process.env.QA_TRACK === id,
  ))
    for (const vehicle of ["formula-development", "gt-development"].filter(
      (id) => !process.env.QA_VEHICLE || process.env.QA_VEHICLE === id,
    )) {
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
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
      await page.getByRole("button", { name: "3D View", exact: true }).click();
      await page.getByRole("slider", { name: "Viewer lap position" }).fill("0");
      await page.locator(".scene-footer").scrollIntoViewIfNeeded();
      for (const [view, offset] of [
        ["front", [6, 3.8, 7]],
        ["rear", [-6, 3.2, -7]],
        ["side", [9, 2, 0]],
      ]) {
        const metrics = await page.evaluate(async (offset) => {
          const { _roots } =
            await import("/node_modules/.vite/deps/@react-three_fiber.js");
          const { Vector3, Box3 } =
            await import("/node_modules/.vite/deps/three.js");
          const { scene, camera, controls, gl, invalidate } = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState();
          const car = scene.getObjectByName("current-ghost"),
            body = car.getObjectByName("vehicle-body");
          car.updateWorldMatrix(true, true);
          controls.enableDamping = false;
          controls.minDistance = 0.1;
          controls.target.copy(car.localToWorld(new Vector3(0, 0.5, 0)));
          camera.position.copy(car.localToWorld(new Vector3(...offset)));
          camera.fov = 40;
          camera.near = 0.08;
          camera.updateProjectionMatrix();
          camera.lookAt(controls.target);
          controls.update();
          invalidate();
          const bounds = new Box3().setFromObject(body);
          let triangles = 0,
            meshes = 0;
          const geometryIds = [];
          body.traverse((node) => {
            if (!node.isMesh) return;
            meshes++;
            triangles +=
              (node.geometry.index?.count ??
                node.geometry.attributes.position.count) / 3;
            geometryIds.push(node.geometry.uuid);
          });
          return {
            bounds: [bounds.min.toArray(), bounds.max.toArray()],
            meshes,
            triangles,
            geometryIds,
            textures: gl.info.memory.textures,
            scale: car.scale.toArray(),
          };
        }, offset);
        // Allow the demand frame and HTML projection to settle before the capture.
        await page.waitForTimeout(250);
        await page.locator(".track-panel").screenshot({
          path: `artifacts/${prefix}-${track}-${vehicle}-${view}.png`,
        });
        expect(metrics.scale).toEqual([1, 1, 1]);
        expect(errors).toEqual([]);
        results.push({
          track,
          vehicle,
          view,
          ...metrics,
          errors: [...errors],
          warnings: [...warnings],
        });
      }
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(`Reviewed ${results.length} real vehicle close views.`);
  await browser.close();
}
