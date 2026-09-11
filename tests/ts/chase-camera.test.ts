import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import type { Sample } from "../../packages/shared/schema";
import {
  CHASE_FOV,
  VEHICLE_SURFACE_LIFT,
  chaseCameraPose,
} from "../../apps/web/src/chase-camera";

function circle(grade = false) {
  const length = 200 * Math.PI;
  const samples: Sample[] = Array.from({ length: 401 }, (_, i) => {
    const angle = (i / 400) * 2 * Math.PI;
    return {
      time: ((i / 400) * length) / 20,
      distance: (i / 400) * length,
      x: 100 * Math.sin(angle),
      y: grade ? 20 * Math.sin(angle) : 0,
      z: 100 * Math.cos(angle),
      speed: 20,
      rpm: 4000,
      gear: 2,
      throttle: 1,
      brake: 0,
      steering: 0.035,
      longitudinalG: 0,
      lateralG: 0,
      verticalG: 0,
      trackGradient: 0,
      offset: 0,
      cornerId: 1,
      sectorId: 1,
    };
  });
  samples.at(-1)!.x = samples[0].x;
  samples.at(-1)!.y = samples[0].y;
  samples.at(-1)!.z = samples[0].z;
  return { samples, length };
}

describe("deterministic telemetry chase camera", () => {
  it("follows a physical distance behind an analytical circle and looks ahead with bounded height", () => {
    const lap = circle(),
      before = structuredClone(lap);
    const pose = chaseCameraPose(lap, 1.75);
    expect(pose.position[0]).toBeCloseTo(100 * Math.sin((35 - 17.2) / 100), 2);
    expect(pose.position[2]).toBeCloseTo(100 * Math.cos((35 - 17.2) / 100), 2);
    expect(pose.position[1]).toBeCloseTo(4.66 + VEHICLE_SURFACE_LIFT, 12);
    expect(pose.target[0]).toBeCloseTo(
      65 * Math.sin(35 / 100) + 35 * Math.sin((35 + 11.6) / 100),
      2,
    );
    expect(pose.target[2]).toBeCloseTo(
      65 * Math.cos(35 / 100) + 35 * Math.cos((35 + 11.6) / 100),
      2,
    );
    expect(lap).toEqual(before);
  });
  it("is continuous at the finish, invariant to seek history and clamps paused endpoints", () => {
    const lap = circle(true),
      end = lap.samples.at(-1)!.time;
    const zero = chaseCameraPose(lap, 0);
    expect(chaseCameraPose(lap, end)).toEqual(zero);
    expect(chaseCameraPose(lap, end + 100)).toEqual(zero);
    expect(chaseCameraPose(lap, -1)).toEqual(zero);
    const exact = chaseCameraPose(lap, 2.1234);
    chaseCameraPose(lap, end - 0.1);
    chaseCameraPose(lap, 0.1);
    expect(chaseCameraPose(lap, 2.1234)).toEqual(exact);
    expect(
      new Vector3(...chaseCameraPose(lap, end - 1e-5).position).distanceTo(
        new Vector3(...zero.position),
      ),
    ).toBeLessThan(0.001);
    expect(() => chaseCameraPose(lap, NaN)).toThrow(/finite/);
  });
  it("preserves a translated scene and keeps the vehicle inside desktop, phone and short camera projections", () => {
    const lap = circle(),
      translated = {
        ...lap,
        samples: lap.samples.map((s) => ({
          ...s,
          x: s.x + 23000,
          y: s.y + 500,
          z: s.z - 41000,
        })),
      };
    const time = 5,
      a = chaseCameraPose(lap, time),
      b = chaseCameraPose(translated, time);
    for (const field of ["position", "target"] as const) {
      const delta = new Vector3(...b[field]).sub(new Vector3(...a[field]));
      expect(delta.x).toBeCloseTo(23000, 8);
      expect(delta.y).toBeCloseTo(500, 8);
      expect(delta.z).toBeCloseTo(-41000, 8);
    }
    const angle = (time * 20) / 100;
    for (const aspect of [2.6, 1.8, 0.9]) {
      const camera = new PerspectiveCamera(CHASE_FOV, aspect, 0.2, 10000);
      camera.position.set(...a.position);
      camera.lookAt(...a.target);
      camera.updateMatrixWorld();
      for (const x of [-1, 1])
        for (const y of [0, 1.4])
          for (const z of [-2.5, 2.5]) {
            const point = new Vector3(
              100 * Math.sin(angle) + x,
              y + VEHICLE_SURFACE_LIFT,
              100 * Math.cos(angle) + z,
            ).project(camera);
            expect(Math.abs(point.x)).toBeLessThan(1);
            expect(Math.abs(point.y)).toBeLessThan(1);
            expect(Math.abs(point.z)).toBeLessThan(1);
          }
    }
  });
  it("retains the complete car through tight hairpins on a long lap at phone aspect", () => {
    for (const radius of [12, 20, 35]) {
      const straight = 400,
        arc = Math.PI * radius;
      const length = straight * 2 + arc * 2;
      const base = circle().samples[0];
      const samples = Array.from({ length: 1601 }, (_, i) => {
        const s = (i / 1600) * length;
        let x: number, z: number;
        if (s < straight) {
          x = 0;
          z = s;
        } else if (s < straight + arc) {
          const angle = (s - straight) / radius;
          x = radius * (1 - Math.cos(angle));
          z = straight + radius * Math.sin(angle);
        } else if (s < straight * 2 + arc) {
          x = radius * 2;
          z = straight * 2 + arc - s;
        } else {
          const angle = (s - straight * 2 - arc) / radius;
          x = radius * (1 + Math.cos(angle));
          z = -radius * Math.sin(angle);
        }
        return { ...base, x, z, time: s / 20, distance: s };
      });
      for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const angle = Math.PI * fraction;
        const pose = chaseCameraPose(
          { samples, length },
          (straight + arc * fraction) / 20,
        );
        const camera = new PerspectiveCamera(CHASE_FOV, 0.9, 0.2, 10000);
        camera.position.set(...pose.position);
        camera.lookAt(...pose.target);
        camera.updateMatrixWorld();
        for (const x of [-1, 1])
          for (const y of [0, 1.4])
            for (const z of [-2.7, 2.7]) {
              const point = new Vector3(
                radius * (1 - Math.cos(angle)) +
                  x * Math.cos(angle) +
                  z * Math.sin(angle),
                y + VEHICLE_SURFACE_LIFT,
                straight +
                  radius * Math.sin(angle) -
                  x * Math.sin(angle) +
                  z * Math.cos(angle),
              ).project(camera);
              expect(
                Math.max(
                  Math.abs(point.x),
                  Math.abs(point.y),
                  Math.abs(point.z),
                ),
              ).toBeLessThan(1);
            }
      }
    }
  });
});
