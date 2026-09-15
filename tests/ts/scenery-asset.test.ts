import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { BoxGeometry, Mesh, MeshBasicMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  loadRBRScenery,
  rbrSceneryContract,
  validateRBRScenery,
} from "../../apps/web/src/scenery-asset";
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
afterEach(() => vi.unstubAllGlobals());

describe("Blender circuit reconstruction", () => {
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
    vi.stubGlobal("fetch", request);
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
