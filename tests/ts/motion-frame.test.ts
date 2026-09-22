import { describe, expect, it } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import { ghostPose, interpolate } from "../../packages/telemetry";
import { motionFrame } from "../../packages/telemetry/motion-frame";

const angleDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
function circle(nonuniform = false, grade = 0) {
  const radius = 50,
    count = 32,
    speed = 12;
  const samples = Array.from({ length: count + 1 }, (_, i) => {
    const base = (i * Math.PI * 2) / count,
      angle = base + (nonuniform ? 0.2 * Math.sin(base) : 0),
      distance = radius * angle;
    return {
      time: distance / speed,
      distance,
      x: radius * Math.sin(angle),
      y: grade * Math.sin(angle),
      z: radius * Math.cos(angle),
      speed,
      rpm: 4000,
      gear: 2,
      throttle: 1,
      brake: 0,
      steering: 0.12 * Math.sin(2 * angle),
      longitudinalG: 0,
      lateralG: 0,
      verticalG: 0,
      trackGradient: 0,
      offset: 0,
      cornerId: 0,
      sectorId: 1,
    } satisfies Sample;
  });
  Object.assign(samples.at(-1)!, {
    x: samples[0].x,
    y: samples[0].y,
    z: samples[0].z,
    steering: samples[0].steering,
  });
  return { samples, lapTime: samples.at(-1)!.time };
}

describe("continuous telemetry-derived visual frames", () => {
  it("turns steadily on a sparsely sampled circle instead of holding then snapping at nodes", () => {
    const lap = circle(),
      dt = 1 / 120;
    let prior = ghostPose(lap, 0);
    for (let time = dt; time < lap.lapTime; time += dt) {
      const pose = ghostPose(lap, time);
      // A cubic approximates this circle; heading now follows its actual tangent
      // rather than imposing a perfect circle on a polygonal vehicle position.
      expect(
        Math.abs(angleDifference(pose.yaw, prior.yaw) / dt - 12 / 50),
      ).toBeLessThan(0.001);
      expect(
        angleDifference(pose.yaw, Math.PI / 2 + pose.sample.distance / 50),
      ).toBeCloseTo(0, 3);
      prior = pose;
    }
  });

  it("keeps yaw, grade and steering derivatives continuous at nonuniform sample boundaries and the finish", () => {
    const { samples } = circle(true, 8),
      end = samples.at(-1)!.distance,
      eps = 0.0001;
    for (const sample of samples.slice(0, -1)) {
      const at = sample.distance,
        before = motionFrame(samples, at === 0 ? end - eps : at - eps),
        exact = motionFrame(samples, at),
        after = motionFrame(samples, at + eps);
      for (const field of ["yaw", "pitch", "steering"] as const) {
        const left = angleDifference(exact[field], before[field]) / eps,
          right = angleDifference(after[field], exact[field]) / eps;
        expect(Math.abs(right - left)).toBeLessThan(0.0001);
      }
    }
    const first = motionFrame(samples, 0),
      last = motionFrame(samples, end);
    expect(angleDifference(first.yaw, last.yaw)).toBeCloseTo(0, 12);
    expect(first.pitch).toBeCloseTo(last.pitch, 12);
    expect(first.steering).toBe(last.steering);
  });

  it("retains steering at every native sample and never overshoots each adjacent pair", () => {
    const { samples } = circle(true);
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i],
        b = samples[i + 1];
      expect(motionFrame(samples, a.distance).steering).toBeCloseTo(
        a.steering,
        12,
      );
      for (let step = 0; step <= 20; step++) {
        const steering = motionFrame(
          samples,
          a.distance + ((b.distance - a.distance) * step) / 20,
        ).steering;
        expect(steering).toBeGreaterThanOrEqual(
          Math.min(a.steering, b.steering) - 1e-12,
        );
        expect(steering).toBeLessThanOrEqual(
          Math.max(a.steering, b.steering) + 1e-12,
        );
      }
    }
  });

  it("preserves all authoritative channels and derives identical poses regardless of playback or seek history", () => {
    const lap = circle(true, 6),
      original = structuredClone(lap);
    lap.samples.forEach(Object.freeze);
    Object.freeze(lap.samples);
    for (const time of [0, 0.0321, 8.125, lap.lapTime, lap.lapTime + 5, -1]) {
      const first = ghostPose(lap, time);
      ghostPose(lap, 12);
      ghostPose(lap, 0);
      expect(ghostPose(lap, time)).toEqual(first);
      expect(first.sample).toEqual(
        interpolate(lap.samples, Math.max(0, Math.min(lap.lapTime, time))),
      );
    }
    expect(lap).toEqual(original);
    const slower = {
      samples: lap.samples.map((s) => ({
        ...s,
        time: s.time * 3,
        speed: s.speed / 3,
      })),
      lapTime: lap.lapTime * 3,
    };
    const a = ghostPose(lap, 8.125),
      b = ghostPose(slower, 8.125 * 3);
    expect(a.yaw).toBeCloseTo(b.yaw, 12);
    expect(a.pitch).toBeCloseTo(b.pitch, 12);
    expect(a.steering).toBeCloseTo(b.steering, 12);
  });

  it("follows analytical grade and preserves orientation through translation and rotation across the angle seam", () => {
    const { samples } = circle(false, 8),
      rotation = 2.8,
      c = Math.cos(rotation),
      s = Math.sin(rotation);
    const moved = samples.map((p) => ({
      ...p,
      x: p.x * c + p.z * s + 12000,
      z: -p.x * s + p.z * c - 8000,
      y: p.y + 400,
    }));
    for (const sample of samples) {
      const a = motionFrame(samples, sample.distance),
        b = motionFrame(moved, sample.distance);
      expect(a.pitch).toBeCloseTo(
        -Math.atan((8 / 50) * Math.cos(sample.distance / 50)),
        10,
      );
      expect(angleDifference(b.yaw, a.yaw + rotation)).toBeCloseTo(0, 10);
      expect(a.pitch).toBeCloseTo(b.pitch, 10);
    }
  });

  it("handles short open traces and a stationary sample without fabricating a closing direction", () => {
    const base = circle().samples[0],
      samples = [base, { ...base, x: 10, y: 2, distance: 10, time: 1 }];
    for (const distance of [-1, 0, 5, 10, 20]) {
      const pose = motionFrame(samples, distance);
      expect(pose.yaw).toBeCloseTo(Math.PI / 2, 12);
      expect(pose.pitch).toBeCloseTo(-Math.atan(0.2), 12);
    }
    expect(motionFrame([base], 0)).toEqual({
      yaw: 0,
      pitch: -0,
      steering: base.steering,
    });
    expect(() => motionFrame([], 0)).toThrow();
    expect(() => motionFrame(samples, NaN)).toThrow();
  });
});
