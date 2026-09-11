import { describe, expect, it } from "vitest";
import { Euler, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import formulaData from "../../data/vehicles/formula-development.json" with { type: "json" };
import gtData from "../../data/vehicles/gt-development.json" with { type: "json" };
import { vehicleSchema, type Sample } from "../../packages/shared/schema";
import { ghostPose } from "../../packages/telemetry";
import {
  onboardCameraPose,
  onboardMount,
  ONBOARD_FOV,
} from "../../apps/web/src/onboard-camera";

function circle() {
  const samples: Sample[] = Array.from({ length: 401 }, (_, i) => {
    const angle = (i / 400) * Math.PI * 2;
    return {
      time: (i / 400) * 10 * Math.PI,
      distance: (i / 400) * 200 * Math.PI,
      x: 100 * Math.sin(angle),
      y: 20 * Math.sin(angle),
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
  Object.assign(samples.at(-1)!, {
    x: samples[0].x,
    y: samples[0].y,
    z: samples[0].z,
  });
  return { samples, lapTime: samples.at(-1)!.time };
}

describe("vehicle-mounted onboard camera", () => {
  for (const [vehicle, height, forward] of [
    [vehicleSchema.parse(formulaData), 1.18, -0.45],
    [vehicleSchema.parse(gtData), 1.48, -0.12],
  ] as const)
    it(`keeps the ${vehicle.bodyStyle} mount aligned with the actual body frame`, () => {
      const lap = circle(),
        before = structuredClone(lap),
        time = 3.127;
      const body = ghostPose(lap, time),
        camera = onboardCameraPose(lap, time, vehicle);
      // Independently undo the rendered body's Three.js transform.
      const frame = new Matrix4()
        .compose(
          new Vector3(body.sample.x, body.sample.y + 0.58, body.sample.z),
          new Quaternion().setFromEuler(
            new Euler(body.pitch, body.yaw, 0, "YXZ"),
          ),
          new Vector3(1, 1, 1),
        )
        .invert();
      const local = new Vector3(...camera.position).applyMatrix4(frame);
      expect(local.x).toBeCloseTo(0, 10);
      expect(local.y).toBeCloseTo(height, 10);
      expect(local.z).toBeCloseTo(forward, 10);
      const aim = new Vector3(...camera.target).applyMatrix4(frame).sub(local);
      expect(aim.x).toBeCloseTo(0, 10);
      expect(aim.y).toBeCloseTo(0, 10);
      expect(aim.z).toBeCloseTo(30, 10);
      expect(lap).toEqual(before);
    });

  it("preserves source translation and keeps the horizon level at different grades", () => {
    const lap = circle(),
      shift = new Vector3(23000, 500, -41000);
    const moved = {
      ...lap,
      samples: lap.samples.map((s) => ({
        ...s,
        x: s.x + shift.x,
        y: s.y + shift.y,
        z: s.z + shift.z,
      })),
    };
    for (const time of [0, 3.2, 9.7, 20, 30]) {
      const a = onboardCameraPose(lap, time),
        b = onboardCameraPose(moved, time);
      expect(
        new Vector3(...b.position)
          .sub(shift)
          .distanceTo(new Vector3(...a.position)),
      ).toBeLessThan(1e-8);
      expect(
        new Vector3(...b.target)
          .sub(shift)
          .distanceTo(new Vector3(...a.target)),
      ).toBeLessThan(1e-8);
      const camera = new PerspectiveCamera(ONBOARD_FOV, 1, 0.08, 12000);
      camera.position.set(...a.position);
      camera.lookAt(...a.target);
      expect(
        Math.abs(new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).y),
      ).toBeLessThan(1e-12);
    }
  });

  it("is deterministic through seeking, paused endpoints and the closed finish", () => {
    const lap = circle(),
      zero = onboardCameraPose(lap, 0),
      exact = onboardCameraPose(lap, 2.123);
    onboardCameraPose(lap, 29);
    onboardCameraPose(lap, 1);
    expect(onboardCameraPose(lap, 2.123)).toEqual(exact);
    expect(onboardCameraPose(lap, -1)).toEqual(zero);
    for (const time of [lap.lapTime, lap.lapTime + 100]) {
      const end = onboardCameraPose(lap, time);
      expect(
        new Vector3(...end.position).distanceTo(new Vector3(...zero.position)),
      ).toBeLessThan(1e-10);
      expect(
        new Vector3(...end.target).distanceTo(new Vector3(...zero.target)),
      ).toBeLessThan(1e-10);
    }
    expect(
      new Vector3(
        ...onboardCameraPose(lap, lap.lapTime - 1e-5).position,
      ).distanceTo(new Vector3(...zero.position)),
    ).toBeLessThan(0.001);
    for (const time of [NaN, Infinity])
      expect(() => onboardCameraPose(lap, time)).toThrow(/finite/);
  });

  it("keeps a positive mount reserve above unusually large visual wheels", () => {
    const vehicle = { ...vehicleSchema.parse(gtData), wheelRadius: 0.7 };
    expect(onboardMount(vehicle).height).toBeCloseTo(1.62, 12);
    const lap = { ...circle(), vehicle };
    expect(onboardCameraPose(lap, 2)).toEqual(
      onboardCameraPose(lap, 2, vehicle),
    );
  });
});
