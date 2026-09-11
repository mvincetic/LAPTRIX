import type { Track } from "../../../packages/shared/schema";
import { normalizeTrack, type Vec3 } from "../../../packages/track-engine";
import devStart from "../../../assets/trackside/dev-track-presentation.json";
import { roadClearance } from "./road-clearance";
import { roadShoulders } from "./road-presentation";

export type TracksidePresentation = typeof devStart;
export function presentationForSource(fingerprint: string | undefined) {
  return [devStart].find((entry) => entry.sourceFingerprint === fingerprint);
}
export type AssetSite = {
  position: Vec3;
  yaw: number;
  foundation: { position: Vec3; size: Vec3 };
};
type Vertex = [number, number, number];

/** Clip actual surface triangles to a horizontal foundation footprint, retaining heights. */
export function foundationGround(
  apron: ArrayLike<number>,
  centre: Vec3,
  yaw: number,
  width: number,
  depth: number,
) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw),
    corners = [
      [-width / 2, -depth / 2],
      [width / 2, -depth / 2],
      [width / 2, depth / 2],
      [-width / 2, depth / 2],
    ],
    covered = corners.map(() => false);
  let low = Infinity,
    high = -Infinity;
  const cross = (a: Vertex, b: Vertex, x: number, z: number) =>
    (b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0]);
  for (let i = 0; i < apron.length; i += 9) {
    let polygon: Vertex[] = [0, 3, 6].map((offset) => {
      const dx = apron[i + offset] - centre[0],
        dz = apron[i + offset + 2] - centre[2];
      return [c * dx - s * dz, apron[i + offset + 1], s * dx + c * dz];
    });
    if (
      polygon.every((p) => p[0] < -width / 2) ||
      polygon.every((p) => p[0] > width / 2) ||
      polygon.every((p) => p[2] < -depth / 2) ||
      polygon.every((p) => p[2] > depth / 2)
    )
      continue;
    const area = cross(polygon[0], polygon[1], polygon[2][0], polygon[2][2]);
    if (Math.abs(area) < 1e-10) continue;
    corners.forEach(([x, z], corner) => {
      const signs = polygon.map((a, j) => cross(a, polygon[(j + 1) % 3], x, z));
      if (
        signs.every((value) => value >= -1e-7) ||
        signs.every((value) => value <= 1e-7)
      )
        covered[corner] = true;
    });
    for (const [axis, bound, direction] of [
      [0, -width / 2, 1],
      [0, width / 2, -1],
      [2, -depth / 2, 1],
      [2, depth / 2, -1],
    ]) {
      const clipped: Vertex[] = [];
      polygon.forEach((a, j) => {
        const b = polygon[(j + 1) % polygon.length],
          aInside = (a[axis] - bound) * direction >= 0,
          bInside = (b[axis] - bound) * direction >= 0;
        if (aInside) clipped.push(a);
        if (aInside !== bInside) {
          const t = (bound - a[axis]) / (b[axis] - a[axis]);
          clipped.push(
            a.map((value, k) => value + (b[k] - value) * t) as Vertex,
          );
        }
      });
      polygon = clipped;
    }
    for (const point of polygon) {
      low = Math.min(low, point[1]);
      high = Math.max(high, point[1]);
    }
  }
  return covered.every(Boolean) && Number.isFinite(low) && Number.isFinite(high)
    ? { low, high }
    : null;
}

/** Combine the same shoulder/apron vertices used by the visible meshes. */
export function foundationSurface(track: Track, apron: ArrayLike<number>) {
  const shoulders = roadShoulders(track);
  const surface = new Float32Array(shoulders.length + apron.length);
  surface.set(shoulders);
  surface.set(Array.from(apron), shoulders.length);
  return surface;
}

/** Original site metadata chooses locations; every contact comes from rendered surfaces. */
export function placeTracksideAssets(
  track: Track,
  apron: ArrayLike<number>,
  presentation: TracksidePresentation,
) {
  const frame = normalizeTrack(track),
    clear = roadClearance(track),
    result: AssetSite[] = [];
  const foot = presentation.foundation;
  for (const placement of presentation.placements) {
    const distance = placement.progress * frame.length;
    let i = frame.distances.findIndex((value) => value > distance) - 1;
    if (i < 0) i = frame.distances.length - 1;
    const j = (i + 1) % track.points.length,
      a = track.points[i],
      b = track.points[j],
      t =
        (distance - frame.distances[i]) /
        ((frame.distances[i + 1] ?? frame.length) - frame.distances[i]);
    const tx = frame.tangents[i][0] * (1 - t) + frame.tangents[j][0] * t,
      tz = frame.tangents[i][2] * (1 - t) + frame.tangents[j][2] * t,
      length = Math.hypot(tx, tz);
    if (length < 1e-8) continue;
    const nx = tz / length,
      nz = -tx / length;
    const width =
      placement.side === 1
        ? a.widthLeft * (1 - t) + b.widthLeft * t
        : a.widthRight * (1 - t) + b.widthRight * t;
    const offset = (width + placement.edgeOffset) * placement.side,
      centre: Vec3 = [
        a.x + (b.x - a.x) * t + nx * offset,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t + nz * offset,
      ],
      yaw = Math.atan2(tx, tz);
    if (
      !clear(
        centre,
        centre,
        Math.hypot(foot.width, foot.depth) / 2 + presentation.roadReserve,
      )
    )
      continue;
    const contact = foundationGround(
      apron,
      centre,
      yaw,
      foot.width,
      foot.depth,
    );
    if (!contact) continue;
    const top = contact.high + foot.clearance,
      bottom = contact.low - foot.embed;
    if (top - bottom > foot.maxHeight) continue;
    result.push({
      position: [centre[0], top, centre[2]],
      yaw,
      foundation: {
        position: [centre[0], (top + bottom) / 2, centre[2]],
        size: [foot.width, top - bottom, foot.depth],
      },
    });
  }
  return result;
}
