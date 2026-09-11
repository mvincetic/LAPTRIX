import { test, expect, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";
import type { Points } from "three";
import type { OrbitControls } from "three-stdlib";
import { apexPixels } from "../fixtures/apex-pixels";

async function exportProject(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function markers(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = (await import(
      moduleUrl
    )) as typeof import("@react-three/fiber");
    const { scene } = _roots
      .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
      .store.getState();
    const points = scene.getObjectByName("apex-points") as Points | undefined;
    return points
      ? {
          geometry: points.geometry.uuid,
          positions: Array.from(points.geometry.getAttribute("position").array),
        }
      : null;
  });
}

for (const [track, width, ratio] of [
  ["ardennes-development", 1600, 1],
  ["red-bull-ring", 390, 2],
] as const) {
  test.describe(`${track} at ${width}px / DPR ${ratio}`, () => {
    test.use({ viewport: { width, height: 1000 }, deviceScaleFactor: ratio });
    test("apex annotations retain a readable size through close and distant Orbit views", async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
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
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const project = await exportProject(page),
        lap: Lap = project.lap;
      let solves = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) solves++;
      });
      const cursor = page.getByRole("slider", { name: "Viewer lap position" });
      await cursor.fill("5");
      const sample = lap.samples[lap.corners[0].apexIndex];
      await page.getByRole("button", { name: "3D View", exact: true }).click();
      await page
        .getByRole("tab", { name: "Analysis Layers", exact: true })
        .click();
      for (const distance of [1, 0.45, 3]) {
        const before = await markers(page);
        expect(before).not.toBeNull();
        const positions = lap.corners.flatMap(({ apexIndex }) => {
          const apex = lap.samples[apexIndex];
          return [apex.x, apex.y + 0.7, apex.z];
        });
        expect(before!.positions).toHaveLength(positions.length);
        before!.positions.forEach((value, i) =>
          expect(Math.abs(value - positions[i])).toBeLessThan(0.001),
        );
        await page.evaluate(
          async ({ sample, distance }) => {
            const fiberUrl = "/node_modules/.vite/deps/@react-three_fiber.js",
              threeUrl = "/node_modules/.vite/deps/three.js";
            const { _roots } = (await import(
              fiberUrl
            )) as typeof import("@react-three/fiber");
            const { Vector3 } = (await import(
              threeUrl
            )) as typeof import("three");
            const state = _roots
              .get(
                document.querySelector(".scene canvas") as HTMLCanvasElement,
              )!
              .store.getState();
            const controls = state.controls as OrbitControls,
              camera = state.camera;
            controls.enableDamping = false;
            controls.minDistance = 0.1;
            controls.target.set(sample.x, sample.y + 0.7, sample.z);
            camera.position
              .copy(controls.target)
              .add(new Vector3(25, 20, 30).multiplyScalar(distance));
            camera.lookAt(controls.target);
            controls.update();
            camera.updateMatrixWorld();
            state.invalidate();
          },
          { sample, distance },
        );
        await page.waitForTimeout(250);
        expect(await markers(page)).toEqual(before);
        const marker = await apexPixels(page);
        expect(marker).not.toBeNull();
        expect(marker!.width).toBeGreaterThanOrEqual(6);
        expect(marker!.width).toBeLessThanOrEqual(10);
        expect(marker!.height).toBeGreaterThanOrEqual(6);
        expect(marker!.height).toBeLessThanOrEqual(10);
        expect(marker!.distance).toBeLessThan(2);
        await page
          .getByRole("tab", { name: "Track View", exact: true })
          .click();
        await page
          .locator(".track-panel")
          .screenshot({
            path: `artifacts/apex-${track}-${width}-${distance}.png`,
          });
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
      }
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      for (const camera of ["Top View", "Chase", "Onboard", "3D View"]) {
        await page.getByRole("button", { name: camera, exact: true }).click();
        expect(await cursor.getAttribute("value")).toBe("5");
        await expect
          .poll(async () => Boolean(await markers(page)))
          .toBe(camera === "Top View" || camera === "3D View");
        await page
          .locator(".track-panel")
          .screenshot({
            path: `artifacts/apex-${track}-${width}-${camera.replaceAll(" ", "-")}.png`,
          });
      }
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await expect
        .poll(async () => Number(await cursor.getAttribute("value")))
        .toBeGreaterThan(5.3);
      await page
        .getByRole("button", { name: "Pause viewer lap", exact: true })
        .click();
      expect(await exportProject(page)).toEqual(project);
      expect(solves).toBe(0);
      expect(errors).toEqual([]);
    });
  });
}
