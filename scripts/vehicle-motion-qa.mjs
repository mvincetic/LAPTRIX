/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

// Read-only inspection of the installed development renderer; no app test hook.
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
const prefix = process.env.PRESENTATION_QA_PREFIX ?? "vehicle-motion";
try {
  for (const track of ["ardennes-development", "red-bull-ring"].filter(
    (id) => !process.env.QA_TRACK || process.env.QA_TRACK === id,
  ))
    for (const vehicle of ["formula-development", "gt-development"]) {
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      });
      const errors = [];
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
      await page.getByRole("button", { name: "Additional actions" }).click();
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Export project", exact: true })
        .click();
      const chunks = [];
      for await (const chunk of await (await pending).createReadStream())
        chunks.push(chunk);
      const project = JSON.parse(Buffer.concat(chunks).toString());
      const lap = project.lap;
      expect(lap.trackId).toBe(track);
      expect(lap.vehicleId).toBe(vehicle);
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      const cursor = page.getByRole("slider", {
        name: "Lap playback position",
      });
      for (const width of [1600, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const fraction of [0, 0.05, 0.15, 0.3, 0.5, 0.7, 0.9, 1]) {
          await cursor.fill(
            String(Math.floor(lap.lapTime * fraction * 100) / 100),
          );
          const time = Number(await cursor.getAttribute("value"));
          const next = lap.samples.findIndex((s) => s.time > time);
          const a =
            lap.samples[
              next < 0 ? lap.samples.length - 1 : Math.max(0, next - 1)
            ];
          const b = lap.samples[next < 0 ? lap.samples.length - 1 : next];
          const blend =
            b.time === a.time ? 0 : (time - a.time) / (b.time - a.time);
          const distance = a.distance + (b.distance - a.distance) * blend;
          const steering = a.steering + (b.steering - a.steering) * blend;
          let pose;
          await expect
            .poll(async () => {
              pose = await page.evaluate(async () => {
                const { _roots } =
                  await import("/node_modules/.vite/deps/@react-three_fiber.js");
                const { Box3, Vector3 } =
                  await import("/node_modules/.vite/deps/three.js");
                const { scene, camera, gl } = _roots
                  .get(document.querySelector(".scene canvas"))
                  .store.getState();
                const car = scene.getObjectByName("current-ghost");
                const body = car.getObjectByName("vehicle-body");
                const wheels = body.children.slice(-4);
                const bounds = new Box3().setFromObject(body);
                const projection = [];
                for (const x of [bounds.min.x, bounds.max.x])
                  for (const y of [bounds.min.y, bounds.max.y])
                    for (const z of [bounds.min.z, bounds.max.z])
                      projection.push(
                        new Vector3(x, y, z).project(camera).toArray(),
                      );
                return {
                  scale: car.scale.toArray(),
                  position: car.position.toArray(),
                  rotation: car.rotation.toArray(),
                  fov: camera.fov,
                  wheels: wheels.map((wheel) => ({
                    axle: wheel.position.z,
                    steering: wheel.rotation.y,
                    spin: wheel.children[0].rotation.x,
                  })),
                  projection,
                  calls: gl.info.render.calls,
                  triangles: gl.info.render.triangles,
                };
              });
              return Math.abs(
                pose.wheels[0].spin - distance / project.vehicle.wheelRadius,
              );
            })
            .toBeLessThan(1e-8);
          expect(pose.scale).toEqual([1, 1, 1]);
          expect(pose.fov).toBe(55);
          expect(pose.wheels).toHaveLength(4);
          for (const wheel of pose.wheels) {
            expect(wheel.spin).toBeCloseTo(
              distance / project.vehicle.wheelRadius,
              8,
            );
            expect(wheel.steering).toBeCloseTo(
              wheel.axle > 0 ? steering : 0,
              8,
            );
          }
          expect(errors).toEqual([]);
          await page.locator(".track-panel").screenshot({
              path: `artifacts/${prefix}-${track}-${vehicle}-${width}-${fraction}.png`,
          });
          records.push({
            track,
            vehicle,
            width,
            fraction,
            time,
            distance,
            steering,
            ...pose,
          });
          for (const point of pose.projection)
            expect(
              Math.max(...point.map(Math.abs)),
              `${track} ${vehicle} ${width}px at ${fraction}`,
            ).toBeLessThan(1);
        }
      }
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(records, null, 2),
  );
  await browser.close();
}
process.stdout.write(
  `Verified ${records.length} actual camera and vehicle poses.\n`,
);
