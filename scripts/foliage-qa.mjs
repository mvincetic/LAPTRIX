/* global document, window */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [],
  prefix = process.env.PRESENTATION_QA_PREFIX ?? "foliage";
try {
  for (const track of ["ardennes-development", "red-bull-ring"])
    for (const [width, height] of [
      [1600, 1000],
      [1280, 900],
      [390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [],
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
      for (const view of [
        "Chase",
        "Onboard",
        "Top View",
        "3D View",
        "detail-0",
        "detail-1",
        "detail-2",
        "detail-3",
      ]) {
        if (!view.startsWith("detail"))
          await page.getByRole("button", { name: view, exact: true }).click();
        const metrics = await page.evaluate(async (view) => {
          const f = "/node_modules/.vite/deps/@react-three_fiber.js",
            t = "/node_modules/.vite/deps/three.js";
          const [{ _roots }, T] = await Promise.all([import(f), import(t)]);
          const state = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState();
          const crowns = state.scene.getObjectByName("context-tree-crowns"),
            trunks = state.scene.getObjectByName("context-tree-trunks");
          if (view.startsWith("detail")) {
            const target = new T.Vector3(),
              position = new T.Vector3(),
              matrix = new T.Matrix4(),
              car = state.scene.getObjectByName("current-ghost");
            let best = Infinity;
            for (let i = 0; i < crowns.count; i++) {
              crowns.getMatrixAt(i, matrix);
              position.setFromMatrixPosition(matrix);
              const distance = position.distanceToSquared(car.position);
              if (distance < best) {
                target.copy(position);
                best = distance;
              }
            }
            const angle = (Number(view.slice(-1)) * Math.PI) / 2 + Math.PI / 4;
            state.controls.enableDamping = false;
            state.controls.minDistance = 0.1;
            state.controls.target.copy(target);
            state.camera.position
              .copy(target)
              .add(
                new T.Vector3(Math.cos(angle) * 34, 8, Math.sin(angle) * 34),
              );
            state.camera.lookAt(target);
            state.controls.update();
            state.camera.updateMatrixWorld();
            state.invalidate();
          }
          let overflow = 0,
            bytes = 0;
          const sphere = new T.Sphere(),
            matrix = new T.Matrix4();
          for (const mesh of [crowns, trunks]) {
            for (const attribute of Object.values(mesh.geometry.attributes))
              bytes += attribute.array.byteLength;
            bytes +=
              mesh.geometry.index.array.byteLength +
              mesh.instanceMatrix.array.byteLength +
              (mesh.instanceColor?.array.byteLength ?? 0);
            for (let i = 0; i < mesh.count; i++) {
              mesh.getMatrixAt(i, matrix);
              sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
              overflow = Math.max(
                overflow,
                sphere.center.distanceTo(mesh.boundingSphere.center) +
                  sphere.radius -
                  mesh.boundingSphere.radius,
              );
            }
          }
          return {
            count: crowns.count,
            crownTriangles: crowns.geometry.index.count / 3,
            crown: crowns.geometry.uuid,
            trunk: trunks.geometry.uuid,
            texture: crowns.material.map?.uuid,
            overflow,
            bytes,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          };
        }, view);
        await page.waitForTimeout(250);
        await page
          .locator(".track-panel")
          .screenshot({
            path: `artifacts/${prefix}-${track}-${width}-${view.replaceAll(" ", "-")}.png`,
          });
        const render = await page.evaluate(async () => {
          const f = "/node_modules/.vite/deps/@react-three_fiber.js",
            { _roots } = await import(f);
          const gl = _roots
            .get(document.querySelector(".scene canvas"))
            .store.getState().gl;
          return {
            draws: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            textures: gl.info.memory.textures,
          };
        });
        records.push({
          track,
          width,
          view,
          ...metrics,
          ...render,
          errors: [...errors],
          warnings: [...warnings],
        });
        expect(metrics.texture).toBeTruthy();
        expect(metrics.crownTriangles).toBeLessThanOrEqual(384);
        expect(metrics.overflow).toBeLessThan(0.001);
        expect(metrics.pageWidth).toBe(width);
        expect(errors).toEqual([]);
      }
      const own = records.filter(
        (record) => record.track === track && record.width === width,
      );
      expect(new Set(own.map((record) => record.crown)).size).toBe(1);
      expect(new Set(own.map((record) => record.trunk)).size).toBe(1);
      expect(new Set(own.map((record) => record.texture)).size).toBe(1);
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  console.log(`Captured ${records.length} actual foliage/camera states.`);
  await browser.close();
}
