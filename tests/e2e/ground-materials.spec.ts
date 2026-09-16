import { expect, test, type Page } from "@playwright/test";
import type { Mesh, MeshStandardMaterial } from "three";

async function surfaces(page: Page) {
  return page.evaluate(async () => {
    const path = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = (await import(
      path
    )) as typeof import("@react-three/fiber");
    const root = _roots.get(
      document.querySelector(".scene canvas") as HTMLCanvasElement,
    );
    if (!root) return { ready: false, meshes: [], textures: 0 };
    const { scene, gl } = root.store.getState();
    const names = [
      "road-asphalt",
      "road-shoulders",
      "context-terrain",
      "road-earthworks",
    ];
    const meshes = await Promise.all(
      names.map(async (name) => {
        const mesh = scene.getObjectByName(name) as Mesh | undefined;
        if (!mesh) return null;
        const material = mesh.material as MeshStandardMaterial,
          geometry = mesh.geometry;
        const positions = geometry.getAttribute("position"),
          uv = geometry.getAttribute("uv");
        const digest = async (values: ArrayLike<number>) =>
          Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new Float32Array(Array.from(values)).buffer,
              ),
            ),
          ).join(",");
        const tile =
          name.includes("road-a") || name === "road-shoulders" ? 2 : 8;
        let uvError = 0;
        if (material.normalMap)
          for (let i = 0; i < positions.count; i++) {
            uvError = Math.max(
              uvError,
              Math.abs(uv.getX(i) - positions.getX(i) / tile),
              Math.abs(uv.getY(i) - (1 - positions.getZ(i) / tile)),
            );
          }
        return {
          name,
          geometry: geometry.uuid,
          position: "id" in positions ? positions.id : null,
          uv: "id" in uv ? uv.id : null,
          positionHash: await digest(positions.array),
          indexHash: geometry.index ? await digest(geometry.index.array) : null,
          uvHash: await digest(uv.array),
          uvError,
          map: material.map?.uuid,
          normal: material.normalMap?.uuid,
          image: material.map
            ? [
                (material.map.image as ImageBitmap).width,
                (material.map.image as ImageBitmap).height,
              ]
            : [],
          material: material.name,
        };
      }),
    );
    return {
      ready: !!scene.getObjectByName("RBR_SLICE_ROOT"),
      meshes,
      textures: gl.info.memory.textures,
    };
  });
}

for (const width of [1600, 390])
  test(`authored ground retains road geometry, shared maps and source isolation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await expect.poll(async () => (await surfaces(page)).ready).toBe(true);
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("3");
    const before = await surfaces(page);
    expect(before.meshes.every((m) => m?.normal && m.uvError < 0.0001)).toBe(
      true,
    );
    expect(before.meshes[0]!.image).toEqual([512, 512]);
    expect(before.meshes[2]!.map).toBe(before.meshes[3]!.map);
    expect(before.meshes[0]!.normal).toBe(before.meshes[1]!.normal);
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    const environment = page.getByRole("checkbox", {
      name: "Environment",
      exact: true,
    });
    for (let repeat = 0; repeat < 3; repeat++) {
      await environment.uncheck();
      const fallback = await surfaces(page);
      expect(fallback.ready).toBe(false);
      expect(fallback.meshes[0]!.normal).toBeUndefined();
      expect(fallback.meshes[0]!.uvHash).not.toBe(before.meshes[0]!.uvHash);
      await environment.check();
      await expect.poll(async () => (await surfaces(page)).ready).toBe(true);
      const after = await surfaces(page);
      for (let i = 0; i < 2; i++) {
        expect(after.meshes[i]).toEqual(before.meshes[i]);
        expect(fallback.meshes[i]!.positionHash).toBe(
          before.meshes[i]!.positionHash,
        );
        expect(fallback.meshes[i]!.indexHash).toBe(before.meshes[i]!.indexHash);
      }
      expect(after.textures).toBeLessThanOrEqual(before.textures);
    }
    expect(await cursor.getAttribute("value")).toBe("3");
    expect(solves).toBe(0);
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("ardennes-development");
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    const dev = await surfaces(page);
    expect(dev.ready).toBe(false);
    expect(dev.meshes.every((m) => !m?.normal)).toBe(true);
    expect(errors).toEqual([]);
  });
