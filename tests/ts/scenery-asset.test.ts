import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  loadRBRScenery,
  rbrSceneryContract,
  validateRBRScenery,
  validateSceneryContainer,
  sceneryGroundMaterials,
  disposeRejectedScenery,
} from "../../apps/web/src/scenery-asset";
import { groundUV, groundMaterial } from "../../apps/web/src/ground-materials";
import source from "../../data/tracks/red-bull-ring.json";
import { normalizeTrack } from "../../packages/track-engine";
import { trackSchema } from "../../packages/shared/schema";
import { createTerrainSurface } from "../../packages/track-engine/terrain";
import { visibleTreeIndices } from "../../apps/web/src/vegetation-clearance";
import { sceneryFootprints } from "../../apps/web/src/scenery-asset";
import { verticalSceneryProbe } from "../fixtures/scenery-clearance";

const bytes = readFileSync(
  new URL(
    "../../assets/runtime/tracks/red-bull-ring-slice.glb",
    import.meta.url,
  ),
);
const buffer = () =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
const template = async () =>
  (await new GLTFLoader().parseAsync(buffer(), "")).scene;
const nativeFetch = globalThis.fetch;
beforeEach(() => {
  vi.stubGlobal("self", globalThis);
  // Node has no bitmap decoder. Browser delivery/visual QA decodes actual pixels;
  // here the real GLTFLoader still reads embedded blobs and their PNG dimensions.
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

describe("Blender circuit reconstruction", () => {
  it("keeps metre-scale ground UVs consistent between real Blender meshes and runtime surfaces", async () => {
    validateSceneryContainer(bytes);
    const scene = validateRBRScenery(await template());
    const materials = sceneryGroundMaterials(scene),
      point = new Vector3();
    let probes = 0;
    scene.traverse((node) => {
      if (
        !(node instanceof Mesh) ||
        !(node.material instanceof MeshStandardMaterial)
      )
        return;
      const spec = Object.values(rbrSceneryContract.groundMaterials).find(
        (s) => s.name === node.material.name,
      );
      if (!spec) return;
      const position = node.geometry.getAttribute("position"),
        uv = node.geometry.getAttribute("uv");
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
        expect(uv.getX(i)).toBeCloseTo(point.x / spec.tileMetres, 3);
        expect(uv.getY(i)).toBeCloseTo(1 - point.z / spec.tileMetres, 3);
        probes++;
      }
    });
    expect(probes).toBeGreaterThan(1000);
    const coordinates = new Float32Array([-2, 9, 6, 0, 8, 4, 2, 7, 2]);
    const original = coordinates.slice();
    expect(Array.from(groundUV(coordinates, 2).array)).toEqual([
      -1, -2, 0, -1, 1, 0,
    ]);
    expect(coordinates).toEqual(original);
    expect(materials.asphalt.normalMap).toBe(materials.gravel.normalMap);
    const owned = groundMaterial(materials.asphalt),
      disposal = vi.fn();
    materials.asphalt.map!.addEventListener("dispose", disposal);
    expect(owned.map).toBe(materials.asphalt.map);
    expect(owned).not.toBe(materials.asphalt);
    owned.dispose();
    expect(disposal).not.toHaveBeenCalled();
  });

  it("rejects external, truncated and oversized images before browser decoding", () => {
    const document = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    const replaceJson = (edit: (json: typeof document) => void) => {
      const changed = structuredClone(document);
      edit(changed);
      const text = Buffer.from(JSON.stringify(changed));
      const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
      text.copy(padded);
      const bin = bytes.subarray(20 + bytes.readUInt32LE(12));
      const result = Buffer.concat([bytes.subarray(0, 20), padded, bin]);
      result.writeUInt32LE(result.length, 8);
      result.writeUInt32LE(padded.length, 12);
      return result;
    };
    for (const edit of [
      (j: typeof document) => {
        j.images[0].uri = "https://invalid.example/remote.png";
      },
      (j: typeof document) => {
        j.images[0].bufferView = -1;
      },
      (j: typeof document) => {
        j.bufferViews[j.images[0].bufferView].byteLength = 20;
      },
      (j: typeof document) => {
        j.buffers[0].uri = "remote.bin";
      },
      (j: typeof document) => {
        j.textures[0].source = 99;
      },
    ])
      expect(() => validateSceneryContainer(replaceJson(edit))).toThrow();
    const oversized = Buffer.from(bytes);
    const imageOffset =
      28 +
      bytes.readUInt32LE(12) +
      document.bufferViews[document.images[0].bufferView].byteOffset;
    oversized.writeUInt32BE(16384, imageOffset + 16);
    expect(() => validateSceneryContainer(oversized)).toThrow(
      /oversized scenery PNG/,
    );
    expect(() =>
      validateSceneryContainer(bytes.subarray(0, bytes.length - 4)),
    ).toThrow();
  });

  it("releases owned textures if a parsed package is rejected, while instance disposal keeps cached maps", async () => {
    const scene = await template(),
      materials = sceneryGroundMaterials(scene);
    const maps = new Set(
      Object.values(materials).flatMap((m) => [m.map!, m.normalMap!]),
    );
    expect(maps.size).toBe(5);
    const counts = [...maps].map((map) => {
      const dispose = vi.fn();
      map.addEventListener("dispose", dispose);
      return { map, dispose };
    });
    disposeRejectedScenery(scene);
    counts.forEach(({ map, dispose }) => {
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(
        (map.source.data as { close: () => void }).close,
      ).toHaveBeenCalledTimes(1);
    });
  });
  it("rejects the wrong source frame, stale ground context and displaced scene", async () => {
    const scene = await template();
    expect(validateRBRScenery(scene)).toBe(scene);
    const proxy = scene.getObjectByName("SHADOW_CASTERS_LOD0") as Mesh;
    expect(proxy.castShadow).toBe(true);
    expect(proxy.geometry.index!.count / 3).toBeLessThan(3000);
    const shadowMaterial = Array.isArray(proxy.material)
      ? proxy.material[0]
      : proxy.material;
    expect(shadowMaterial.colorWrite).toBe(false);
    expect(shadowMaterial.depthWrite).toBe(false);
    scene.traverse((node) => {
      if (node instanceof Mesh && node !== proxy)
        expect(node.castShadow).toBe(false);
    });
    const root = scene.getObjectByName(rbrSceneryContract.rootNode)!;
    const original = { ...root.userData };
    for (const field of ["source_fingerprint", "authoring_context_sha256"]) {
      root.userData[field] = "wrong";
      expect(() => validateRBRScenery(scene)).toThrow(/source frame/);
      root.userData = { ...original };
    }
    root.position.x = 1;
    expect(() => validateRBRScenery(scene)).toThrow(/anchor/);
  });

  it("keeps curbs, runoff, barriers and structures clear of the source driving surface", async () => {
    const scene = validateRBRScenery(await template());
    const track = trackSchema.parse(source),
      before = structuredClone(track);
    const frame = normalizeTrack(track);
    const obstructed = verticalSceneryProbe(scene);
    let probes = 0;
    track.points.forEach((p, i) => {
      if (
        !rbrSceneryContract.distanceRanges.some(
          ([a, b]) => frame.distances[i] >= a && frame.distances[i] <= b,
        )
      )
        return;
      for (const lateral of [-5.4, -3, 0, 3, 5.4]) {
        const n = frame.normals[i];
        // Two metres of driving clearance. Intentional overhead gantry stays above this envelope.
        const hit = obstructed(
          p.x + n[0] * lateral,
          p.y + 2.55,
          p.z + n[2] * lateral,
          1.97,
        );
        expect(
          hit,
          `source ${frame.distances[i]} m, lateral ${lateral} m`,
        ).toBe(false);
        probes++;
      }
    });
    expect(probes).toBeGreaterThan(650);
    expect(track).toEqual(before);
    // A planted obstruction must be detected, including across negative cell boundaries.
    const obstacle = new Mesh(
      new BoxGeometry(4, 1, 4),
      new MeshBasicMaterial(),
    );
    obstacle.position.set(-32, 1, 32);
    const proof = verticalSceneryProbe(obstacle);
    expect(proof(-32, 3, 32, 2)).toBe(true);
    expect(proof(-32.5, 3, 31.5, 2)).toBe(true);
    expect(proof(-40, 3, 32, 2)).toBe(false);
    expect(proof(-32, 3, 32, 1)).toBe(false);
    obstacle.geometry.dispose();
    obstacle.material.dispose();
  });

  it("evicts failed requests and shares one bounded template after recovery", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(buffer()));
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith("blob:")
        ? nativeFetch(input, init)
        : request(input, init),
    );
    await expect(loadRBRScenery()).rejects.toThrow(/unavailable/);
    const a = loadRBRScenery(),
      b = loadRBRScenery();
    expect(a).toBe(b);
    const scene = await a;
    expect(await loadRBRScenery()).toBe(scene);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps contextual crowns outside the exported garage and grandstand roofs", async () => {
    const scene = validateRBRScenery(await template());
    const trees = createTerrainSurface(trackSchema.parse(source)).trees;
    const visible = visibleTreeIndices(trees, sceneryFootprints(scene));
    const obstructed = verticalSceneryProbe(scene);
    expect(visible.length).toBeGreaterThan(trees.length - 10);
    expect(visible).not.toContain(314); // Browser review: crown intersected the stand canopy.
    for (const i of visible) {
      const [x, y, z] = trees[i],
        radius = (9 + (i % 7)) * 0.42;
      for (const [dx, dz] of [
        [0, 0],
        [-radius, 0],
        [radius, 0],
        [0, -radius],
        [0, radius],
      ]) {
        expect(
          obstructed(x + dx, y - 6 + 18, z + dz, 17.5),
          `Tree ${i} through authored facility`,
        ).toBe(false);
      }
    }
  });
});
