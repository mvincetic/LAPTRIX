import { describe, expect, it } from "vitest";
import {
  defaultSetup,
  type Lap,
  type Sample,
  type TimingReference,
} from "../../packages/shared/schema";
import {
  ghostPose,
  PlaybackClock,
  alignedNativeReference,
} from "../../packages/telemetry";

function lap(scale = 1): Lap {
  const points = [
    [0, 0, 0, 0],
    [2, 10, 2, 0],
    [6, 10, 2, 10],
    [8, 0, 0, 10],
    [10, 0, 0, 0],
  ];
  const samples: Sample[] = points.map(([time, x, y, z], i) => ({
    time: time * scale,
    distance: i * 10,
    x,
    y,
    z,
    speed: 5,
    rpm: 4000,
    gear: 1,
    throttle: 1,
    brake: 0,
    steering: 0,
    longitudinalG: 0,
    lateralG: 0,
    verticalG: 0,
    trackGradient: 0,
    offset: 0,
    cornerId: 0,
    sectorId: 1,
  }));
  return {
    schemaVersion: 1,
    trackId: "test-loop",
    vehicleId: "test-vehicle",
    setup: defaultSetup,
    model: "Synthetic pose fixture",
    lapTime: 10 * scale,
    length: 40,
    maxSpeed: 5,
    averageSpeed: 4 / scale,
    elevationRange: 2,
    computationMs: 0,
    warnings: [],
    optimization: { method: "Test fixture", converged: true, iterations: 0 },
    alignment: {
      trackFingerprint: `sha256:${"a".repeat(64)}`,
      progress: [0, 0.25, 0.5, 0.75, 1],
    },
    samples,
    sectors: [],
    corners: [],
  };
}

describe("shared-clock ghost poses", () => {
  it("interpolates position and grade/yaw without changing source samples", () => {
    const source = lap(),
      before = structuredClone(source);
    const pose = ghostPose(source, 1);
    expect([pose.sample.x, pose.sample.y, pose.sample.z]).toEqual([5, 1, 0]);
    expect(pose.yaw).toBeCloseTo(Math.PI / 2, 12);
    expect(pose.pitch).toBeCloseTo(-Math.atan(0.2), 12);
    expect(pose.finished).toBe(false);
    expect(source).toEqual(before);
    expect(() => ghostPose(source, NaN)).toThrow(/finite/);
  });
  it("uses the same elapsed seconds for unequal laps, holds a finished reference, then restarts with the current clock", () => {
    const current = lap(1.4),
      reference = lap();
    const clock = new PlaybackClock();
    clock.configure(current.lapTime);
    clock.seek(1.4);
    expect(ghostPose(current, clock.getSnapshot().time).sample.x).toBeCloseTo(
      5,
      12,
    );
    expect(ghostPose(reference, clock.getSnapshot().time).sample.x).toBeCloseTo(
      7,
      12,
    );
    clock.seek(11);
    const finish = ghostPose(reference, clock.getSnapshot().time);
    expect(finish.sample.time).toBe(10);
    expect([finish.sample.x, finish.sample.y, finish.sample.z]).toEqual([
      0, 0, 0,
    ]);
    expect(finish.finished).toBe(true);
    expect(ghostPose(reference, 13)).toEqual(finish);
    expect(finish.yaw).toBeCloseTo(Math.PI / 2, 12);
    clock.play(true);
    clock.advance(4);
    expect(clock.getSnapshot().time).toBe(1);
    expect(ghostPose(reference, clock.getSnapshot().time).sample.x).toBe(5);
    expect(ghostPose(reference, -1).sample.time).toBe(0);
  });
  it("transforms heading and position consistently with translated, rotated source coordinates", () => {
    const source = lap(),
      rotated = structuredClone(source);
    rotated.samples = source.samples.map((sample) => ({
      ...sample,
      x: 100 - sample.z,
      y: sample.y + 40,
      z: sample.x - 30,
    }));
    const before = ghostPose(source, 1),
      after = ghostPose(rotated, 1);
    expect([after.sample.x, after.sample.y, after.sample.z]).toEqual([
      100, 41, -25,
    ]);
    expect(after.yaw).toBeCloseTo(before.yaw - Math.PI / 2, 12);
    expect(after.pitch).toBeCloseTo(before.pitch, 12);
  });
  it("accepts matching native sources across vehicles and rejects missing/mismatched source identity or timing-only data", () => {
    const current = lap(),
      reference = lap(1.4);
    reference.vehicleId = "other-vehicle";
    expect(alignedNativeReference(current, reference)).toBe(reference);
    expect(alignedNativeReference(null, reference)).toBeNull();
    expect(alignedNativeReference(current, null)).toBeNull();
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Synthetic timing",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Original test fixture",
      trackId: current.trackId,
      lapTime: current.lapTime,
      units: { time: "s", progress: "fraction" },
      alignment: current.alignment!,
      samples: current.samples.map(({ time }) => ({ time })),
    };
    expect(alignedNativeReference(current, timing)).toBeNull();
    reference.alignment!.trackFingerprint = `sha256:${"b".repeat(64)}`;
    expect(alignedNativeReference(current, reference)).toBeNull();
    delete reference.alignment;
    expect(alignedNativeReference(current, reference)).toBeNull();
    delete current.alignment;
    expect(alignedNativeReference(current, lap())).toBeNull();
  });
});
