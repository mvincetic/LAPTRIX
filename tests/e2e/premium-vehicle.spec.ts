import { expect, test, type Page } from "@playwright/test";
import type { Mesh, Object3D } from "three";

async function selectGT(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Track", exact: true })
    .selectOption("red-bull-ring");
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await expect(
    page.getByRole("button", { name: "Inspect corner 1", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chase", exact: true }).click();
}

async function inspect(page: Page) {
  return page.evaluate(async () => {
    const url = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = (await import(
      url
    )) as typeof import("@react-three/fiber");
    const state = _roots
      .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
      .store.getState();
    const car = state.scene.getObjectByName("current-ghost")!;
    const root = car.getObjectByName("GT_ROOT");
    const wheels = root
      ? ["FR", "FL", "RR", "RL"].map((label) =>
          root.getObjectByName(`SPIN_${label}`)!,
        )
      : [];
    const geometry: string[] = [];
    const materials: string[] = [];
    car.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        geometry.push(mesh.geometry.uuid);
        materials.push(
          ...(Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).map((m) => m.uuid),
        );
      }
    });
    return {
      premium: !!root,
      position: car.position.toArray(),
      spins: wheels.map((w) => w.rotation.x),
      geometry,
      materials,
      fallbackLamp: !!car.getObjectByName("gt-brake-lamp-0"),
      textures: state.gl.info.memory.textures,
    };
  });
}

test("a delayed Blender GT joins native playback without changing the lap or requesting another solve", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/runtime/vehicles/gt.glb*", async (route) => {
    // Vite also serves a JS ?import&url wrapper here; delay only the binary fetch.
    if (route.request().resourceType() !== "fetch") return route.continue();
    await held;
    await route.continue();
  });
  await selectGT(page);
  expect((await inspect(page)).fallbackLamp).toBe(true);
  const cursor = page.getByRole("slider", { name: "Viewer lap position" });
  const lap = await page.getByTestId("lap-time").textContent();
  let solves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) solves++;
  });
  await cursor.fill("5");
  await page
    .getByRole("button", { name: "Play viewer lap", exact: true })
    .click();
  await expect
    .poll(async () => Number(await cursor.getAttribute("value")))
    .toBeGreaterThan(5.2);
  release();
  await expect.poll(async () => (await inspect(page)).premium).toBe(true);
  await page
    .getByRole("button", { name: "Pause viewer lap", exact: true })
    .click();
  await expect
    .poll(async () => (await inspect(page)).spins.every((value) => value > 100))
    .toBe(true);
  const first = await inspect(page);
  expect(first.fallbackLamp).toBe(false);
  expect(first.geometry.length).toBeGreaterThan(4);
  expect(first.geometry.length).toBeLessThanOrEqual(48);
  await cursor.fill("8");
  await expect
    .poll(async () => (await inspect(page)).spins[0])
    .not.toBe(first.spins[0]);
  const later = await inspect(page);
  expect(later.geometry).toEqual(first.geometry);
  expect(later.materials).toEqual(first.materials);
  expect(later.textures).toBe(first.textures);
  expect(await page.getByTestId("lap-time").textContent()).toBe(lap);
  expect(solves).toBe(0);
  expect(errors).toEqual([]);
});

test("failed premium delivery keeps a working GT and retries after the viewer is restored", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/assets/runtime/vehicles/gt.glb*", (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue();
  });
  await selectGT(page);
  await expect.poll(() => attempts).toBe(1);
  await expect.poll(async () => (await inspect(page)).fallbackLamp).toBe(true);
  await page.getByRole("slider", { name: "Viewer lap position" }).fill("6");
  const first = await inspect(page);
  expect(first.premium).toBe(false);
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("formula-development");
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "Formula Development 01",
  );
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await expect.poll(async () => (await inspect(page)).premium).toBe(true);
  expect(attempts).toBe(2);
  await page.getByRole("button", { name: "Onboard", exact: true }).click();
  await page.getByRole("button", { name: "Chase", exact: true }).click();
  expect((await inspect(page)).premium).toBe(true);
  expect(attempts).toBe(2);
});
