import { expect, test } from "@playwright/test";

for (const width of [1600, 390])
  test(`context instances remain inside their actual culling bounds after source changes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Onboard", exact: true }).click();
    for (const [id, name] of [
      ["red-bull-ring", "Red Bull Ring"],
      ["ardennes-development", "LAPTRIX Dev Track"],
    ]) {
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(id);
      await expect(page.locator(".track-caption strong")).toHaveText(name);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await page
        .getByRole("slider", { name: "Viewer lap position" })
        .fill("40");
      // Read existing development objects without modifying their matrices or bounds.
      const bounds = await page.evaluate(async () => {
        const fiberPath = "/node_modules/.vite/deps/@react-three_fiber.js";
        const threePath = "/node_modules/.vite/deps/three.js";
        const { _roots } = await import(fiberPath);
        const { InstancedMesh, Matrix4, Sphere } = (await import(
          threePath
        )) as typeof import("three");
        const { scene } = _roots
          .get(document.querySelector(".scene canvas"))
          .store.getState() as { scene: import("three").Scene };
        const result: { count: number; overflow: number }[] = [];
        const matrix = new Matrix4(),
          sphere = new Sphere();
        scene.traverse((node) => {
          if (
            !(node instanceof InstancedMesh) ||
            !node.name.startsWith("context-") ||
            !node.count
          )
            return;
          if (!node.boundingSphere || !node.geometry.boundingSphere)
            throw new Error("Presented instances have no culling sphere.");
          let overflow = 0;
          for (let i = 0; i < node.count; i++) {
            node.getMatrixAt(i, matrix);
            sphere.copy(node.geometry.boundingSphere).applyMatrix4(matrix);
            overflow = Math.max(
              overflow,
              sphere.center.distanceTo(node.boundingSphere.center) +
                sphere.radius -
                node.boundingSphere.radius,
            );
          }
          result.push({ count: node.count, overflow });
        });
        return result;
      });
      expect(bounds.length).toBe(4);
      for (const batch of bounds) {
        expect(batch.count).toBeGreaterThan(100);
        expect(batch.overflow).toBeLessThan(0.001);
      }
    }
  });
