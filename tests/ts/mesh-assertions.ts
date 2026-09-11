import { expect } from "vitest";
import { Vector3, type BufferGeometry } from "three";

export function closedSurface(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position"),
    index = geometry.index;
  const edges = new Map<string, { balance: number; count: number }>();
  const vertex = (i: number) =>
    new Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);
  const key = (v: Vector3) =>
    v
      .toArray()
      .map((x) => x.toFixed(6))
      .join(",");
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const points = [vertex(i), vertex(i + 1), vertex(i + 2)];
    expect(
      points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]))
        .length(),
    ).toBeGreaterThan(1e-9);
    for (let j = 0; j < 3; j++) {
      const a = key(points[j]),
        b = key(points[(j + 1) % 3]);
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      const previous = edges.get(edge) ?? { balance: 0, count: 0 };
      edges.set(edge, {
        balance: previous.balance + (a < b ? 1 : -1),
        count: previous.count + 1,
      });
    }
  }
  expect(
    [...edges.values()].every(
      ({ balance, count }) => balance === 0 && count === 2,
    ),
  ).toBe(true);
  for (const normal of geometry.getAttribute("normal").array)
    expect(Number.isFinite(normal)).toBe(true);
}
