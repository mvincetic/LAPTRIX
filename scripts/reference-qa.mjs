/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
const prefix = process.env.PRESENTATION_QA_PREFIX ?? "reference";

function position(lap, time) {
  const next = lap.samples.findIndex((s) => s.time > time);
  const a =
    lap.samples[next < 0 ? lap.samples.length - 1 : Math.max(0, next - 1)];
  const b = lap.samples[next < 0 ? lap.samples.length - 1 : next];
  const blend = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time);
  return ["x", "y", "z"].map(
    (axis) => a[axis] + (b[axis] - a[axis]) * blend + (axis === "y" ? 0.58 : 0),
  );
}

async function workspace(page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream())
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function snapshot(page) {
  return page.evaluate(async () => {
    const { _roots } =
      await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const { scene, gl } = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    return {
      draws: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      textures: gl.info.memory.textures,
      cars: ["current-ghost", "reference-ghost"].map((name) => {
        const car = scene.getObjectByName(name),
          meshes = [];
        car.traverse((object) => {
          if (!object.isMesh || !object.material.isMeshStandardMaterial) return;
          const material = object.material;
          meshes.push({
            geometry: object.geometry.uuid,
            material: material.uuid,
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
            depthTest: material.depthTest,
            cast: object.castShadow,
            receive: object.receiveShadow,
          });
        });
        return {
          position: car.position.toArray(),
          rotation: car.rotation.toArray(),
          shade: !!car.getObjectByName("vehicle-contact-shade"),
          meshes,
        };
      }),
    };
  });
}

try {
  for (const track of ["ardennes-development", "red-bull-ring"])
    for (const vehicle of ["formula-development", "gt-development"]) {
      const page = await browser.newPage({
          viewport: { width: 1600, height: 1000 },
        }),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("combobox", { name: "Car profile", exact: true })
        .selectOption(vehicle);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Inspect corner 1", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Set reference", exact: true })
        .click();
      await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "Show reference ghost", exact: true })
        .check();
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      for (const phase of ["overlap", "separated"]) {
        if (phase === "separated") {
          await page.getByRole("slider", { name: "Fuel load" }).fill("45");
          await page
            .getByRole("button", { name: "Run Simulation", exact: true })
            .click();
          await expect(
            page.getByRole("button", { name: "Run Simulation", exact: true }),
          ).toBeEnabled();
        }
        const saved = await workspace(page);
        const nativeTime =
          phase === "overlap"
            ? 5
            : saved.lap.samples.find((sample) => {
                const p = position(saved.reference, sample.time);
                const distance = Math.hypot(p[0] - sample.x, p[2] - sample.z);
                return sample.time > 5 && distance > 8 && distance < 18;
              })?.time;
        expect(nativeTime).toBeDefined();
        const time = Number(nativeTime.toFixed(2));
        const expected = [saved.lap, saved.reference].map((lap) =>
          position(lap, time),
        );
        await page
          .getByRole("slider", { name: "Viewer lap position" })
          .fill(String(time));
        await expect
          .poll(async () =>
            (await snapshot(page)).cars.every((car, i) =>
              car.position.every(
                (value, axis) => Math.abs(value - expected[i][axis]) < 1e-7,
              ),
            ),
          )
          .toBe(true);
        const initial = await snapshot(page);
        expect(
          new Set(
            initial.cars.flatMap((car) =>
              car.meshes.map((mesh) => mesh.material),
            ),
          ).size,
        ).toBe(initial.cars.reduce((sum, car) => sum + car.meshes.length, 0));
        for (const width of [1600, 1280, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const camera of ["Chase", "Onboard", "Top View", "3D View"]) {
            await page
              .getByRole("button", { name: camera, exact: true })
              .click();
            await page
              .locator(".track-panel")
              .screenshot({
                path: `artifacts/${prefix}-${track}-${vehicle}-${width}-${phase}-${camera.replaceAll(" ", "-")}.png`,
              });
            const state = await snapshot(page);
            expect(state.cars).toEqual(initial.cars);
            for (const [i, car] of state.cars.entries()) {
              expect(car.shade).toBe(i === 0);
              for (const mesh of car.meshes) {
                expect(mesh.opacity).toBe(i === 0 ? 1 : 0.28);
                expect(mesh.transparent).toBe(i === 1);
                expect(mesh.depthWrite).toBe(i === 0);
                expect(mesh.depthTest).toBe(true);
                expect(mesh.cast).toBe(i === 0);
                expect(mesh.receive).toBe(i === 0);
              }
            }
            expect(
              await page.evaluate(
                () =>
                  document.documentElement.scrollWidth <=
                  document.documentElement.clientWidth,
              ),
            ).toBe(true);
            records.push({
              track,
              vehicle,
              width,
              phase,
              camera,
              time,
              ...state,
              errors: [...errors],
            });
          }
        }
        expect(await workspace(page)).toEqual(saved);
      }
      expect(errors).toEqual([]);
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  await browser.close();
}
