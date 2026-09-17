import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh } from "three";
import {
  hasAuthoredSpruce,
  prepareSpruceTemplate,
  validateSpruceContainer,
} from "../../apps/web/src/spruce-asset";
import { inspectBlenderGlb } from "../../scripts/blender-glb.mjs";
import config from "../../assets/blender/shared/spruce.json";

const bytes = readFileSync(
  new URL("../../assets/runtime/environment/spruce.glb", import.meta.url),
);
const document = JSON.parse(
  bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
);
const binStart = 28 + bytes.readUInt32LE(12);
function changed(edit: (json: typeof document) => void) {
  const json = structuredClone(document);
  edit(json);
  const raw = Buffer.from(JSON.stringify(json)),
    text = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20);
  raw.copy(text);
  const result = Buffer.alloc(28 + text.length + bytes.length - binStart);
  bytes.copy(result, 0, 0, 12);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(text.length, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  text.copy(result, 20);
  result.writeUInt32LE(bytes.length - binStart, 20 + text.length);
  result.writeUInt32LE(0x004e4942, 24 + text.length);
  bytes.copy(result, 28 + text.length, binStart);
  return result;
}
const scene = async () =>
  (await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "")).scene;
beforeEach(() => {
  vi.stubGlobal("self", globalThis);
  // Browser QA decodes the pixels. Node still parses the actual embedded PNG blob.
  vi.stubGlobal("createImageBitmap", async (blob: Blob) => {
    const png = new DataView(await blob.arrayBuffer());
    return {
      width: png.getUint32(16),
      height: png.getUint32(20),
      close: vi.fn(),
    };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("authored spruce delivery", () => {
  it("fits the actual Blender meshes inside the existing crown and trunk instance envelopes", async () => {
    validateSpruceContainer(bytes);
    expect(inspectBlenderGlb(bytes, config).triangles).toBe(624);
    const tree = prepareSpruceTemplate(await scene());
    for (const mesh of [tree.crown, tree.trunk]) {
      const p = mesh.geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        expect(Math.hypot(p.getX(i), p.getZ(i))).toBeLessThanOrEqual(1.000001);
        expect(p.getY(i)).toBeGreaterThanOrEqual(-0.500001);
        expect(p.getY(i)).toBeLessThanOrEqual(0.500001);
      }
      expect(mesh.geometry.boundingBox!.min.y).toBeCloseTo(-0.5, 6);
      expect(mesh.geometry.boundingBox!.max.y).toBeCloseTo(0.5, 6);
    }
    expect(tree.crown.material.alphaTest).toBeCloseTo(0.45, 6);
    expect(tree.crown.material.transparent).toBe(false);
    expect(tree.crown.material.map!.anisotropy).toBe(4);
  });
  it.each([
    [
      "external image",
      (j: typeof document) => {
        j.images[0].uri = "https://invalid.example/foliage.png";
      },
    ],
    [
      "external buffer",
      (j: typeof document) => {
        j.buffers[0].uri = "https://invalid.example/tree.bin";
      },
    ],
    [
      "unbounded vertices",
      (j: typeof document) => {
        j.accessors[0].count = 10000000;
      },
    ],
    [
      "sparse allocation",
      (j: typeof document) => {
        j.accessors[0].sparse = { count: 10000000 };
      },
    ],
    [
      "opaque needles",
      (j: typeof document) => {
        j.materials.find(
          (m: { name: string }) => m.name === "LTX_Spruce_Needles",
        ).alphaMode = "OPAQUE";
      },
    ],
    [
      "wrong cutoff",
      (j: typeof document) => {
        j.materials.find(
          (m: { name: string }) => m.name === "LTX_Spruce_Needles",
        ).alphaCutoff = 0.01;
      },
    ],
  ] as const)("rejects %s before decoding", (_name, edit) => {
    expect(() => validateSpruceContainer(changed(edit))).toThrow();
  });
  it("rejects oversized decoded PNG dimensions even within the compressed byte budget", () => {
    const modified = Buffer.from(bytes),
      offset =
        binStart +
        document.bufferViews[document.images[0].bufferView].byteOffset;
    modified.writeUInt32BE(16384, offset + 16);
    expect(() => validateSpruceContainer(modified)).toThrow(/PNG/);
  });
  it("rejects displaced geometry before instance normalization can hide it", async () => {
    const source = await scene(),
      crown = source.getObjectByName("SPRUCE_CROWN_LOD0") as Mesh;
    crown.geometry.translate(0, 2, 0);
    expect(() => prepareSpruceTemplate(source)).toThrow(/bounds/);
  });
  it("rejects loss of alpha masking in the independent exported-asset gate", () => {
    const malformed = changed((j) => {
      delete j.materials.find(
        (m: { name: string }) => m.name === "LTX_Spruce_Needles",
      ).alphaMode;
    });
    expect(() => inspectBlenderGlb(malformed, config)).toThrow(/alpha mask/);
  });
  it("rejects a crown without mapped needle coordinates", async () => {
    const source = await scene();
    (
      source.getObjectByName("SPRUCE_CROWN_LOD0") as Mesh
    ).geometry.deleteAttribute("uv");
    expect(() => prepareSpruceTemplate(source)).toThrow(/UV/);
  });
  it("scopes authored foliage to exact bundled source identities", () => {
    config.sourceFingerprints.forEach((f) =>
      expect(hasAuthoredSpruce(f)).toBe(true),
    );
    expect(hasAuthoredSpruce()).toBe(false);
    expect(hasAuthoredSpruce("red-bull-ring")).toBe(false);
    expect(hasAuthoredSpruce("sha256:imported-source")).toBe(false);
  });
});
