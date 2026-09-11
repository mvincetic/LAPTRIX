import { expect, it } from "vitest";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  gtBodyGeometry,
  gtCabinGeometry,
  gtDimensions,
  gtGlassGeometry,
} from "../../apps/web/src/gt-geometry";
import { closedSurface } from "./mesh-assertions";

it("presents outward-facing GT caps, sides, roof and floor to external rays", () => {
  const geometry = gtBodyGeometry(1.9, 2.457, 0.36);
  const material = new MeshBasicMaterial(),
    mesh = new Mesh(geometry, material);
  for (const [origin, direction, distance] of [
    [[0, 0.45, 3], [0, 0, -1], 3 - 4.157 / 2],
    [[0, 0.45, -3], [0, 0, 1], 3 - 4.157 / 2],
    [[0, 2, 0], [0, -1, 0], 2 - 0.795],
    [[0, -1, 0], [0, 1, 0], 1.2],
    [[2, 0.55, 0], [-1, 0, 0], 2 - 0.465 * 1.9],
    [[-2, 0.55, 0], [1, 0, 0], 2 - 0.465 * 1.9],
  ] as const) {
    const hit = new Raycaster(
      new Vector3(...origin),
      new Vector3(...direction),
    ).intersectObject(mesh)[0];
    expect(hit?.distance).toBeCloseTo(distance, 6);
  }
  geometry.dispose();
  material.dispose();
});

it("keeps the coupe skin and cabin closed, oriented and within metre-scale profile bounds", () => {
  for (const [width, wheelbase, radius] of [
    [1.6, 2.3, 0.28],
    [1.9, 2.457, 0.36],
    [2.2, 3.3, 0.39],
  ]) {
    const { length } = gtDimensions(width, wheelbase, radius);
    for (const geometry of [
      gtBodyGeometry(width, wheelbase, radius),
      gtCabinGeometry(width, length),
    ]) {
      closedSurface(geometry);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      expect(box.min.y).toBeGreaterThan(0.19);
      expect(box.max.y).toBeLessThan(1.31);
      expect(box.max.x).toBeLessThanOrEqual(width / 2 + 1e-6);
      expect(box.min.x).toBeCloseTo(-box.max.x, 6);
      expect(
        Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
      ).toBeLessThanOrEqual(length / 2 + 1e-6);
      expect(geometry.index!.count / 3).toBeLessThan(1700);
      geometry.dispose();
    }
  }
});

it("clears every wheel circumference across profile sizes while retaining the central floor", () => {
  for (const [width, wheelbase, radius] of [
    [1.6, 2.3, 0.28],
    [1.9, 2.457, 0.36],
    [2.2, 3.3, 0.39],
  ]) {
    const geometry = gtBodyGeometry(width, wheelbase, radius);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    const tyreWidth = Math.min(width * 0.19, radius * 1.2);
    for (const side of [-1, 1])
      for (const axle of [-wheelbase / 2, wheelbase / 2])
        for (let i = 0; i < 128; i++) {
          const angle = (i / 128) * Math.PI * 2;
          const ray = new Raycaster(
            new Vector3(
              side * (width / 2 + 0.2),
              radius + Math.sin(angle) * radius,
              axle + Math.cos(angle) * radius,
            ),
            new Vector3(-side, 0, 0),
          );
          const hit = ray.intersectObject(mesh)[0];
          if (hit)
            expect(Math.abs(hit.point.x)).toBeLessThan(
              width / 2 - tyreWidth - 0.005,
            );
        }
    const floor = new Raycaster(
      new Vector3(0, -1, 0),
      new Vector3(0, 1, 0),
    ).intersectObject(mesh)[0];
    expect(floor.point.y).toBeCloseTo(0.2, 6);
    geometry.dispose();
    material.dispose();
  }
});

it("joins glass strips into exactly six continuous windows without cracks between their facets", () => {
  const geometry = gtGlassGeometry(1.9, 4.157);
  const position = geometry.getAttribute("position");
  const parent = new Map<string, string>();
  const root = (key: string): string =>
    parent.get(key) === key ? key : root(parent.get(key)!);
  const key = (i: number) =>
    [position.getX(i), position.getY(i), position.getZ(i)]
      .map((v) => v.toFixed(7))
      .join(",");
  for (let i = 0; i < position.count; i += 3) {
    const vertices = [key(i), key(i + 1), key(i + 2)];
    for (const v of vertices) if (!parent.has(v)) parent.set(v, v);
    for (const v of vertices.slice(1)) parent.set(root(v), root(vertices[0]));
  }
  expect(new Set([...parent.keys()].map(root)).size).toBe(6);
  for (const normal of geometry.getAttribute("normal").array)
    expect(Number.isFinite(normal)).toBe(true);
  geometry.dispose();
});
