import {
  BufferGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
  Vector3,
} from "three";
import asset from "../../../assets/vehicles/gt.json";

type Vertex = readonly [number, number, number];

/** Closed smooth skin with independent, outward-facing caps, including concave sections. */
function loft(rings: Vertex[][]) {
  const positions = rings.flat(2),
    count = rings[0].length,
    indices: number[] = [];
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < count; j++) {
      const a = i * count + j,
        b = i * count + ((j + 1) % count);
      indices.push(a, b, a + count, b, b + count, a + count);
    }
  for (const end of [0, rings.length - 1]) {
    const start = positions.length / 3,
      ring = rings[end];
    positions.push(...ring.flat());
    const triangles = ShapeUtils.triangulateShape(
      ring.map(([x, y]) => new Vector2(x, y)),
      [],
    );
    for (const triangle of triangles)
      indices.push(
        ...(end === 0 ? triangle.reverse() : triangle).map((i) => i + start),
      );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function gtDimensions(width: number, wheelbase: number, radius: number) {
  const tyreWidth = Math.min(width * 0.19, radius * 1.2);
  return {
    length: wheelbase + asset.overhang,
    tyreWidth,
    archRadius: radius + asset.wheelClearance,
    core: Math.max(width * 0.1, width / 2 - tyreWidth - asset.coreClearance),
  };
}

function bodyStation(z: number, length: number) {
  const ratio = z / length;
  let upper = asset.body.findIndex((row) => row[0] >= ratio);
  if (upper < 0) upper = asset.body.length - 1;
  const b = asset.body[upper],
    a = asset.body[Math.max(0, upper - 1)];
  const fraction = b[0] === a[0] ? 0 : (ratio - a[0]) / (b[0] - a[0]);
  return a.map((value, i) => value + (b[i] - value) * fraction);
}

/** Raised outer sills form true wheel wells; the central contact floor stays continuous. */
export function gtBodyGeometry(
  width: number,
  wheelbase: number,
  radius: number,
) {
  const {
    length,
    archRadius,
    core: inner,
  } = gtDimensions(width, wheelbase, radius);
  const stations = new Set(asset.body.map((row) => row[0] * length));
  for (const axle of [-wheelbase / 2, wheelbase / 2]) {
    for (let i = 0; i <= asset.archSteps; i++)
      stations.add(
        axle +
          archRadius * Math.sin(-Math.PI / 2 + (Math.PI * i) / asset.archSteps),
      );
    stations.add(axle - archRadius - 0.004);
    stations.add(axle + archRadius + 0.004);
  }
  const sorted = [...stations]
    .filter((z) => Math.abs(z) <= length / 2)
    .sort((a, b) => a - b);
  const rings = sorted
    .filter((z, i) => !i || z - sorted[i - 1] > 1e-5)
    .map((z): Vertex[] => {
      const [, widthRatio, base, authoredDeck, fender] = bodyStation(z, length);
      const halfWidth = widthRatio * width,
        core = Math.min(halfWidth * 0.68, inner);
      const dz = Math.min(
        Math.abs(z - wheelbase / 2),
        Math.abs(z + wheelbase / 2),
      );
      const lower = Math.max(
        base + 0.015,
        dz <= archRadius
          ? radius + Math.sqrt(Math.max(0, archRadius ** 2 - dz ** 2))
          : base + 0.015,
      );
      const shoulder = Math.max(fender, lower + 0.12);
      // Keep the skin above the well's ceiling, including larger custom tyre radii.
      const deck = Math.max(authoredDeck, lower + 0.045);
      return [
        [-core, base, z],
        [core, base, z],
        [core, lower, z],
        [halfWidth * 0.93, lower, z],
        [halfWidth, lower + 0.045, z],
        [halfWidth, shoulder - 0.045, z],
        [halfWidth * 0.92, shoulder, z],
        [halfWidth * 0.64, deck + 0.04, z],
        [0, deck + 0.06, z],
        [-halfWidth * 0.64, deck + 0.04, z],
        [-halfWidth * 0.92, shoulder, z],
        [-halfWidth, shoulder - 0.045, z],
        [-halfWidth, lower + 0.045, z],
        [-halfWidth * 0.93, lower, z],
        [-core, lower, z],
      ];
    });
  return loft(rings);
}

export function gtCabinGeometry(width: number, length: number) {
  return loft(
    asset.cabin.map(([z, halfWidth, bottom, top]) =>
      asset.cabinSection.map(([x, y]): Vertex => [
        x * halfWidth * width,
        bottom + y * (top - bottom),
        z * length,
      ]),
    ),
  );
}

/** Glass panels follow the cabin skin; paint between them forms the actual pillars. */
export function gtGlassGeometry(width: number, length: number) {
  const positions: number[] = [];
  const ring = (z: number) => {
    const upper = asset.cabin.findIndex((row) => row[0] >= z);
    const b = asset.cabin[upper],
      a = asset.cabin[Math.max(0, upper - 1)];
    const fraction = b[0] === a[0] ? 0 : (z - a[0]) / (b[0] - a[0]);
    const [, halfWidth, bottom, top] = a.map(
      (value, i) => value + (b[i] - value) * fraction,
    );
    return asset.cabinSection.map(
      ([x, y]) =>
        new Vector3(
          x * halfWidth * width,
          bottom + y * (top - bottom),
          z * length,
        ),
    );
  };
  for (const [edge, start, end] of asset.windows) {
    const stations = [
      start,
      ...asset.cabin.map((row) => row[0]).filter((z) => z > start && z < end),
      end,
    ];
    const rows = stations.map((station) => {
      const section = ring(station);
      return [asset.windowInset, 1 - asset.windowInset].map((fraction) =>
        section[edge]
          .clone()
          .lerp(section[(edge + 1) % section.length], fraction),
      );
    });
    const shifted = rows.map((row, i) => {
      const previous = rows[Math.max(0, i - 1)],
        next = rows[Math.min(rows.length - 1, i + 1)];
      const tangent = next[0]
        .clone()
        .add(next[1])
        .sub(previous[0])
        .sub(previous[1]);
      const offset = row[1]
        .clone()
        .sub(row[0])
        .cross(tangent)
        .normalize()
        .multiplyScalar(asset.windowLift);
      return row.map((point) => point.clone().add(offset));
    });
    for (let i = 0; i < shifted.length - 1; i++) {
      const [a, b] = shifted[i],
        [c, d] = shifted[i + 1];
      for (const point of [a, b, c, b, d, c])
        positions.push(...point.toArray());
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
