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
import { slopedTerrainTrack } from "../fixtures/terrain";
import { normalizeTrack, ribbonGeometry } from "../../packages/track-engine";
import {
  roadShoulders,
  roadSurface,
} from "../../apps/web/src/road-presentation";

describe("shoulders outside the asphalt", () => {
  for (const offset of [0, 90000])
    it(`retains welded edges and leaves the complete sloped driving surface clear at offset ${offset}`, () => {
      const track = slopedTerrainTrack();
      track.points = track.points.map((point) => ({
        ...point,
        x: point.x + offset,
        y: point.y + offset,
        z: point.z + offset,
      }));
      const original = structuredClone(track),
        frame = normalizeTrack(track);
      const sourceRoad = ribbonGeometry(
        track.points,
        frame.normals,
        8,
        8,
        0.55,
      );
      const road = roadSurface(track);
      const shoulders = roadShoulders(track);
      const roadGeometry = new BufferGeometry(),
        shoulderGeometry = new BufferGeometry();
      roadGeometry.setAttribute(
        "position",
        new BufferAttribute(road.positions, 3),
      );
      roadGeometry.setIndex(new BufferAttribute(road.indices, 1));
      shoulderGeometry.setAttribute(
        "position",
        new BufferAttribute(shoulders, 3),
      );
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const roadMesh = new Mesh(roadGeometry, material),
        shoulderMesh = new Mesh(shoulderGeometry, material);
      const ray = new Raycaster();
      try {
        const retained = new Set<string>();
        for (let i = 0; i < road.positions.length; i += 3)
          retained.add([...road.positions.slice(i, i + 3)].join(","));
        for (let i = 0; i < sourceRoad.positions.length; i += 3)
          expect(
            retained.has([...sourceRoad.positions.slice(i, i + 3)].join(",")),
          ).toBe(true);
        const joins = new Set<string>();
        for (let i = 0; i < shoulders.length; i += 3)
          joins.add([...shoulders.slice(i, i + 3)].join(","));
        for (let i = 0; i < road.positions.length; i += 3)
          expect(joins.has([...road.positions.slice(i, i + 3)].join(","))).toBe(
            true,
          );
        // Independent vertical rays through interior points on a known R500 circle.
        // The former full-width shoulder surface broke through this asphalt.
        track.points.forEach((a, i) => {
          const b = track.points[(i + 1) % track.points.length];
          for (const t of [0.25, 0.5, 0.75])
            for (const across of [-6, -2, 2, 6]) {
              const x =
                ((a.x - offset) * (1 - t) + (b.x - offset) * t) *
                  (1 + across / 500) +
                offset;
              const z =
                ((a.z - offset) * (1 - t) + (b.z - offset) * t) *
                  (1 + across / 500) +
                offset;
              ray.set(
                new Vector3(x, a.y * (1 - t) + b.y * t + 30, z),
                new Vector3(0, -1, 0),
              );
              const hits = ray.intersectObject(roadMesh, false);
              expect(hits.length).toBeGreaterThan(0);
              const expectedHeight = a.y * (1 - t) + b.y * t + 0.55;
              expect(Math.abs(hits[0].point.y - expectedHeight)).toBeLessThan(
                0.025,
              );
              expect(ray.intersectObject(shoulderMesh, false)).toHaveLength(0);
            }
        });
        expect(shoulders.length).toBeLessThanOrEqual(
          (track.points.length + Math.ceil(frame.length / 3)) * 36,
        );
        const center = (i: number) =>
          new Vector3(
            (road.positions[i] + road.positions[i + 3]) / 2,
            (road.positions[i + 1] + road.positions[i + 4]) / 2,
            (road.positions[i + 2] + road.positions[i + 5]) / 2,
          );
        for (let i = 0; i < road.positions.length; i += 6)
          expect(
            center(i).distanceTo(center((i + 6) % road.positions.length)),
          ).toBeLessThan(3.03);
        expect(shoulders.every(Number.isFinite)).toBe(true);
        for (let i = 0; i < shoulders.length; i += 9) {
          const [ax, , az, bx, , bz, cx, , cz] = shoulders.slice(i, i + 9);
          expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThan(
            0,
          );
        }
        expect(track).toEqual(original);
      } finally {
        material.dispose();
        roadGeometry.dispose();
        shoulderGeometry.dispose();
      }
    });
});
