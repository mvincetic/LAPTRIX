import { expect, test, type Page } from "@playwright/test";
import type { DirectionalLight, Mesh, DataTexture } from "three";

async function lighting(page: Page, instrument = false) {
  return page.evaluate(async (instrument) => {
    const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = (await import(
      moduleUrl
    )) as typeof import("@react-three/fiber");
    const state = _roots
      .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
      .store.getState();
    const { scene, gl } = state;
    const sun = scene.getObjectByName("daylight-sun") as DirectionalLight & {
      qaShadowPasses?: number;
    };
    if (instrument && sun.qaShadowPasses === undefined) {
      sun.qaShadowPasses = 0;
      const update = sun.shadow.updateMatrices.bind(sun.shadow);
      sun.shadow.updateMatrices = (...args) => {
        sun.qaShadowPasses!++;
        return update(...args);
      };
    }
    const environment = scene.environment as DataTexture;
    const cars = ["current-ghost", "reference-ghost"].map((name) => {
      const car = scene.getObjectByName(name),
        casters: string[] = [];
      car?.traverse((object) => {
        if ((object as Mesh).isMesh && object.castShadow)
          casters.push(object.uuid);
      });
      return { position: car?.position.toArray(), casters };
    });
    return {
      environment: environment.uuid,
      bytes: environment.image.data!.byteLength,
      map: sun.shadow.map?.texture.uuid,
      mapSize: sun.shadow.mapSize.toArray(),
      autoUpdate: sun.shadow.autoUpdate,
      shadowPasses: sun.qaShadowPasses ?? 0,
      target: sun.target.position.toArray(),
      direction: sun.position
        .clone()
        .sub(sun.target.position)
        .normalize()
        .toArray(),
      textures: gl.info.memory.textures,
      cars,
    };
  }, instrument);
}

async function project(page: Page) {
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

for (const [track, vehicle, width] of [
  ["ardennes-development", "formula-development", 1600],
  ["red-bull-ring", "gt-development", 390],
] as const) {
  test(`daylight shadows follow the current car and reuse paused resources on ${track}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
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
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page),
      cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    await expect.poll(async () => (await lighting(page)).map).toBeTruthy();
    const initial = await lighting(page, true);
    expect(initial.bytes).toBe(131072);
    expect(initial.mapSize).toEqual([1024, 1024]);
    expect(initial.autoUpdate).toBe(false);
    expect(initial.cars[0].casters.length).toBeGreaterThan(40);
    expect(initial.cars[1].casters).toEqual([]);
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    for (const camera of ["Chase", "Onboard", "Top View", "3D View"]) {
      await page.getByRole("button", { name: camera, exact: true }).click();
      const next = await lighting(page);
      expect(next.environment).toBe(initial.environment);
      expect(next.map).toBe(initial.map);
      expect(next.shadowPasses).toBe(initial.shadowPasses);
      expect(next.direction).toEqual(initial.direction);
      expect(next.cars).toEqual(initial.cars);
      expect(next.target).toEqual(next.cars[0].position);
      expect(next.textures).toBeLessThanOrEqual(initial.textures);
      expect(await cursor.getAttribute("value")).toBe("5");
    }
    for (const time of [20, 60, 5]) {
      const prior = await lighting(page);
      await cursor.fill(String(time));
      await expect
        .poll(async () => (await lighting(page)).shadowPasses)
        .toBeGreaterThan(prior.shadowPasses);
      const next = await lighting(page);
      expect(next.target).toEqual(next.cars[0].position);
      expect(next.map).toBe(initial.map);
      expect(next.environment).toBe(initial.environment);
      next.direction.forEach((v, i) =>
        expect(v).toBeCloseTo(initial.direction[i], 10),
      );
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
    await expect
      .poll(async () => {
        const next = await lighting(page);
        return (
          JSON.stringify(next.target) === JSON.stringify(next.cars[0].position)
        );
      })
      .toBe(true);
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    const current = page.getByRole("checkbox", {
      name: "Show current ghost",
      exact: true,
    });
    await current.uncheck();
    await expect
      .poll(async () => (await lighting(page)).cars[0].position)
      .toBeUndefined();
    await current.check();
    await expect
      .poll(async () => (await lighting(page)).cars[0].casters.length)
      .toBeGreaterThan(40);
    const final = await lighting(page);
    expect(final.map).toBe(initial.map);
    expect(final.environment).toBe(initial.environment);
    expect(final.target).toEqual(final.cars[0].position);
    expect(await project(page)).toEqual(before);
    expect(solves).toBe(0);
    // A newly calculated circuit can keep the same group and zero clock time.
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await cursor.fill("0");
    const sourceAnchor = (await lighting(page)).target;
    for (const nextTrack of [
      track === "red-bull-ring" ? "ardennes-development" : "red-bull-ring",
      track,
    ]) {
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(nextTrack);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect
        .poll(async () => {
          const next = await lighting(page);
          return (
            JSON.stringify(next.target) ===
            JSON.stringify(next.cars[0].position)
          );
        })
        .toBe(true);
      const next = await lighting(page);
      expect(next.map).toBe(initial.map);
      expect(next.environment).toBe(initial.environment);
      expect(await cursor.getAttribute("value")).toBe("0");
      if (nextTrack !== track) expect(next.target).not.toEqual(sourceAnchor);
    }
    expect(errors).toEqual([]);
  });
}
