import type { Track } from "../../../packages/shared/schema";
import { normalizeTrack, type Vec3 } from "../../../packages/track-engine";

type Triangle = [Vec3, Vec3, Vec3];
const cellSize = 64;
const cross = (a: Vec3, b: Vec3, p: Vec3) =>
  (b[0] - a[0]) * (p[2] - a[2]) - (b[2] - a[2]) * (p[0] - a[0]);

function pointDistance2(p: Vec3, a: Vec3, b: Vec3) {
  const dx = b[0] - a[0],
    dz = b[2] - a[2];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[2] - a[2]) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  return (p[0] - a[0] - t * dx) ** 2 + (p[2] - a[2] - t * dz) ** 2;
}

function segmentsDistance2(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  if (
    Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <=
      Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) &&
    Math.max(Math.min(a[2], b[2]), Math.min(c[2], d[2])) <=
      Math.min(Math.max(a[2], b[2]), Math.max(c[2], d[2])) &&
    cross(a, b, c) * cross(a, b, d) <= 0 &&
    cross(c, d, a) * cross(c, d, b) <= 0
  )
    return 0;
  return Math.min(
    pointDistance2(a, c, d),
    pointDistance2(b, c, d),
    pointDistance2(c, a, b),
    pointDistance2(d, a, b),
  );
}

function inside(p: Vec3, triangle: Triangle) {
  if (Math.abs(cross(...triangle)) < 1e-12) return false;
  const signs = triangle.map((a, i) => cross(a, triangle[(i + 1) % 3], p));
  return (
    signs.every((value) => value >= 0) || signs.every((value) => value <= 0)
  );
}

/** Conservative plan-view exclusion against actual source road-edge triangles. */
export function roadClearance(track: Track) {
  const frame = normalizeTrack(track),
    grid = new Map<string, Triangle[]>();
  const keys = (points: Vec3[], margin = 0) => {
    const result: string[] = [];
    const x0 = Math.floor(
      (Math.min(...points.map((p) => p[0])) - margin) / cellSize,
    );
    const x1 = Math.floor(
      (Math.max(...points.map((p) => p[0])) + margin) / cellSize,
    );
    const z0 = Math.floor(
      (Math.min(...points.map((p) => p[2])) - margin) / cellSize,
    );
    const z1 = Math.floor(
      (Math.max(...points.map((p) => p[2])) + margin) / cellSize,
    );
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) result.push(`${x}:${z}`);
    return result;
  };
  track.points.forEach((_, i) => {
    const j = (i + 1) % track.points.length;
    for (const triangle of [
      [frame.left[i], frame.right[i], frame.left[j]],
      [frame.right[i], frame.right[j], frame.left[j]],
    ] as Triangle[])
      for (const key of keys(triangle)) {
        const entries = grid.get(key) ?? [];
        entries.push(triangle);
        grid.set(key, entries);
      }
  });
  return (a: Vec3, b: Vec3, margin: number) => {
    const candidates = new Set(
      keys([a, b], margin).flatMap((key) => grid.get(key) ?? []),
    );
    for (const triangle of candidates) {
      if (inside(a, triangle) || inside(b, triangle)) return false;
      if (
        triangle.some(
          (p, i) =>
            segmentsDistance2(a, b, p, triangle[(i + 1) % 3]) <=
            margin * margin,
        )
      )
        return false;
    }
    return true;
  };
}
