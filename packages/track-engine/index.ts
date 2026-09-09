import type { Point, Track } from "../shared/schema";

export type Vec3 = [number, number, number];
export function normalizeTrack(track: Track) {
  let length = 0;
  const distances: number[] = [];
  const normals: Vec3[] = [];
  const tangents: Vec3[] = [];
  const left: Vec3[] = [];
  const right: Vec3[] = [];
  const n = track.points.length;
  for (let i = 0; i < n; i++) {
    const p = track.points[i],
      prev = track.points[(i + n - 1) % n],
      next = track.points[(i + 1) % n];
    distances.push(length);
    length += Math.hypot(next.x - p.x, next.y - p.y, next.z - p.z);
    const dx = next.x - prev.x,
      dy = next.y - prev.y,
      dz = next.z - prev.z,
      l = Math.hypot(dx, dy, dz),
      h = Math.hypot(dx, dz);
    if (h < 1e-8 || l < 1e-8)
      throw new Error("Track contains a degenerate local frame");
    const normal: Vec3 = [dz / h, 0, -dx / h];
    normals.push(normal);
    tangents.push([dx / l, dy / l, dz / l]);
    left.push([
      p.x + normal[0] * p.widthLeft,
      p.y,
      p.z + normal[2] * p.widthLeft,
    ]);
    right.push([
      p.x - normal[0] * p.widthRight,
      p.y,
      p.z - normal[2] * p.widthRight,
    ]);
  }
  const xs = track.points.map((p) => p.x),
    ys = track.points.map((p) => p.y),
    zs = track.points.map((p) => p.z);
  const min: Vec3 = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
  const max: Vec3 = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
  const center: Vec3 = min.map((v, i) => (v + max[i]) / 2) as Vec3;
  return {
    length,
    distances,
    normals,
    tangents,
    left,
    right,
    min,
    max,
    center,
    span: Math.max(max[0] - min[0], max[2] - min[2]),
    elevationRange: max[1] - min[1],
  };
}

/** Closed ribbon, top-facing triangles in right-handed x/y-up/z coordinates. */
export function ribbonGeometry(
  points: Point[],
  normals: Vec3[],
  left: number | number[],
  right: number | number[],
  elevation = 0,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      normal = normals[i],
      l = typeof left === "number" ? left : left[i],
      r = typeof right === "number" ? right : right[i];
    positions.push(
      p.x + normal[0] * l,
      p.y + elevation,
      p.z + normal[2] * l,
      p.x - normal[0] * r,
      p.y + elevation,
      p.z - normal[2] * r,
    );
    const a = i * 2,
      b = ((i + 1) % points.length) * 2;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
