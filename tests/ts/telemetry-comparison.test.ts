import { describe, expect, it } from "vitest";
import {
  defaultSetup,
  type Lap,
  type Sample,
  type TimingReference,
} from "../../packages/shared/schema";
import { prepareTelemetryComparison } from "../../packages/telemetry";

function fixture(
  progress: number[],
  time: number[],
  distance: number[],
  speeds: number[],
): Lap {
  const samples: Sample[] = progress.map((_, i) => ({
    time: time[i],
    distance: distance[i],
    x: distance[i],
    y: 10,
    z: 0,
    speed: speeds[i],
    rpm: 4000,
    gear: Math.min(4, i + 1),
    throttle: 0.5,
    brake: 0.2,
    steering: 0,
    longitudinalG: 0,
    lateralG: 1,
    verticalG: 0,
    trackGradient: 0,
    offset: 0,
    cornerId: 0,
    sectorId: 1,
  }));
  return {
    schemaVersion: 1,
    trackId: "source-loop",
    vehicleId: "test-vehicle",
    setup: defaultSetup,
    model: "Original source-alignment fixture",
    lapTime: time.at(-1)!,
    length: distance.at(-1)!,
    maxSpeed: Math.max(...speeds),
    averageSpeed: distance.at(-1)! / time.at(-1)!,
    elevationRange: 0,
    computationMs: 0,
    warnings: [],
    optimization: { method: "Fixture", converged: true, iterations: 0 },
    alignment: { trackFingerprint: `sha256:${"a".repeat(64)}`, progress },
    samples,
    sectors: [],
    corners: [],
  };
}
const current = () =>
  fixture(
    [0, 0.2, 0.6, 0.8, 1],
    [0, 2, 7, 9, 10],
    [0, 8, 22, 34, 40],
    [10, 20, 30, 20, 10],
  );
const reference = () =>
  fixture(
    [0, 0.1, 0.4, 0.9, 1],
    [0, 2, 4, 9, 13],
    [0, 4, 20, 38, 48],
    [10, 80, 20, 40, 10],
  );

describe("source-aligned native telemetry", () => {
  it("preserves both grids and maps a reference-only peak onto current axes without rewriting native samples", () => {
    const a = current(),
      b = reference(),
      before = structuredClone([a, b]);
    const comparison = prepareTelemetryComparison(a, b)!;
    expect(comparison.points.map((point) => point.progress)).toEqual([
      0, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1,
    ]);
    expect(comparison.points.map((point) => point.time)).toEqual([
      0, 1, 2, 4.5, 7, 9, 9.5, 10,
    ]);
    expect(comparison.points.map((point) => point.distance)).toEqual([
      0, 4, 8, 15, 22, 34, 37, 40,
    ]);
    expect(comparison.points[1].sample).toEqual(b.samples[1]);
    expect(comparison.points[1].sample.speed).toBe(80);
    expect(comparison.points[1].sample.time).toBe(2);
    expect(comparison.points.at(-1)!.sample.time).toBe(13);
    expect(comparison.reference).toBe(b);
    expect([a, b]).toEqual(before);
  });
  it("interpolates continuous channels and steps gears at matching source positions on the shared cursor", () => {
    const comparison = prepareTelemetryComparison(current(), reference())!;
    expect(comparison.atTime(0.75).speed).toBeCloseTo(62.5, 12);
    expect(comparison.atTime(0.75).gear).toBe(1);
    expect(comparison.atTime(1).gear).toBe(2);
    expect(comparison.atTime(2).speed).toBeCloseTo(60, 12);
    expect(comparison.atTime(2).time).toBeCloseTo(8 / 3, 12);
    expect(comparison.atTime(4.5).gear).toBe(3);
    expect(comparison.atTime(-1)).toEqual(reference().samples[0]);
    expect(comparison.atTime(11)).toEqual(reference().samples.at(-1));
    expect(() => comparison.atTime(NaN)).toThrow(/finite/);
  });
  it("keeps channel correspondence under independent lap-time and line-length scaling", () => {
    const a = current(),
      b = reference();
    a.length *= 3;
    a.samples = a.samples.map((sample) => ({
      ...sample,
      distance: sample.distance * 3,
    }));
    b.lapTime *= 2;
    b.samples = b.samples.map((sample) => ({
      ...sample,
      time: sample.time * 2,
    }));
    const original = prepareTelemetryComparison(current(), reference())!;
    const scaled = prepareTelemetryComparison(a, b)!;
    scaled.points.forEach((point, i) => {
      expect(point.distance).toBeCloseTo(original.points[i].distance * 3, 12);
      expect(point.time).toBe(original.points[i].time);
      expect(point.sample.speed).toBe(original.points[i].sample.speed);
    });
    expect(scaled.atTime(2).speed).toBeCloseTo(60, 12);
    expect(scaled.atTime(2).time).toBeCloseTo(16 / 3, 12);
  });
  it("requires native channels and matching declared source identity", () => {
    const a = current(),
      b = reference();
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Timing fixture",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Original test fixture",
      trackId: b.trackId,
      lapTime: b.lapTime,
      units: { time: "s", progress: "fraction" },
      alignment: b.alignment!,
      samples: b.samples.map(({ time }) => ({ time })),
    };
    expect(prepareTelemetryComparison(a, null)).toBeNull();
    expect(prepareTelemetryComparison(a, timing)).toBeNull();
    expect(
      prepareTelemetryComparison({ ...a, alignment: undefined }, b),
    ).toBeNull();
    expect(
      prepareTelemetryComparison(a, { ...b, alignment: undefined }),
    ).toBeNull();
    b.alignment!.trackFingerprint = `sha256:${"b".repeat(64)}`;
    expect(prepareTelemetryComparison(a, b)).toBeNull();
  });
});
