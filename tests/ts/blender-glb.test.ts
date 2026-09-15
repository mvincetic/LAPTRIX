import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Box3, Matrix4, Vector3, type Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  inspectBlenderGlb,
  ownedAssetPath,
} from "../../scripts/blender-glb.mjs";
import config from "../../assets/blender/shared/basis-gauge.json";

const bytes = readFileSync(
  new URL("../../assets/runtime/validation/basis-gauge.glb", import.meta.url),
);
const document = JSON.parse(
  bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
);
const binStart = 28 + bytes.readUInt32LE(12);

function changedDocument(edit: (json: typeof document) => void) {
  const json = structuredClone(document);
  edit(json);
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 0x20);
  text.copy(padded);
  const result = Buffer.alloc(28 + padded.length + bytes.length - binStart);
  bytes.copy(result, 0, 0, 12);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded.length, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(result, 20);
  result.writeUInt32LE(bytes.length - binStart, 20 + padded.length);
  result.writeUInt32LE(0x004e4942, 24 + padded.length);
  bytes.copy(result, 28 + padded.length, binStart);
  return result;
}

describe("Blender export contract", () => {
  it("rejects a sheared wheel/axis frame even when its determinant and pivot remain correct", () => {
    const sheared = changedDocument((json) => {
      const node = json.nodes.find(
        (node: { name: string }) => node.name === "X_LEFT",
      );
      delete node.translation;
      node.matrix = [1, 0, 0, 0, 0.2, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1];
    });
    expect(() => inspectBlenderGlb(sheared, config)).toThrow();
  });
  it("reimports the actual Blender GLB with independent metre and axis expectations", async () => {
    const gltf = await new GLTFLoader().parseAsync(
      Uint8Array.from(bytes).buffer,
      "",
    );
    gltf.scene.updateMatrixWorld(true);
    for (const [name, expected] of [
      ["X_LEFT", [1, 0, 0]],
      ["Y_UP", [0, 2, 0]],
      ["Z_FORWARD", [0, 0, 3]],
    ] as const) {
      const actual = gltf.scene
        .getObjectByName(name)!
        .getWorldPosition(new Vector3())
        .toArray();
      actual.forEach((value, axis) =>
        expect(value).toBeCloseTo(expected[axis], 6),
      );
    }
    expect(
      gltf.scene.getObjectByName("CONTRACT_ROOT")!.matrixWorld.elements,
    ).toEqual(new Matrix4().elements);
    const bounds = new Box3().setFromObject(gltf.scene);
    bounds.min
      .toArray()
      .forEach((value) => expect(value).toBeCloseTo(-0.02, 6));
    bounds.max
      .toArray()
      .forEach((value, axis) => expect(value).toBeCloseTo(axis + 1, 6));
    let triangles = 0;
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        triangles += mesh.geometry.index!.count / 3;
        mesh.geometry.dispose();
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material])
          material.dispose();
      }
    });
    expect(triangles).toBe(36);
    expect(inspectBlenderGlb(bytes, config)).toMatchObject({
      triangles: 36,
      primitives: 3,
      materials: 3,
      images: [],
    });
  });

  it("rejects lost pivots, repeated nodes, external buffers and animation timelines", () => {
    for (const edit of [
      (json: typeof document) => {
        json.nodes.find(
          (node: { name: string }) => node.name === "X_LEFT",
        ).translation = [2, 0, 0];
      },
      (json: typeof document) => {
        const root = json.nodes[json.scenes[0].nodes[0]];
        root.children.push(root.children[0]);
      },
      (json: typeof document) => {
        json.buffers[0].uri = "https://example.invalid/external.bin";
      },
      (json: typeof document) => {
        json.animations = [{ name: "second-clock" }];
      },
    ])
      expect(() => inspectBlenderGlb(changedDocument(edit), config)).toThrow();
  });

  it("rejects nonfinite vertex data and excessive bytes before accepting an asset", () => {
    const corrupted = Buffer.from(bytes);
    const accessor =
      document.accessors[document.meshes[0].primitives[0].attributes.POSITION];
    const offset =
      binStart +
      (document.bufferViews[accessor.bufferView].byteOffset ?? 0) +
      (accessor.byteOffset ?? 0);
    corrupted.writeFloatLE(NaN, offset);
    expect(() => inspectBlenderGlb(corrupted, config)).toThrow(/Nonfinite/);
    expect(() => inspectBlenderGlb(bytes, { ...config, maxBytes: 16 })).toThrow(
      /budget/,
    );
  });

  it("detects material edits while tolerating insignificant cross-platform float noise", () => {
    const original = inspectBlenderGlb(bytes, config).semanticSha256;
    const changed = changedDocument((json) => {
      json.materials[0].pbrMetallicRoughness.baseColorFactor[0] = 0.13;
    });
    expect(inspectBlenderGlb(changed, config).semanticSha256).not.toBe(
      original,
    );
    const noise = Buffer.from(bytes);
    const accessor =
      document.accessors[document.meshes[0].primitives[0].attributes.POSITION];
    const offset =
      binStart +
      (document.bufferViews[accessor.bufferView].byteOffset ?? 0) +
      (accessor.byteOffset ?? 0);
    noise.writeUInt32LE(noise.readUInt32LE(offset) + 1, offset);
    expect(noise.equals(bytes)).toBe(false);
    expect(inspectBlenderGlb(noise, config).semanticSha256).toBe(original);
  });

  it("keeps asset path resolution inside the repository", async () => {
    const root = fileURLToPath(new URL("../../", import.meta.url));
    await expect(ownedAssetPath(root, "..")).rejects.toThrow();
    await expect(ownedAssetPath(root, root)).rejects.toThrow();
  });
});
