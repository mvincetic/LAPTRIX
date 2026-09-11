import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { Box3, Raycaster, Vector3, type Mesh, type Material } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import asset from "../../assets/trackside/dev-start-pylon.json";

it("the exported pylon keeps metre scale and readable painted lettering on both faces", async () => {
  const bytes = await readFile(
    new URL("../../assets/trackside/dev-start-pylon.glb", import.meta.url),
  );
  const model = await new GLTFLoader().parseAsync(
    Uint8Array.from(bytes).buffer,
    "",
  );
  model.scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model.scene);
  expect(bounds.min.y).toBeCloseTo(0, 6);
  expect(bounds.max.y).toBeCloseTo(4.2, 6);
  expect(bounds.max.x - bounds.min.x).toBeCloseTo(2.6, 6);
  expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.8, 6);
  const ray = new Raycaster();
  for (const side of [1, -1]) {
    const label = asset.labels.find((label) => label.text === "DEV")!;
    const scale = label.width / (2 * asset.letterAdvance + asset.letterWidth);
    for (const [x, material] of [
      [0.1, "pylon-frame"],
      [0.35, "pylon-face"],
    ] as const) {
      // A ray through D's stem must meet its dark paint; its hole must show the white face.
      ray.set(
        new Vector3(
          side * (-label.width / 2 + x * scale),
          label.y + label.height / 2,
          side * 10,
        ),
        new Vector3(0, 0, -side),
      );
      const hit = ray.intersectObject(model.scene, true)[0];
      expect(((hit.object as Mesh).material as Material).name).toBe(material);
    }
  }
  model.scene.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (mesh.material as Material).dispose();
    }
  });
});
