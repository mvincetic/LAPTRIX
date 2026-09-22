import { expect, test, type Page } from "@playwright/test";
import type { InstancedMesh, MeshStandardMaterial } from "three";

async function trees(page: Page) {
  return page.evaluate(async () => {
    const f = "/node_modules/.vite/deps/@react-three_fiber.js",
      t = "/node_modules/.vite/deps/three.js";
    const { _roots } = (await import(f)) as typeof import("@react-three/fiber");
    const { Matrix4, Sphere } = (await import(t)) as typeof import("three");
    const root = _roots.get(
      document.querySelector(".scene canvas") as HTMLCanvasElement,
    );
    if (!root) return null;
    const { scene, gl } = root.store.getState();
    const crowns = scene.getObjectByName("context-tree-crowns") as
        InstancedMesh | undefined,
      trunks = scene.getObjectByName("context-tree-trunks") as
        InstancedMesh | undefined;
    if (!crowns || !trunks) return null;
    const map = (crowns.material as MeshStandardMaterial).map;
    let overflow = 0;
    const matrix = new Matrix4(),
      sphere = new Sphere();
    for (const mesh of [crowns, trunks])
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix);
        overflow = Math.max(
          overflow,
          sphere.center.distanceTo(mesh.boundingSphere!.center) +
            sphere.radius -
            mesh.boundingSphere!.radius,
        );
      }
    return {
      count: crowns.count,
      sceneryReady: !!scene.getObjectByName("RBR_SLICE_ROOT"),
      devSceneryReady: [
        "pylon-frame",
        "pylon-face",
        "pylon-blue",
        "asset-foundations",
      ].every(
        (name) =>
          (scene.getObjectByName(name) as InstancedMesh | undefined)?.count ===
          2,
      ),
      geometry: crowns.geometry.uuid,
      trunk: trunks.geometry.uuid,
      texture: map?.uuid,
      size: map
        ? [
            (map.image as HTMLImageElement).width,
            (map.image as HTMLImageElement).height,
          ]
        : [],
      triangles: crowns.geometry.index!.count / 3,
      overflow,
      textures: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
      matrices: Array.from(crowns.instanceMatrix.array),
      trunkMatrices: Array.from(trunks.instanceMatrix.array),
      castShadow: crowns.castShadow || trunks.castShadow,
    };
  });
}

async function settledScenery(page: Page, track: string) {
  await expect
    .poll(async () => (await trees(page))?.sceneryReady)
    .toBe(track === "red-bull-ring");
  await expect
    .poll(async () => (await trees(page))?.devSceneryReady)
    .toBe(track === "ardennes-development");
  // Mounting the async asset is not the same as uploading its geometry. Compare
  // memory only after the complete scene has actually been drawn.
  await page.evaluate(async () => {
    const url = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots, addAfterEffect } = (await import(
      url
    )) as typeof import("@react-three/fiber");
    const root = _roots.get(
      document.querySelector(".scene canvas") as HTMLCanvasElement,
    )!;
    await new Promise<void>((resolve) => {
      const stop = addAfterEffect(() => {
        stop();
        resolve();
      });
      root.store.getState().invalidate();
    });
  });
}

