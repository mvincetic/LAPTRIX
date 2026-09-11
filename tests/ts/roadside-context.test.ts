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
import { trackSchema, type Track } from "../../packages/shared/schema";
import { normalizeTrack, type Vec3 } from "../../packages/track-engine";
import { createTerrainSurface } from "../../packages/track-engine/terrain";
import { roadApron, roadSurface } from "../../apps/web/src/road-presentation";
import {
  guardrailAsset,
  roadsideContext,
} from "../../apps/web/src/roadside-context";
import { roadClearance } from "../../apps/web/src/road-clearance";
import { slopedTerrainTrack } from "../fixtures/terrain";

function circle(): Track {
  const source = slopedTerrainTrack(80);
  return trackSchema.parse({
    ...source,
    points: source.points.map((p) => ({
      ...p,
      x: p.x / 5,
      y: 0,
      z: p.z / 5,
      widthLeft: 4,
      widthRight: 11,
    })),
  });
}

describe("original trackside geometry", () => {
  it("keeps an asymmetric analytical road and its boundary reserve clear", () => {
    const track = circle(),
      clear = roadClearance(track);
    // At x=R, the outside edge is 104 m and inside edge is 89 m.
    for (const x of [90, 100, 103, 104.5])
      expect(clear([x, 0, 0], [x, 0, 0], 1)).toBe(false);
    for (const x of [87, 106])
      expect(clear([x, 0, 0], [x, 0, 0], 1)).toBe(true);
    expect(clear([108, 0, -5], [108, 0, 5], 1)).toBe(true);
    // Clear endpoints must not permit a barrier which crosses the actual road.
    expect(clear([-130, 0, 0], [130, 0, 0], 1)).toBe(false);
    expect(clear([104.5, 0, -6], [104.5, 0, 6], 1)).toBe(false);
  });

  it("rejects crossing-road scenery independently of source height and grid origin", () => {
    const source = circle();
    const track = trackSchema.parse({
      ...source,
      points: Array.from({ length: 160 }, (_, i) => {
        const t = (i / 160) * Math.PI * 2;
        return {
          ...source.points[0],
          x: 100 * Math.sin(t),
          z: 100 * Math.sin(t) * Math.cos(t),
          y: 20 * Math.cos(t),
        };
      }),
    });
    for (const offset of [0, 90000]) {
      const moved = {
        ...track,
        points: track.points.map((p) => ({
          ...p,
          x: p.x + offset,
          z: p.z + offset,
        })),
      };
      const clear = roadClearance(moved);
      const at = (x: number, z: number): Vec3 => [x + offset, 1000, z + offset];
      expect(clear(at(-30, 0), at(-30, 0), 0.8)).toBe(true);
      expect(clear(at(30, 0), at(30, 0), 0.8)).toBe(true);
      expect(clear(at(-30, 0), at(30, 0), 0.8)).toBe(false);
      expect(clear(at(-20, 100), at(20, 100), 0.8)).toBe(true);
    }
  });

  for (const offset of [0, 90000])
    it(`grounds support bases on independently raycast sparse apron triangles at offset ${offset}`, () => {
      const source = slopedTerrainTrack();
      const track = trackSchema.parse({
        ...source,
        points: source.points.map((p) => ({
          ...p,
          x: p.x + offset,
          y: p.y + offset,
          z: p.z + offset,
          widthLeft: 4,
          widthRight: 11,
        })),
      });
      const before = structuredClone(track),
        surface = createTerrainSurface(track),
        ground = surface.positions.slice();
      const data = roadsideContext(track, surface),
        frame = normalizeTrack(track);
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new BufferAttribute(roadApron(track, surface), 3),
      );
      const material = new MeshBasicMaterial({ side: DoubleSide }),
        apron = new Mesh(geometry, material),
        ray = new Raycaster();
      try {
        expect(data.posts.length).toBeGreaterThan(900);
        expect(data.posts.length).toBeLessThanOrEqual(
          2 * Math.ceil(frame.length / 6),
        );
        expect(data.reflectors.length).toBeGreaterThan(150);
        data.posts.forEach((post, i) => {
          expect(
            Math.abs(post.distance / 6 - Math.round(post.distance / 6)),
          ).toBeLessThan(1e-7);
          if (i % 7) return;
          let segment = 0;
          while (
            segment + 1 < frame.distances.length &&
            frame.distances[segment + 1] <= post.distance
          )
            segment++;
          const start = frame.distances[segment],
            end = frame.distances[segment + 1] ?? frame.length;
          const from = track.points[segment],
            to = track.points[(segment + 1) % track.points.length];
          const sourceHeight =
            from.y +
            ((to.y - from.y) * (post.distance - start)) / (end - start);
          expect(
            Math.abs(post.position[1] - sourceHeight - 0.44),
          ).toBeLessThanOrEqual(0.200000001);
          ray.set(
            new Vector3(
              post.position[0],
              post.position[1] + 3,
              post.position[2],
            ),
            new Vector3(0, -1, 0),
          );
          ray.far = 4;
          const hit = ray.intersectObject(apron, false)[0];
          expect(hit, `post at ${post.distance} m`).toBeDefined();
          expect(Math.abs(hit.point.y - post.position[1])).toBeLessThan(0.025);
        });
        for (const reflector of data.reflectors)
          expect(
            Math.abs(
              reflector.distance / 30 - Math.round(reflector.distance / 30),
            ),
          ).toBeLessThan(1e-7);
        expect([...data.rails].every(Number.isFinite)).toBe(true);
        expect(data.rails).toEqual(roadsideContext(track, surface).rails);
        expect(track).toEqual(before);
        expect(surface.positions).toEqual(ground);
      } finally {
        geometry.dispose();
        material.dispose();
      }
    });

  it("omits generated rails at crossings and leaves the actual asphalt clear", () => {
    const source = circle();
    const track = trackSchema.parse({
      ...source,
      points: Array.from({ length: 160 }, (_, i) => {
        const t = (i / 160) * Math.PI * 2;
        return {
          ...source.points[0],
          x: 100 * Math.sin(t),
          z: 100 * Math.sin(t) * Math.cos(t),
          y: 20 * Math.cos(t),
        };
      }),
    });
    const data = roadsideContext(track, createTerrainSurface(track)),
      road = roadSurface(track);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(road.positions, 3));
    geometry.setIndex(new BufferAttribute(road.indices, 1));
    const material = new MeshBasicMaterial({ side: DoubleSide }),
      mesh = new Mesh(geometry, material),
      ray = new Raycaster();
    try {
      expect(data.omittedSpans).toBeGreaterThan(0);
      expect(data.rails.length).toBeGreaterThan(1000);
      // Raycast every actual rail triangle's plan-view centroid against both road levels.
      for (let i = 0; i < data.rails.length; i += 9) {
        const x = (data.rails[i] + data.rails[i + 3] + data.rails[i + 6]) / 3;
        const z =
          (data.rails[i + 2] + data.rails[i + 5] + data.rails[i + 8]) / 3;
        ray.set(new Vector3(x, 50, z), new Vector3(0, -1, 0));
        ray.far = 100;
        expect(ray.intersectObject(mesh, false).length).toBe(0);
      }
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("keeps maximum-length context finite and bounded by physical spacing", () => {
    const source = slopedTerrainTrack(2000);
    const track = trackSchema.parse({
      ...source,
      points: source.points.map((p) => ({
        ...p,
        x: p.x * 9.4,
        y: 0,
        z: p.z * 9.4,
      })),
    });
    const frame = normalizeTrack(track),
      data = roadsideContext(track, createTerrainSurface(track));
    const maximumSpans =
      2 * (track.points.length + Math.ceil(frame.length / 6));
    expect(data.rails.length / 9).toBeLessThanOrEqual(
      maximumSpans * (guardrailAsset.profile.length - 1) * 2,
    );
    expect(data.posts.length).toBeLessThanOrEqual(
      2 * Math.ceil(frame.length / 6),
    );
    expect(data.posts.length).toBeGreaterThan(9000);
    expect([...data.rails].every(Number.isFinite)).toBe(true);
  });
});
