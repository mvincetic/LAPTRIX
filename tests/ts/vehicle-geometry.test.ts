import { describe, expect, it } from "vitest";
import { closedSurface } from "./mesh-assertions";
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  formulaBodyStations,
  vehicleBodyGeometry,
  vehicleTyreGeometry,
} from "../../apps/web/src/vehicle-geometry";

describe("original vehicle surfaces", () => {
  it("closes rounded body sides and flat caps with outward facing surfaces", () => {
    const geometry = vehicleBodyGeometry(
      [
        [-2, 1, 0.2, 1.2],
        [2, 1, 0.2, 1.2],
      ],
      true,
    );
    closedSurface(geometry);
    const material = new MeshBasicMaterial(),
      mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const hits = [
      [[0, 0.7, 3], [0, 0, -1], 1],
      [[0, 0.7, -3], [0, 0, 1], 1],
      [[0, 2, 0], [0, -1, 0], 0.8],
      [[0, -1, 0], [0, 1, 0], 1.2],
      [[2, 0.6, 0], [-1, 0, 0], 1],
      [[-2, 0.6, 0], [1, 0, 0], 1],
    ] as const;
    for (const [origin, direction, distance] of hits) {
      const hit = new Raycaster(
        new Vector3(...origin),
        new Vector3(...direction),
      ).intersectObject(mesh)[0];
      expect(hit?.distance).toBeCloseTo(distance, 6);
    }
    geometry.dispose();
    material.dispose();
  });

  it("keeps original Formula contours closed and inside the physical width across profile scales", () => {
    for (const [width, wheelbase] of [
      [1.6, 2.3],
      [2, 3.6],
      [2.4, 4.2],
    ])
      for (const part of [
        "chassis",
        "sidepod",
        "engineCover",
        "floor",
      ] as const) {
        const stations = formulaBodyStations(part, width, wheelbase),
          snapshot = structuredClone(stations);
        const geometry = vehicleBodyGeometry(stations, part !== "floor");
        closedSurface(geometry);
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox!;
        expect(bounds.min.y).toBeGreaterThanOrEqual(0.1);
        expect(bounds.max.y).toBeLessThan(1.08);
        expect(
          bounds.max.x + (part === "sidepod" ? width * 0.31 : 0),
        ).toBeLessThan(width / 2);
        expect(bounds.max.z).toBeLessThanOrEqual(wheelbase * 0.7);
        expect(stations).toEqual(snapshot);
        geometry.dispose();
      }
  });

  it("preserves tyre radius, road tangent and width while rounding the shoulders", () => {
    for (const [radius, width] of [
      [0.28, 0.3],
      [0.34, 0.38],
      [0.36, 0.361],
      [0.45, 0.48],
    ]) {
      const geometry = vehicleTyreGeometry(radius, width);
      geometry.rotateZ(Math.PI / 2);
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      expect(bounds.min.x).toBeCloseTo(-width / 2, 6);
      expect(bounds.max.x).toBeCloseTo(width / 2, 6);
      expect(bounds.min.y + radius).toBeCloseTo(0, 6);
      expect(bounds.max.y).toBeCloseTo(radius, 6);
      expect(bounds.min.z).toBeCloseTo(-radius, 6);
      expect(bounds.max.z).toBeCloseTo(radius, 6);
      const p = geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        const radial = Math.hypot(p.getY(i), p.getZ(i));
        expect(radial).toBeLessThanOrEqual(radius + 1e-7);
        if (Math.abs(p.getX(i)) > width * 0.48)
          expect(radial).toBeLessThan(radius * 0.85);
      }
      expect(geometry.index!.count / 3).toBeLessThanOrEqual(512);
      geometry.dispose();
    }
  });
});