for (const [track, width] of [
  ["ardennes-development", 1600],
  ["red-bull-ring", 390],
] as const) {
  test(`foliage retains bounded instances and shared resources through cameras and sources at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    let downloads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        request.resourceType() === "fetch" &&
        /\/spruce(?:-[a-zA-Z0-9_-]+)?\.glb/.test(request.url())
      )
        downloads++;
    });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption(track);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect.poll(async () => (await trees(page))?.texture).toBeTruthy();
    await settledScenery(page, track);
    const before = (await trees(page))!;
    expect(before.count).toBe(track === "red-bull-ring" ? 473 : 383);
    expect(before.triangles).toBe(544);
    expect(before.size).toEqual([512, 512]);
    expect(before.overflow).toBeLessThan(0.001);
    expect(before.castShadow).toBe(false);
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    for (const camera of ["Chase", "Onboard", "Top View", "3D View"]) {
      await page.getByRole("button", { name: camera, exact: true }).click();
      const after = (await trees(page))!;
      expect(after.geometry).toBe(before.geometry);
      expect(after.trunk).toBe(before.trunk);
      expect(after.texture).toBe(before.texture);
      expect(after.matrices).toEqual(before.matrices);
      expect(after.trunkMatrices).toEqual(before.trunkMatrices);
      expect(after.overflow).toBeLessThan(0.001);
      expect(await cursor.getAttribute("value")).toBe("5");
    }
    const alpha = await page.evaluate(async () => {
      const f = "/node_modules/.vite/deps/@react-three_fiber.js";
      const { _roots } = (await import(
        f
      )) as typeof import("@react-three/fiber");
      const state = _roots
        .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
        .store.getState();
      const image = (
        (state.scene.getObjectByName("context-tree-crowns") as InstancedMesh)
          .material as MeshStandardMaterial
      ).map!.image as HTMLImageElement;
      const canvas = new OffscreenCanvas(512, 512),
        context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, 512, 512).data;
      let transparent = 0,
        covered = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
        if (pixels[i] >= 230) covered++;
      }
      // TextureLoader flips the source image vertically for the mesh's UV coordinates.
      const core =
        (Math.floor((1 - 0.48) * 512) * 512 + Math.floor(0.32 * 512)) * 4;
      let patchCovered = 0,
        patchPixels = 0;
      for (
        let y = Math.floor((1 - 0.48 - 0.07) * 512);
        y < Math.ceil((1 - 0.48 + 0.07) * 512);
        y++
      )
        for (
          let x = Math.floor((0.32 - 0.12) * 512);
          x < Math.ceil((0.32 + 0.12) * 512);
          x++
        ) {
          patchPixels++;
          if (pixels[(y * 512 + x) * 4 + 3] >= 115) patchCovered++;
        }
      return {
        transparent,
        covered,
        core: pixels[core + 3],
        patchCoverage: patchCovered / patchPixels,
      };
    });
    expect(alpha.transparent).toBeGreaterThan(100000);
    expect(alpha.covered).toBeGreaterThan(40000);
    expect(alpha.core).toBeGreaterThanOrEqual(230);
    expect(alpha.patchCoverage).toBeGreaterThan(0.95);
    for (const id of [
      track === "red-bull-ring" ? "ardennes-development" : "red-bull-ring",
      track,
    ]) {
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(id);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await settledScenery(page, id);
      await expect
        .poll(async () => (await trees(page))?.count)
        .toBe(id === "red-bull-ring" ? 473 : 383);
      const after = (await trees(page))!;
      expect(after.texture).toBe(before.texture);
      expect(after.overflow).toBeLessThan(0.001);
      if (id === track) expect(after.matrices).toEqual(before.matrices);
    }
    const warmed = (await trees(page))!;
    let priorGeometry = warmed.geometry;
    for (let cycle = 0; cycle < 3; cycle++) {
      await page
        .getByRole("tab", { name: "Analysis Layers", exact: true })
        .click();
      const environment = page.getByRole("checkbox", {
        name: "Environment",
        exact: true,
      });
      await environment.uncheck();
      await environment.check();
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      await settledScenery(page, track);
      await expect.poll(async () => (await trees(page))?.triangles).toBe(544);
      await expect
        .poll(async () => (await trees(page))?.geometry)
        .not.toBe(priorGeometry);
      await expect
        .poll(async () => (await trees(page))?.geometries)
        .toBe(warmed.geometries);
      await expect
        .poll(async () => (await trees(page))?.textures)
        .toBe(warmed.textures);
      const restored = (await trees(page))!;
      expect(restored.texture).toBe(warmed.texture);
      expect(restored.matrices).toEqual(warmed.matrices);
      expect(restored.trunkMatrices).toEqual(warmed.trunkMatrices);
      priorGeometry = restored.geometry;
    }
    expect(downloads).toBe(1);
    expect(errors).toEqual([]);
  });
}
