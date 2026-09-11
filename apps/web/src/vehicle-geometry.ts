import {
  BufferGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Vector2,
} from "three";
import formula from "../../../assets/vehicles/formula.json";

export type BodyStation = readonly [
  z: number,
  halfWidth: number,
  bottom: number,
  top: number,
];

/** Closed original loft. Rounded sections share side normals; end caps stay flat. */
export function vehicleBodyGeometry(
  stations: readonly BodyStation[],
  rounded = false,
) {
  const section = rounded
    ? formula.section
    : [
        [-1, 0],
        [1, 0],
        [1, 1],
        [-1, 1],
      ];
  const count = section.length,
    positions: number[] = [],
    indices: number[] = [];
  for (const [z, width, bottom, top] of stations)
    for (const [x, y] of section)
      positions.push(x * width, bottom + y * (top - bottom), z);
  for (let i = 0; i < stations.length - 1; i++)
    for (let j = 0; j < count; j++) {
      const a = i * count + j,
        b = i * count + ((j + 1) % count);
      indices.push(a, b, a + count, b, b + count, a + count);
    }
  for (const end of [0, stations.length - 1]) {
    const start = positions.length / 3;
    for (let j = 0; j < count; j++)
      positions.push(
        ...positions.slice((end * count + j) * 3, (end * count + j + 1) * 3),
      );
    // Convex sections can be capped as a fan from their first vertex.
    for (let j = 1; j < count - 1; j++)
      indices.push(
        start,
        start + (end === 0 ? j + 1 : j),
        start + (end === 0 ? j : j + 1),
      );
  }
  const mesh = new BufferGeometry();
  mesh.setAttribute("position", new Float32BufferAttribute(positions, 3));
  mesh.setIndex(indices);
  const result = rounded ? mesh : mesh.toNonIndexed();
  if (result !== mesh) mesh.dispose();
  result.computeVertexNormals();
  return result;
}

/** Width and longitudinal stations scale from the selected physics profile. Heights are metres. */
export function formulaBodyStations(
  part: "chassis" | "sidepod" | "engineCover" | "floor",
  width: number,
  wheelbase: number,
): BodyStation[] {
  return formula[part].map(([z, halfWidth, bottom, top]) => [
    z * wheelbase,
    halfWidth * width,
    bottom,
    top,
  ]);
}

/** Smooth tyre shoulders preserve the exact rolling radius and overall width. */
export function vehicleTyreGeometry(radius: number, width: number) {
  return new LatheGeometry(
    [
      [0.57, -0.5],
      [0.84, -0.5],
      [0.965, -0.4],
      [1, -0.26],
      [1, 0.26],
      [0.965, 0.4],
      [0.84, 0.5],
      [0.57, 0.5],
      [0.57, -0.5],
    ].map(([r, x]) => new Vector2(r * radius, x * width)),
    32,
  );
}
