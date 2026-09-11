import { describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import type { Track } from "../../packages/shared/schema";
import type { TerrainSurface } from "../../packages/track-engine/terrain";
import { roadApron, roadDetails } from "../../apps/web/src/road-presentation";

function polygon(count = 40, radius = 120): Track {
  return {
    ...source,
    schemaVersion: 2,
    closed: true,
    points: Array.from({ length: count }, (_, i) => ({
      x: radius * Math.cos((i / count) * Math.PI * 2),
      y: 0,
      z: radius * Math.sin((i / count) * Math.PI * 2),
      widthLeft: 6,
      widthRight: 9,
      banking: 0,
    })),
  };
}
function plane(): TerrainSurface {
  const positions = [];
  for (const z of [-10000, 0, 10000])
    for (const x of [-10000, 0, 10000])
      positions.push(x, -14 + x * 0.001 - z * 0.005, z);
  return {
    columns: 2,
    rows: 2,
    xMin: -10000,
    xMax: 10000,
    zMin: -10000,
    zMax: 10000,
    positions: new Float32Array(positions),
    distances: new Float32Array(9),
    indices: [],
    trees: [],
  };
}
function vertices(data: Float32Array) {
  return Array.from({ length: data.length / 3 }, (_, i) => [
    ...data.slice(i * 3, i * 3 + 3),
  ]);
}
/** Radius at a regular polygon vertex for a point along one of its scaled chords. */
function boundaryRadius(x: number, z: number, count = 40) {
  const step = (Math.PI * 2) / count;
  const angle = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
  const local = angle - (Math.floor(angle / step) + 0.5) * step;
  return (Math.hypot(x, z) * Math.cos(local)) / Math.cos(step / 2);
}

describe("schematic road presentation", () => {
  it("places paint inside asymmetric source widths and curbs outside, with upward triangles", () => {
    const track = polygon(),
      before = structuredClone(track),
      data = roadDetails(track);
    for (const [x, y, z] of vertices(data.white)) {
      if (Math.abs(y - 0.575) > 1e-6) continue; // Separate finish/curb display levels.
      const r = boundaryRadius(x, z);
      if (r > 120) expect(r).toBeGreaterThanOrEqual(125.75 - 2e-5);
      else expect(r).toBeGreaterThanOrEqual(111.09 - 2e-5);
      expect(r).toBeLessThanOrEqual(r > 120 ? 125.91 + 2e-5 : 111.25 + 2e-5);
    }
    for (const [x, y, z] of vertices(data.red)) {
      expect(y).toBeCloseTo(0.59, 6);
      const r = boundaryRadius(x, z);
      expect(r).toBeGreaterThanOrEqual(r > 120 ? 126 - 2e-5 : 110.15 - 2e-5);
      expect(r).toBeLessThanOrEqual(r > 120 ? 126.85 + 2e-5 : 111 + 2e-5);
    }
    for (const buffer of Object.values(data))
      for (let i = 0; i < buffer.length; i += 9) {
        const [ax, , az, bx, , bz, cx, , cz] = buffer.slice(i, i + 9);
        expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThan(
          0,
        );
      }
    expect(track).toEqual(before);
  });
  it("retains exact closed boundaries and three-metre curb intervals rather than source sample spacing", () => {
    const track = polygon(),
      data = roadDetails(track);
    const first = vertices(data.red).slice(0, 6);
    const chord = Math.hypot(track.points[1].x - 120, track.points[1].z);
    const x = 120 + ((track.points[1].x - 120) * 3) / chord,
      z = (track.points[1].z * 3) / chord;
    const expected = [
      [126, 0],
      [126.85, 0],
      [(x * 126) / 120, (z * 126) / 120],
      [(x * 126.85) / 120, (z * 126.85) / 120],
    ];
    for (const [px, , pz] of first)
      expect(
        Math.min(...expected.map(([a, b]) => Math.hypot(px - a, pz - b))),
      ).toBeLessThan(1e-5);
    const paint = vertices(data.white);
    for (const edge of [125.75, 125.91, 111.09, 111.25])
      expect(
        paint.filter(
          ([x, y, z]) =>
            Math.abs(x - edge) < 1e-5 &&
            Math.abs(y - 0.575) < 1e-6 &&
            Math.abs(z) < 1e-5,
        ).length,
      ).toBeGreaterThanOrEqual(2);
    const dark = vertices(data.dark);
    expect(Math.min(...dark.map(([x]) => x))).toBeCloseTo(111, 5);
    expect(Math.max(...dark.map(([x]) => x))).toBeCloseTo(126, 5);
    expect(Math.max(...dark.map(([, , z]) => z))).toBeCloseTo(0.45, 5);
    expect(Math.min(...dark.map(([, , z]) => z))).toBeCloseTo(-0.45, 5);
  });
  it("joins shoulder edges to an independently specified ground plane outside the road", () => {
    const track = polygon(),
      surface = plane(),
      before = structuredClone(track);
    const data = roadApron(track, surface);
    let inner = 0,
      outer = 0;
    for (const [x, y, z] of vertices(data)) {
      const radius = boundaryRadius(x, z);
      if (Math.abs(y - 0.44) < 1e-6) {
        inner++;
        expect(
          Math.min(Math.abs(radius - 130), Math.abs(radius - 107)),
        ).toBeLessThan(2e-5);
      } else {
        outer++;
        expect(
          Math.min(Math.abs(radius - 144), Math.abs(radius - 93)),
        ).toBeLessThan(2e-5);
        expect(y).toBeCloseTo(-14 + x * 0.001 - z * 0.005 - 0.1, 5);
      }
    }
    expect(inner).toBeGreaterThan(0);
    expect(outer).toBeGreaterThan(0);
    expect(track).toEqual(before);
  });
  it("keeps deterministic finite output bounded at the maximum source count and near the length limit", () => {
    const track = polygon(2000, 4500),
      before = structuredClone(track);
    const a = roadDetails(track),
      b = roadDetails({ ...track, name: "Presentation only" });
    for (const key of ["white", "red", "dark"] as const)
      expect(
        Buffer.from(a[key].buffer).equals(Buffer.from(b[key].buffer)),
      ).toBe(true);
    expect(a.red).toHaveLength(0); // A broad analytic circle needs no schematic tight-turn curbs.
    for (const buffer of [...Object.values(a), roadApron(track, plane())]) {
      expect(buffer.length).toBeLessThan(500000);
      expect(buffer.every(Number.isFinite)).toBe(true);
    }
    expect(track).toEqual(before);
  });
});
