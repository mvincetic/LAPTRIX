/* global document */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const prefix = process.env.PRESENTATION_QA_PREFIX ?? "trackside-assets";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
try {
  for (const track of ["ardennes-development", "red-bull-ring"].filter(
    (id) => !process.env.QA_TRACK || process.env.QA_TRACK === id,
  ))
    for (const vehicle of ["formula-development", "gt-development"].filter(
      (id) => !process.env.QA_VEHICLE || process.env.QA_VEHICLE === id,
    ))
      for (const [width, height] of [
        [1600, 1000],
        [1280, 900],
        [390, 844],
      ].filter(
        ([w]) => !process.env.QA_WIDTH || Number(process.env.QA_WIDTH) === w,
      )) {
        const page = await browser.newPage({ viewport: { width, height } });
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
          .getByRole("combobox", { name: "Car profile", exact: true })
          .selectOption(vehicle);
        await expect(
          page.getByRole("button", { name: "Run Simulation", exact: true }),
        ).toBeEnabled();
        await expect(
          page.getByRole("button", { name: "Inspect corner 1", exact: true }),
        ).toBeVisible();
        const snapshot = () =>
          page.evaluate(async () => {
            const fiberUrl = "/node_modules/.vite/deps/@react-three_fiber.js",
              threeUrl = "/node_modules/.vite/deps/three.js";
            const [{ _roots }, { Matrix4, Vector3, Quaternion }] =
              await Promise.all([import(fiberUrl), import(threeUrl)]);
            const { scene, gl } = _roots
              .get(document.querySelector(".scene canvas"))
              .store.getState();
            const group = scene.getObjectByName("original-trackside-assets");
            return {
              batches:
                group?.children.map((mesh) => ({
                  name: mesh.name,
                  geometry: mesh.geometry.uuid,
                  triangles: mesh.geometry.index.count / 3,
                  instances: Array.from({ length: mesh.count }, (_, i) => {
                    const matrix = new Matrix4(),
                      position = new Vector3(),
                      scale = new Vector3(),
                      rotation = new Quaternion();
                    mesh.getMatrixAt(i, matrix);
                    matrix.decompose(position, rotation, scale);
                    return {
                      position: position.toArray(),
                      scale: scale.toArray(),
                      rotation: rotation.toArray(),
                    };
                  }),
                })) ?? [],
              draws: gl.info.render.calls,
              triangles: gl.info.render.triangles,
              textures: gl.info.memory.textures,
              pageWidth: document.documentElement.scrollWidth,
            };
          });
        await expect
          .poll(async () => (await snapshot()).batches.length)
          .toBe(track === "ardennes-development" ? 4 : 0);
        const modes = ["3D View", "Top View", "Chase", "Onboard"];
        if (track === "ardennes-development")
          modes.push("pylon-front", "pylon-back");
        for (const mode of modes) {
          if (mode.startsWith("pylon")) {
            await page
              .getByRole("button", { name: "3D View", exact: true })
              .click();
            await page.evaluate(async (mode) => {
              const fiberUrl = "/node_modules/.vite/deps/@react-three_fiber.js",
                threeUrl = "/node_modules/.vite/deps/three.js";
              const [{ _roots }, { Matrix4, Vector3 }] = await Promise.all([
                import(fiberUrl),
                import(threeUrl),
              ]);
              const state = _roots
                .get(document.querySelector(".scene canvas"))
                .store.getState();
              const mesh = state.scene.getObjectByName(
                  "original-trackside-assets",
                ).children[0],
                matrix = new Matrix4();
              mesh.getMatrixAt(0, matrix);
              const target = new Vector3(0, 2.1, 0).applyMatrix4(matrix);
              const offset = new Vector3(
                mode === "pylon-front" ? 3 : -3,
                3.2,
                mode === "pylon-front" ? -10 : 10,
              ).applyMatrix4(matrix);
              state.controls.enableDamping = false;
              state.controls.minDistance = 0.1;
              state.controls.target.copy(target);
              state.camera.position.copy(offset);
              state.camera.lookAt(target);
              state.controls.update();
              state.camera.updateMatrixWorld();
              state.invalidate();
            }, mode);
          } else
            await page.getByRole("button", { name: mode, exact: true }).click();
          await page.waitForTimeout(250);
          const result = await snapshot();
          expect(result.pageWidth).toBe(width);
          expect(errors).toEqual([]);
          expect(result.batches.length).toBe(
            track === "ardennes-development" ? 4 : 0,
          );
          await page
            .locator(".track-panel")
            .screenshot({
              path: `artifacts/${prefix}-${track}-${vehicle}-${width}-${mode.replaceAll(" ", "-")}.png`,
            });
          if (mode === "3D View" && width === 1600)
            await page.screenshot({
              path: `artifacts/${prefix}-${track}-${vehicle}-dashboard.png`,
            });
          records.push({
            track,
            vehicle,
            width,
            height,
            mode,
            ...result,
            errors: [...errors],
            warnings: [...warnings],
          });
        }
        await page.close();
      }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  console.log(`Captured ${records.length} actual trackside/camera states.`);
  await browser.close();
}
