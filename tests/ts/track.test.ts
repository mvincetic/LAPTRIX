import { describe, it, expect } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import { trackSchema } from "../../packages/shared/schema";
import { normalizeTrack, ribbonGeometry } from "../../packages/track-engine";

describe("generic track geometry", () => {
  const track = trackSchema.parse(data),
    frame = normalizeTrack(track);
  it("includes the closing segment in the full distance", () => {
    const p = track.points.at(-1)!,
      q = track.points[0];
    expect(frame.length).toBeGreaterThan(5500);
    expect(frame.length - frame.distances.at(-1)!).toBeCloseTo(
      Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z),
      8,
    );
  });
  it("builds orthonormal frames and correct boundaries", () => {
    frame.normals.forEach((n, i) => {
      expect(Math.hypot(...n)).toBeCloseTo(1, 10);
      expect(
        n.reduce((s, c, j) => s + c * frame.tangents[i][j], 0),
      ).toBeCloseTo(0, 10);
      const p = track.points[i],
        left = frame.left[i];
      expect(
        Math.hypot(left[0] - p.x, left[1] - p.y, left[2] - p.z),
      ).toBeCloseTo(p.widthLeft, 8);
    });
  });
  it("creates a closed indexed ribbon with upward facing triangles", () => {
    const g = ribbonGeometry(track.points, frame.normals, 8, 8);
    expect(g.positions.length).toBe(track.points.length * 6);
    expect(g.indices.length).toBe(track.points.length * 6);
    expect(Math.max(...g.indices)).toBe(track.points.length * 2 - 1);
    for (let i = 0; i < g.indices.length; i += 3) {
      const [a, b, c] = Array.from(g.indices.slice(i, i + 3)).map((idx) =>
        Array.from(g.positions.slice(idx * 3, idx * 3 + 3)),
      );
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      expect(ny).toBeGreaterThan(0);
    }
    expect(Array.from(g.indices.slice(-6))).toContain(0);
  });
  it("rejects gaps, NaN, duplicate samples, invalid sectors and banking", () => {
    const copy = () => structuredClone(data);
    const cases = [copy(), copy(), copy(), copy(), copy()];
    cases[0].points[2].x += 10000;
    cases[1].points[0].x = NaN;
    cases[2].points[1] = cases[2].points[0];
    cases[3].sectorFractions = [0.8, 0.3, 1];
    cases[4].points[0].banking = 0.2;
    cases.forEach((c) => expect(trackSchema.safeParse(c).success).toBe(false));
  });
});
