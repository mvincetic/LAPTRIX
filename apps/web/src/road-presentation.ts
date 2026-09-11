import type { Track } from "../../../packages/shared/schema";
import { normalizeTrack, type Vec3 } from "../../../packages/track-engine";
import {
  terrainHeightAt,
  TERRAIN_CLEARANCE,
  type TerrainSurface,
} from "../../../packages/track-engine/terrain";
import { ROAD_SURFACE_LIFT } from "./chase-camera";

export const SHOULDER_SURFACE_LIFT = 0.46;

function quad(output: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  const up = (c[2] - a[2]) * (b[0] - a[0]) - (c[0] - a[0]) * (b[2] - a[2]);
  if (up >= 0) output.push(...a, ...c, ...b, ...b, ...c, ...d);
  else output.push(...a, ...b, ...c, ...b, ...d, ...c);
}

/** Separate shoulders share the exact road edges and never span the driving surface. */
export function roadShoulders(track: Track) {
  const { pieces, edge } = roadPieces(track, 3),
    positions: number[] = [];
  for (const { i, from, to } of pieces) {
    for (const side of [1, -1] as const)
      quad(
        positions,
        edge(i, from, side, 0, ROAD_SURFACE_LIFT),
        edge(i, from, side, 4, SHOULDER_SURFACE_LIFT),
        edge(i, to, side, 0, ROAD_SURFACE_LIFT),
        edge(i, to, side, 4, SHOULDER_SURFACE_LIFT),
      );
  }
  return new Float32Array(positions);
}

/** Render ruled source cross-sections at <=3 m spacing to limit coarse-quad twist. */
export function roadSurface(track: Track) {
  const { pieces, edge } = roadPieces(track, 3);
  const positions = new Float32Array(pieces.length * 6),
    indices = new Uint32Array(pieces.length * 6);
  pieces.forEach(({ i, from }, index) => {
    positions.set(edge(i, from, 1, 0, ROAD_SURFACE_LIFT), index * 6);
    positions.set(edge(i, from, -1, 0, ROAD_SURFACE_LIFT), index * 6 + 3);
    const a = index * 2,
      b = ((index + 1) % pieces.length) * 2;
    indices.set([a, a + 1, b, b, a + 1, b + 1], index * 6);
  });
  return { positions, indices };
}

/** Pieces retain every source vertex and split at uniform physical-distance gates. */
export function roadPieces(track: Track, step: number) {
  const frame = normalizeTrack(track);
  const pieces: {
    i: number;
    from: number;
    to: number;
    distance: number;
    curved: boolean;
  }[] = [];
  for (let i = 0; i < track.points.length; i++) {
    const a = track.points[i],
      b = track.points[(i + 1) % track.points.length];
    const previous =
      track.points[(i + track.points.length - 1) % track.points.length];
    const start = frame.distances[i],
      end = frame.distances[i + 1] ?? frame.length;
    const ux = a.x - previous.x,
      uz = a.z - previous.z,
      vx = b.x - a.x,
      vz = b.z - a.z;
    const turn = Math.abs(Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz));
    const curvature = turn / ((Math.hypot(ux, uz) + Math.hypot(vx, vz)) / 2);
    let from = start;
    for (
      let gate = (Math.floor(start / step) + 1) * step;
      from < end - 1e-8;
      gate += step
    ) {
      const to = Math.min(end, gate);
      pieces.push({
        i,
        from: (from - start) / (end - start),
        to: (to - start) / (end - start),
        distance: from,
        curved: curvature > 1 / 450,
      });
      from = to;
    }
  }
  const edge = (
    i: number,
    t: number,
    side: 1 | -1,
    extra: number,
    lift: number,
  ): Vec3 => {
    const j = (i + 1) % track.points.length;
    const at = (index: number): Vec3 => {
      const p = track.points[index],
        n = frame.normals[index];
      const width = (side === 1 ? p.widthLeft : p.widthRight) + extra;
      return [p.x + n[0] * width * side, p.y + lift, p.z + n[2] * width * side];
    };
    const a = at(i),
      b = at(j);
    return a.map((v, axis) => v + (b[axis] - v) * t) as Vec3;
  };
  return { frame, pieces, edge };
}

/** Original schematic edge paint, alternating curbs and a source start/finish stripe. */
export function roadDetails(track: Track) {
  const { frame, pieces, edge } = roadPieces(track, 3);
  const white: number[] = [],
    red: number[] = [],
    dark: number[] = [];
  for (const { i, from, to, distance, curved } of pieces)
    for (const side of [1, -1] as const) {
      quad(
        white,
        edge(i, from, side, -0.25, ROAD_SURFACE_LIFT + 0.025),
        edge(i, from, side, -0.09, ROAD_SURFACE_LIFT + 0.025),
        edge(i, to, side, -0.25, ROAD_SURFACE_LIFT + 0.025),
        edge(i, to, side, -0.09, ROAD_SURFACE_LIFT + 0.025),
      );
      if (curved)
        quad(
          Math.floor((distance + 1e-7) / 3) % 2 ? white : red,
          edge(i, from, side, 0, ROAD_SURFACE_LIFT + 0.04),
          edge(i, from, side, 0.85, ROAD_SURFACE_LIFT + 0.04),
          edge(i, to, side, 0, ROAD_SURFACE_LIFT + 0.04),
          edge(i, to, side, 0.85, ROAD_SURFACE_LIFT + 0.04),
        );
    }
  const p = track.points[0],
    n = frame.normals[0],
    tangent = frame.tangents[0];
  const cells = Math.ceil((p.widthLeft + p.widthRight) / 0.7);
  const cellWidth = (p.widthLeft + p.widthRight) / cells;
  const at = (across: number, along: number): Vec3 => [
    p.x + n[0] * across + tangent[0] * along,
    p.y + ROAD_SURFACE_LIFT + 0.035 + tangent[1] * along,
    p.z + n[2] * across + tangent[2] * along,
  ];
  for (let row = 0; row < 2; row++)
    for (let column = 0; column < cells; column++) {
      const a = -p.widthRight + column * cellWidth,
        b = a + cellWidth;
      const from = (row - 1) * 0.45,
        to = row * 0.45;
      quad(
        (row + column) % 2 ? white : dark,
        at(a, from),
        at(b, from),
        at(a, to),
        at(b, to),
      );
    }
  return {
    white: new Float32Array(white),
    red: new Float32Array(red),
    dark: new Float32Array(dark),
  };
}

/** Visual earth connection outside the shoulder; it never modifies source heights. */
export function roadApron(track: Track, surface: TerrainSurface) {
  const { pieces, edge } = roadPieces(track, 6);
  const positions: number[] = [];
  for (const { i, from, to } of pieces)
    for (const side of [1, -1] as const) {
      const inner = (t: number) =>
        edge(i, t, side, 4, SHOULDER_SURFACE_LIFT - 0.02);
      const outer = (t: number) => {
        const point = edge(i, t, side, 18, 0);
        point[1] =
          (terrainHeightAt(surface, point[0], point[2]) ??
            point[1] - TERRAIN_CLEARANCE) - 0.1;
        return point;
      };
      quad(positions, inner(from), outer(from), inner(to), outer(to));
    }
  return new Float32Array(positions);
}
