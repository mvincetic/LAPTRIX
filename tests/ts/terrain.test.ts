import { describe, expect, it } from "vitest";
import { trackSchema, type Track } from "../../packages/shared/schema";
import { normalizeTrack } from "../../packages/track-engine";
import {
  createTerrainSurface,
  sourceGroundSampler,
  terrainHeightAt,
  type TerrainSurface,
} from "../../packages/track-engine/terrain";
import { slopedTerrainTrack } from "../fixtures/terrain";

describe("synthetic terrain clearance", () => {
  it("interpolates the nearest closed source segment rather than skipping vertices", () => {
    const track = slopedTerrainTrack();
    const sample = sourceGroundSampler(track);
    for (const i of [1, 22, 39]) {
      const a = track.points[i],
        b = track.points[(i + 1) % track.points.length];
      const actual = sample((a.x + b.x) / 2, (a.z + b.z) / 2);
      expect(actual.distance).toBeLessThan(1e-9);
      expect(actual.elevation).toBeCloseTo((a.y + b.y) / 2, 10);
      expect(actual.plantable).toBe(false);
    }
  });

  it("keeps trees outside wide road corridors", () => {
    const track = slopedTerrainTrack(40, 40),
      sample = sourceGroundSampler(track);
    expect(sample(560, 0).plantable).toBe(false);
    expect(sample(580, 0).plantable).toBe(true);
  });

  it("samples both actual grid triangles and all outer edges without wrapping", () => {
    const surface: TerrainSurface = {
      columns: 1,
      rows: 1,
      xMin: 0,
      xMax: 1,
      zMin: 0,
      zMax: 1,
      positions: new Float32Array([0, 0, 0, 1, 10, 0, 0, 20, 1, 1, 80, 1]),
      indices: [0, 2, 1, 2, 3, 1],
      distances: new Float32Array(4),
      trees: [],
    };
    for (const [x, z, y] of [
      [0, 0, 0],
      [1, 0, 10],
      [0, 1, 20],
      [1, 1, 80],
      [0.25, 0.25, 7.5],
      [0.75, 0.75, 47.5],
      [0.5, 0.5, 15],
      [1, 0.5, 45],
    ])
      expect(terrainHeightAt(surface, x, z)).toBe(y);
    for (const [x, z] of [
      [-0.01, 0],
      [1.01, 0],
      [0, -0.01],
      [0, 1.01],
      [NaN, 0],
      [0, Infinity],
    ])
      expect(terrainHeightAt(surface, x, z)).toBeNull();
  });

  const crossing: Track = {
    ...slopedTerrainTrack(80, 40),
    points: Array.from({ length: 80 }, (_, i) => {
      const t = (i * 2 * Math.PI) / 80;
      return {
        x: 500 * Math.sin(t),
        z: 500 * Math.sin(2 * t),
        y: 100 * Math.cos(t),
        widthLeft: 40,
        widthRight: 40,
        banking: 0,
      };
    }),
  };
  const translated = slopedTerrainTrack(720);
  translated.points = translated.points.map((p) => ({
    ...p,
    x: p.x + 90000,
    y: p.y + 90000,
    z: p.z + 90000,
  }));
  for (const [name, track] of [
    ["sparse sloped circle", slopedTerrainTrack()],
    ["wide sloped circle", slopedTerrainTrack(80, 40)],
    ["large coordinate offset", translated],
    ["unequal-height crossing", crossing],
  ] as const)
    it(`keeps terrain below the road and shoulders for a ${name}`, () => {
      expect(trackSchema.safeParse(track).success).toBe(true);
      const original = JSON.stringify(track),
        surface = createTerrainSurface(track),
        frame = normalizeTrack(track);
      let minimum = Infinity;
      track.points.forEach((a, i) => {
        const next = (i + 1) % track.points.length,
          b = track.points[next];
        for (let j = 0; j <= 10; j++)
          for (let k = 0; k <= 4; k++) {
            const t = j / 10,
              f = k / 4;
            const wa =
              -(a.widthRight + 4) + (a.widthLeft + a.widthRight + 8) * f;
            const wb =
              -(b.widthRight + 4) + (b.widthLeft + b.widthRight + 8) * f;
            const x =
              (a.x + frame.normals[i][0] * wa) * (1 - t) +
              (b.x + frame.normals[next][0] * wb) * t;
            const z =
              (a.z + frame.normals[i][2] * wa) * (1 - t) +
              (b.z + frame.normals[next][2] * wb) * t;
            const ground = terrainHeightAt(surface, x, z);
            expect(ground).not.toBeNull();
            minimum = Math.min(minimum, a.y * (1 - t) + b.y * t - ground!);
          }
      });
      // Preserve a conservative reserve including float32 geometry at large offsets.
      expect(minimum).toBeGreaterThan(0.3);
      expect(JSON.stringify(track)).toBe(original);
    });

  it("keeps flat roads close to their surrounding ground instead of a continuous raised embankment", () => {
    const track = slopedTerrainTrack(720);
    track.points = track.points.map((point) => ({ ...point, y: 0 }));
    const surface = createTerrainSurface(track);
    const frame = normalizeTrack(track);
    for (const [i, point] of track.points.entries()) {
      for (const distance of [-26, -12, 0, 12, 26]) {
        const height = terrainHeightAt(
          surface,
          point.x + frame.normals[i][0] * distance,
          point.z + frame.normals[i][2] * distance,
        )!;
        expect(height).not.toBeNull();
        expect(height).toBeLessThan(-0.3);
        // Beyond the shoulder, the old blanket offset left a 9–11 m drop.
        expect(height).toBeGreaterThan(-2.5);
      }
    }
  });

  it("builds finite bounded deterministic geometry and seats trees on its actual triangles", () => {
    const track = slopedTerrainTrack();
    const first = createTerrainSurface(track),
      second = createTerrainSurface(track);
    expect(first.positions).toEqual(second.positions);
    expect(first.trees).toEqual(second.trees);
    expect(first.positions.length).toBe(111 * 81 * 3);
    expect(first.indices.length).toBe(110 * 80 * 6);
    expect(first.positions.every(Number.isFinite)).toBe(true);
    expect(
      first.indices.every(
        (index) => Number.isInteger(index) && index >= 0 && index < 111 * 81,
      ),
    ).toBe(true);
    expect(first.trees.length).toBeGreaterThan(0);
    expect(first.trees.length).toBeLessThanOrEqual(4200);
    const sample = sourceGroundSampler(track);
    for (const [x, y, z] of first.trees) {
      expect(y).toBe(terrainHeightAt(first, x, z)! + 6);
      expect(sample(x, z).plantable).toBe(true);
    }
  });
});
