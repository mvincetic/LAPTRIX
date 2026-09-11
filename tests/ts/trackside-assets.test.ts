import { describe, expect, it } from "vitest";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from "three";
import source from "../../data/tracks/ardennes-development.json";
import other from "../../data/tracks/red-bull-ring.json";
import { trackSchema } from "../../packages/shared/schema";
import { trackFingerprint } from "../../packages/track-engine";
import { createTerrainSurface } from "../../packages/track-engine/terrain";
import { roadApron } from "../../apps/web/src/road-presentation";
import {
  foundationGround,
  foundationSurface,
  placeTracksideAssets,
  presentationForSource,
} from "../../apps/web/src/trackside-assets";
import presentation from "../../assets/trackside/dev-track-presentation.json";

describe("source-bound original trackside assets", () => {
  it("binds presentation to physical identity, including preserved identity after a rename", async () => {
    const track = trackSchema.parse(source);
    expect(presentationForSource(await trackFingerprint(track))).toEqual(
      presentation,
    );
    expect(
      presentationForSource(
        await trackFingerprint({
          ...track,
          id: "renamed",
          name: "A saved track",
        }),
      ),
    ).toEqual(presentation);
    expect(
      presentationForSource(await trackFingerprint(trackSchema.parse(other))),
    ).toBeUndefined();
    expect(presentationForSource(undefined)).toBeUndefined();
    expect(
      presentationForSource(
        await trackFingerprint({
          ...track,
          points: track.points.map((p, i) => ({
            ...p,
            y: p.y + (i === 0 ? 0.01 : 0),
          })),
        }),
      ),
    ).toBeUndefined();
  });

  it("retains exact plane extrema through rotation and translation, and detects unsupported footprints", () => {
    for (const translation of [0, 90000]) {
      const points = [
        [-20, -20],
        [20, -20],
        [20, 20],
        [-20, 20],
      ].map(([x, z]) => [
        x + translation,
        3 + x * 0.1 + z * 0.2,
        z - translation,
      ]);
      const triangles = [0, 1, 2, 0, 2, 3].flatMap((i) => points[i]);
      const yaw = Math.PI / 3,
        width = 3.9,
        depth = 1.1;
      const heights = [-width / 2, width / 2].flatMap((x) =>
        [-depth / 2, depth / 2].map(
          (z) =>
            3 +
            (Math.cos(yaw) * x + Math.sin(yaw) * z) * 0.1 +
            (-Math.sin(yaw) * x + Math.cos(yaw) * z) * 0.2,
        ),
      );
      const result = foundationGround(
        triangles,
        [translation, 0, -translation],
        yaw,
        width,
        depth,
      )!;
      expect(result.low).toBeCloseTo(Math.min(...heights), 8);
      expect(result.high).toBeCloseTo(Math.max(...heights), 8);
      expect(
        foundationGround(
          triangles,
          [translation + 20, 0, -translation],
          0,
          width,
          depth,
        ),
      ).toBeNull();
    }
    expect(foundationGround([], [0, 0, 0], 0, 4, 2)).toBeNull();
  });

  it("includes a triangle peak inside the footprint, away from its corners or centre", () => {
    const corners = [
      [-5, 0, -5],
      [5, 0, -5],
      [5, 0, 5],
      [-5, 0, 5],
    ];
    const triangles = corners.flatMap((p, i) => [
      ...p,
      ...corners[(i + 1) % 4],
      0.25,
      7,
      -0.15,
    ]);
    const result = foundationGround(triangles, [0, 0, 0], 0, 4, 2)!;
    expect(result.high).toBe(7);
    expect(result.low).toBeGreaterThan(3);
  });

  it("grounds both original sites against independent rays and preserves source/apron data", () => {
    for (const translation of [0, 90000]) {
      const track = trackSchema.parse({
        ...source,
        points: source.points.map((p) => ({
          ...p,
          x: p.x + translation,
          z: p.z - translation,
        })),
      });
      const apron = foundationSurface(
        track,
        roadApron(track, createTerrainSurface(track)),
      );
      const before = structuredClone({ track, apron });
      const sites = placeTracksideAssets(track, apron, presentation);
      expect(sites).toHaveLength(2);
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(apron, 3));
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const mesh = new Mesh(geometry, material);
      const ray = new Raycaster();
      for (const site of sites) {
        const [width, height, depth] = site.foundation.size;
        expect(site.position[1]).toBeCloseTo(
          site.foundation.position[1] + height / 2,
          10,
        );
        for (let i = 0; i <= 8; i++)
          for (let j = 0; j <= 4; j++) {
            const x = (i / 8 - 0.5) * width,
              z = (j / 4 - 0.5) * depth;
            const wx =
                site.position[0] +
                Math.cos(site.yaw) * x +
                Math.sin(site.yaw) * z,
              wz =
                site.position[2] -
                Math.sin(site.yaw) * x +
                Math.cos(site.yaw) * z;
            ray.set(new Vector3(wx, 200, wz), new Vector3(0, -1, 0));
            const hit = ray.intersectObject(mesh, false)[0];
            expect(hit).toBeDefined();
            expect(site.position[1] - hit.point.y).toBeGreaterThanOrEqual(
              presentation.foundation.clearance - 1e-6,
            );
            expect(
              site.foundation.position[1] - height / 2,
            ).toBeLessThanOrEqual(
              hit.point.y - presentation.foundation.embed + 1e-6,
            );
          }
      }
      expect(placeTracksideAssets(track, apron, presentation)).toEqual(sites);
      expect({ track, apron }).toEqual(before);
      geometry.dispose();
      material.dispose();
    }
  });

  it("omits sites without supported ground, adequate road clearance or bounded foundations", () => {
    const track = trackSchema.parse(source),
      apron = foundationSurface(
        track,
        roadApron(track, createTerrainSurface(track)),
      );
    expect(placeTracksideAssets(track, [], presentation)).toEqual([]);
    expect(
      placeTracksideAssets(track, apron, {
        ...presentation,
        foundation: { ...presentation.foundation, maxHeight: 0.01 },
      }),
    ).toEqual([]);
    expect(
      placeTracksideAssets(track, apron, {
        ...presentation,
        placements: presentation.placements.map((p) => ({
          ...p,
          edgeOffset: 0,
        })),
      }),
    ).toEqual([]);
  });
});
