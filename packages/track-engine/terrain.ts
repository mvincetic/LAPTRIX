import type { Track } from "../shared/schema";
import { normalizeTrack, type Vec3 } from "./index";

// Keep a float32 reserve below source roads without raising every road on a berm.
export const TERRAIN_CLEARANCE = 0.35;
const columns = 110;
const rows = 80;

/** Original contextual ground; projected source segments are not a terrain survey. */
export function sourceGroundSampler(track: Track) {
  const segments = track.points.map((a, i) => {
    const b = track.points[(i + 1) % track.points.length];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const width = Math.max(
      a.widthLeft,
      a.widthRight,
      b.widthLeft,
      b.widthRight,
    );
    return {
      a,
      dx,
      dz,
      dy: b.y - a.y,
      inverseLength: 1 / (dx * dx + dz * dz),
      treeDistance2: (width + 30) ** 2,
    };
  });
  return (x: number, z: number) => {
    let nearest = Infinity,
      elevation = 0,
      plantable = true;
    for (const segment of segments) {
      const dx = x - segment.a.x,
        dz = z - segment.a.z;
      const t = Math.max(
        0,
        Math.min(
          1,
          (dx * segment.dx + dz * segment.dz) * segment.inverseLength,
        ),
      );
      const distance2 = (dx - t * segment.dx) ** 2 + (dz - t * segment.dz) ** 2;
      if (distance2 <= segment.treeDistance2) plantable = false;
      const y = segment.a.y + t * segment.dy;
      if (distance2 < nearest || (distance2 === nearest && y < elevation)) {
        nearest = distance2;
        elevation = y;
      }
    }
    return { elevation, distance: Math.sqrt(nearest), plantable };
  };
}

export type TerrainSurface = {
  columns: number;
  rows: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  positions: Float32Array;
  distances: Float32Array;
  indices: number[];
  trees: Vec3[];
};

/** Sample the same two triangles used by the rendered grid, including its edges. */
export function terrainHeightAt(surface: TerrainSurface, x: number, z: number) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < surface.xMin ||
    x > surface.xMax ||
    z < surface.zMin ||
    z > surface.zMax
  )
    return null;
  const gx =
    ((x - surface.xMin) / (surface.xMax - surface.xMin)) * surface.columns;
  const gz =
    ((z - surface.zMin) / (surface.zMax - surface.zMin)) * surface.rows;
  const ix = Math.min(surface.columns - 1, Math.floor(gx));
  const iz = Math.min(surface.rows - 1, Math.floor(gz));
  const u = gx - ix,
    v = gz - iz,
    a = iz * (surface.columns + 1) + ix;
  const height = (index: number) => surface.positions[index * 3 + 1];
  return u + v <= 1
    ? height(a) * (1 - u - v) +
        height(a + 1) * u +
        height(a + surface.columns + 1) * v
    : height(a + surface.columns + 2) * (u + v - 1) +
        height(a + 1) * (1 - v) +
        height(a + surface.columns + 1) * (1 - u);
}

/** Fixed-budget scenery with conservative clearance below every road/shoulder quad. */
export function createTerrainSurface(track: Track): TerrainSurface {
  const frame = normalizeTrack(track),
    sample = sourceGroundSampler(track);
  const padding = frame.span * 0.7;
  const surface: TerrainSurface = {
    columns,
    rows,
    xMin: frame.min[0] - padding,
    xMax: frame.max[0] + padding,
    zMin: frame.min[2] - padding,
    zMax: frame.max[2] + padding,
    positions: new Float32Array((columns + 1) * (rows + 1) * 3),
    distances: new Float32Array((columns + 1) * (rows + 1)),
    indices: [],
    trees: [],
  };
  const stepX = (surface.xMax - surface.xMin) / columns;
  const stepZ = (surface.zMax - surface.zMin) / rows;
  for (let z = 0; z <= rows; z++)
    for (let x = 0; x <= columns; x++) {
      const px = surface.xMin + x * stepX,
        pz = surface.zMin + z * stepZ;
      const ground = sample(px, pz),
        index = z * (columns + 1) + x;
      surface.positions.set(
        [
          px,
          ground.elevation -
            TERRAIN_CLEARANCE -
            Math.min(25, ground.distance * 0.055),
          pz,
        ],
        index * 3,
      );
      surface.distances[index] = ground.distance;
      if (x < columns && z < rows) {
        const a = index,
          b = a + columns + 1;
        surface.indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  // Each expanded box contains its whole road and shoulder quad. Capping all four
  // cell vertices below both endpoints bounds every interpolated terrain triangle.
  // The extra metre also covers float32 coordinate rounding at accepted offsets.
  track.points.forEach((a, i) => {
    const b = track.points[(i + 1) % track.points.length];
    const width =
      Math.max(a.widthLeft, a.widthRight, b.widthLeft, b.widthRight) + 5;
    const x0 = Math.max(
      0,
      Math.floor((Math.min(a.x, b.x) - width - surface.xMin) / stepX),
    );
    const x1 = Math.min(
      columns - 1,
      Math.floor((Math.max(a.x, b.x) + width - surface.xMin) / stepX),
    );
    const z0 = Math.max(
      0,
      Math.floor((Math.min(a.z, b.z) - width - surface.zMin) / stepZ),
    );
    const z1 = Math.min(
      rows - 1,
      Math.floor((Math.max(a.z, b.z) + width - surface.zMin) / stepZ),
    );
    const ceiling = Math.min(a.y, b.y) - TERRAIN_CLEARANCE;
    for (let z = z0; z <= z1 + 1; z++)
      for (let x = x0; x <= x1 + 1; x++) {
        const index = (z * (columns + 1) + x) * 3 + 1;
        surface.positions[index] = Math.min(surface.positions[index], ceiling);
      }
  });
  let seed = 37;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 4200; i++) {
    const x = surface.xMin + random() * (surface.xMax - surface.xMin);
    const z = surface.zMin + random() * (surface.zMax - surface.zMin);
    const ground = sample(x, z);
    if (ground.plantable && ground.distance < 240 && random() > 0.25)
      surface.trees.push([x, terrainHeightAt(surface, x, z)! + 6, z]);
  }
  return surface;
}
