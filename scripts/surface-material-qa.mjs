/* global document */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const prefix = process.env.PRESENTATION_QA_PREFIX ?? "surface-material";
const browser = await chromium.launch({
  args: ["--enable-gpu", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
try {
  for (const vehicle of ["gt-development", "formula-development"]) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption(vehicle);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await page.waitForFunction(async (vehicle) => {
      const { _roots } =
        await import("/node_modules/.vite/deps/@react-three_fiber.js");
      const root = _roots.get(document.querySelector(".scene canvas"));
      if (!root) return false;
      const scene = root.store.getState().scene;
      return (
        !!scene.getObjectByName("RBR_SLICE_ROOT") &&
        !!scene
          .getObjectByName("current-ghost")
          ?.getObjectByName(
            vehicle === "gt-development" ? "GT_ROOT" : "FORMULA26_ROOT",
          )
      );
    }, vehicle);
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const time of [0, 6])
        for (const camera of ["3D View", "Chase", "Onboard", "Top View"]) {
          await page.getByRole("button", { name: camera, exact: true }).click();
          await page
            .getByRole("slider", { name: "Viewer lap position" })
            .fill(String(time));
          await page.waitForTimeout(200);
          const file = `artifacts/${prefix}-${vehicle}-${width}-${time}-${camera.replaceAll(" ", "-")}.png`;
          await page.locator(".track-panel").screenshot({ path: file });
          const measured = await page.evaluate(async () => {
            const { _roots } =
              await import("/node_modules/.vite/deps/@react-three_fiber.js");
            const { scene, gl } = _roots
              .get(document.querySelector(".scene canvas"))
              .store.getState();
            const context = gl.getContext(),
              debug = context.getExtension("WEBGL_debug_renderer_info");
            const ground = [
              "road-asphalt",
              "road-shoulders",
              "context-terrain",
              "road-earthworks",
              "REGIONAL_TERRAIN_LOD0",
            ].map((name) => {
              const mesh = scene.getObjectByName(name),
                mat = mesh.material;
              return {
                name,
                material: mat.name,
                map: mat.map?.uuid,
                normal: mat.normalMap?.uuid,
                image: [mat.map?.image.width, mat.map?.image.height],
                visible: mesh.visible,
              };
            });
            return {
              calls: gl.info.render.calls,
              triangles: gl.info.render.triangles,
              textures: gl.info.memory.textures,
              renderer: context.getParameter(
                debug?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER,
              ),
              ground,
              fog: scene.fog
                ? {
                    color: scene.fog.color.getHexString(),
                    near: scene.fog.near,
                    far: scene.fog.far,
                  }
                : null,
            };
          });
          expect(measured.ground.every((m) => m.map && m.normal)).toBe(true);
          expect(measured.ground[2].visible).toBe(false);
          expect(measured.ground[4].map).toBe(measured.ground[3].map);
          expect(measured.fog).toEqual({
            color: "edf2f5",
            near: 600,
            far: 5500,
          });
          expect(errors).toEqual([]);
          records.push({
            track: "red-bull-ring",
            vehicle,
            width,
            height: 1000,
            time,
            camera,
            file,
            ...measured,
            errors: [...errors],
          });
        }
    }
    await page.close();
  }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2) + "\n",
  );
  await browser.close();
}
console.log(
  `Reviewed ${records.length} material/camera states in the actual app.`,
);
