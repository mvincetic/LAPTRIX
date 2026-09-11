import { test, expect, type Page } from "@playwright/test";
import type { InstancedMesh } from "three";

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

async function assets(page: Page) {
  return page.evaluate(async () => {
    const fiberUrl = "/node_modules/.vite/deps/@react-three_fiber.js",
      threeUrl = "/node_modules/.vite/deps/three.js";
    const { _roots } = (await import(
      fiberUrl
    )) as typeof import("@react-three/fiber");
    const { Matrix4, Vector3, Quaternion } = (await import(
      threeUrl
    )) as typeof import("three");
    const state = _roots
      .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
      .store.getState();
    const group = state.scene.getObjectByName("original-trackside-assets");
    return (
      group?.children.map((object) => {
        const mesh = object as InstancedMesh;
        return {
          name: mesh.name,
          geometry: mesh.geometry.uuid,
          instances: Array.from({ length: mesh.count }, (_, i) => {
            const matrix = new Matrix4(),
              position = new Vector3(),
              scale = new Vector3();
            mesh.getMatrixAt(i, matrix);
            matrix.decompose(position, new Quaternion(), scale);
            return { position: position.toArray(), scale: scale.toArray() };
          }),
        };
      }) ?? []
    );
  });
}

for (const [width, failFirst] of [
  [1600, false],
  [390, true],
] as const) {
  test(`original Dev Track assets retain state and recover from optional load failure at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [],
      warnings: string[] = [];
    let downloads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text());
    });
    await page.route("**/*.glb*", async (route) => {
      if (route.request().resourceType() === "fetch") {
        downloads++;
        if (failFirst && downloads === 1)
          return route.fulfill({ status: 503, body: "Unavailable" });
      }
      return route.continue();
    });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    if (failFirst) {
      await expect
        .poll(() =>
          warnings.some((warning) =>
            warning.includes("Trackside scenery could not load"),
          ),
        )
        .toBe(true);
      expect(await assets(page)).toEqual([]);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
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
    }
    await expect.poll(async () => (await assets(page)).length).toBe(4);
    const beforeAssets = await assets(page);
    expect(beforeAssets.every((part) => part.instances.length === 2)).toBe(
      true,
    );
    for (const part of beforeAssets.filter(
      (part) => part.name !== "asset-foundations",
    ))
      for (const instance of part.instances)
        for (const scale of instance.scale) expect(scale).toBeCloseTo(1, 6);
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    const before = await exportProject(page);
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    for (const camera of ["Chase", "Onboard", "Top View", "3D View"]) {
      await page.getByRole("button", { name: camera, exact: true }).click();
      expect(await assets(page)).toEqual(beforeAssets);
      expect(await cursor.getAttribute("value")).toBe("5");
    }
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("tab", { name: "Analysis Layers", exact: true })
        .click();
      const environment = page.getByRole("checkbox", {
        name: "Environment",
        exact: true,
      });
      await environment.uncheck();
      await expect.poll(async () => (await assets(page)).length).toBe(0);
      await environment.check();
      await expect.poll(async () => (await assets(page)).length).toBe(4);
      const next = await assets(page);
      expect(next.filter((part) => part.name !== "asset-foundations")).toEqual(
        beforeAssets.filter((part) => part.name !== "asset-foundations"),
      );
    }
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page
      .getByRole("button", { name: "Play viewer lap", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.getAttribute("value")))
      .toBeGreaterThan(5.3);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    expect(await exportProject(page)).toEqual(before);
    expect(solves).toBe(0);
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect.poll(async () => (await assets(page)).length).toBe(0);
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("ardennes-development");
    await expect.poll(async () => (await assets(page)).length).toBe(4);
    expect(
      (await assets(page)).filter((part) => part.name !== "asset-foundations"),
    ).toEqual(beforeAssets.filter((part) => part.name !== "asset-foundations"));
    expect(downloads).toBe(failFirst ? 2 : 1);
    expect(errors).toEqual([]);
  });
}
