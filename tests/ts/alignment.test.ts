import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import {
  defaultSetup,
  lapSchema,
  trackSchema,
  type Lap,
  type TimingReference,
} from "../../packages/shared/schema";
import { trackFingerprint } from "../../packages/track-engine";
import {
  cornerDelta,
  lapDeltaAt,
  referenceSectorTimes,
  prepareTimeComparison,
} from "../../packages/telemetry";
import { restoreReference } from "../../apps/web/src/reference";

const fingerprint =
  "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689";
const track = trackSchema.parse(data);
function lap(progress: number[], times: number[]): Lap {
  return {
    schemaVersion: 1,
    trackId: track.id,
    vehicleId: "formula-development",
    setup: defaultSetup,
    model: "Test fixture",
    lapTime: times.at(-1)!,
    length: 100,
    maxSpeed: 10,
    averageSpeed: 10,
    elevationRange: 0,
    computationMs: 1,
    warnings: [],
    optimization: { method: "Test", converged: true, iterations: 0 },
    alignment: { trackFingerprint: fingerprint, progress },
    samples: progress.map((p, i) => ({
      distance: p * 100,
      time: times[i],
      x: 0,
      y: 0,
      z: 0,
      speed: 10,
      rpm: 4000,
      gear: 1,
      throttle: 1,
      brake: 0,
      steering: 0,
      longitudinalG: 0,
      lateralG: 0,
      verticalG: 0,
      trackGradient: 0,
      cornerId: 0,
      sectorId: 1,
      offset: 0,
    })),
    corners: [],
    sectors: [
      {
        id: 1,
        time: times.at(-1)! / 2,
        split: times.at(-1)! / 2,
        startDistance: 0,
        endDistance: 50,
      },
      {
        id: 2,
        time: times.at(-1)! / 2,
        split: times.at(-1)!,
        startDistance: 50,
        endDistance: 100,
      },
    ],
  };
}

describe("physical track alignment across solver grids", () => {
  it("preserves reference breakpoints and exact cursor deltas between unequal grids", () => {
    const current = lap([0, 0.2, 0.6, 1], [0, 4, 8, 12]);
    const reference = lap([0, 0.1, 0.5, 0.8, 1], [0, 1, 5, 11, 15]);
    const prepared = prepareTimeComparison(current, reference)!;
    expect(prepared.samples.map((s) => s.distance)).toEqual([
      0, 10, 20, 50, 60, 80, 100,
    ]);
    expect(prepared.samples[1].delta).toBeCloseTo(1);
    expect(prepared.samples[5].delta).toBeCloseTo(-1);
    expect(prepared.atTime(2)).toBeCloseTo(1);
    expect(prepared.atTime(10)).toBeCloseTo(-1);
    expect(prepared.atDistance(50)).toBeCloseTo(2);
    expect(prepared.atTime(-10)).toBe(0);
    expect(prepared.atTime(50)).toBe(-3);
    expect(() => prepared.atTime(NaN)).toThrow();
    reference.alignment!.trackFingerprint = `sha256:${"0".repeat(64)}`;
    expect(prepareTimeComparison(current, reference)).toBeNull();
  });
  it("uses current physical sector gates for timing-only references without inventing channels", () => {
    const current = lap([0, 0.2, 0.6, 1], [0, 4, 8, 12]);
    current.samples[1].distance = 10;
    current.samples[2].distance = 80;
    const reference: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Independent timing",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Hand-calculated test data",
      trackId: track.id,
      lapTime: 15,
      units: { time: "s", progress: "fraction" },
      alignment: {
        trackFingerprint: fingerprint,
        progress: [0, 0.1, 0.5, 0.8, 1],
      },
      samples: [0, 1, 5, 11, 15].map((time) => ({ time })),
    };
    const sectors = referenceSectorTimes(current, reference);
    expect(sectors[0]).toBeCloseTo(30 / 7, 10);
    expect(sectors[0]! + sectors[1]!).toBeCloseTo(15, 10);
    reference.alignment.trackFingerprint = `sha256:${"0".repeat(64)}`;
    expect(referenceSectorTimes(current, reference)).toEqual([null, null]);
    expect(lapDeltaAt(current, reference, 50)).toBeNull();
  });
  it("matches the Python fingerprint byte layout and notices changed geometry", async () => {
    expect(await trackFingerprint(track)).toBe(fingerprint);
    expect(await trackFingerprint({ ...track, name: "Another name" })).toBe(
      fingerprint,
    );
    const changed = structuredClone(track);
    changed.points[10].z += 0.1;
    expect(await trackFingerprint(changed)).not.toBe(fingerprint);
  });
  it("compares the same physical corner window across unequal sample arrays", () => {
    const current = lap([0, 0.2, 0.6, 1], [0, 4, 8, 12]);
    const reference = lap([0, 0.1, 0.5, 0.8, 1], [0, 1, 5, 11, 15]);
    const corner = {
      id: 1,
      direction: "L" as const,
      entryIndex: 1,
      exitIndex: 2,
      apexIndex: 2,
      brakingIndex: 0,
      turnInIndex: 1,
      throttleIndex: 2,
      distance: 60,
      entrySpeed: 10,
      minSpeed: 10,
      exitSpeed: 10,
      lateralG: 1,
      brakingDistance: 5,
      time: 4,
    };
    expect(cornerDelta(current, reference, corner)).toBeCloseTo(-1, 10);
    current.samples[1].distance = 10;
    current.samples[2].distance = 80;
    expect(lapDeltaAt(current, reference, 45)).toBeCloseTo(2, 10);
    reference.alignment!.trackFingerprint = `sha256:${"0".repeat(64)}`;
    expect(cornerDelta(current, reference, corner)).toBeNull();
  });
  it("rejects alignment arrays with an incomplete seam, bad length or reversed progress", () => {
    const p = Array.from({ length: 41 }, (_, i) => i / 40);
    const valid = lap(
      p,
      p.map((x) => x * 10),
    );
    expect(lapSchema.safeParse(valid).success).toBe(true);
    for (const progress of [
      p.slice(1),
      [...p.slice(0, -1), 0.99],
      p.map((v, i) => (i === 5 ? 0.01 : v)),
    ]) {
      expect(
        lapSchema.safeParse({
          ...valid,
          alignment: { trackFingerprint: fingerprint, progress },
        }).success,
      ).toBe(false);
    }
  });
  it("validates declared closed corner events and retains legacy interval rules", () => {
    const progress = Array.from({ length: 41 }, (_, i) => i / 40);
    const current = lap(
      progress,
      progress.map((value) => value * 10),
    );
    current.cornerAnalysis = "closed-windows-v1";
    current.corners = [
      {
        id: 1,
        direction: "L",
        brakingIndex: 35,
        entryIndex: 38,
        turnInIndex: 38,
        apexIndex: 0,
        throttleIndex: 2,
        exitIndex: 4,
        distance: 0,
        entrySpeed: 10,
        minSpeed: 10,
        exitSpeed: 10,
        lateralG: 1,
        brakingDistance: 12.5,
        time: 1.5,
      },
    ];
    expect(lapSchema.safeParse(current).success).toBe(true);
    for (const change of [
      { apexIndex: 40 },
      { entryIndex: -1 },
      { throttleIndex: 39 },
      { turnInIndex: 3 },
      { brakingIndex: 3 },
      { time: 11.5 },
      { time: 0 },
      { brakingDistance: 0 },
      { distance: 1 },
    ]) {
      const altered = structuredClone(current);
      Object.assign(altered.corners[0], change);
      expect(lapSchema.safeParse(altered).success, JSON.stringify(change)).toBe(
        false,
      );
    }
    const undeclared = structuredClone(current);
    delete undeclared.cornerAnalysis;
    expect(lapSchema.safeParse(undeclared).success).toBe(false);
    undeclared.corners[0] = {
      ...undeclared.corners[0],
      brakingIndex: 0,
      entryIndex: 1,
      turnInIndex: 1,
      apexIndex: 2,
      throttleIndex: 3,
      exitIndex: 4,
    };
    // Historical corner estimates are retained literally, without retrofitting new metrics.
    expect(lapSchema.parse(undeclared).corners).toEqual(undeclared.corners);
  });
  it("compares wrapped physical corner intervals against native and timing references", () => {
    const current = lap([0, 0.2, 0.6, 0.8, 1], [0, 4, 8, 10, 12]);
    current.cornerAnalysis = "closed-windows-v1";
    const reference = lap([0, 0.1, 0.5, 0.8, 1], [0, 1, 5, 11, 15]);
    const corner = {
      id: 1,
      direction: "L" as const,
      entryIndex: 2,
      exitIndex: 1,
      apexIndex: 0,
      brakingIndex: 2,
      turnInIndex: 2,
      throttleIndex: 0,
      distance: 0,
      entrySpeed: 10,
      minSpeed: 10,
      exitSpeed: 10,
      lateralG: 1,
      brakingDistance: 40,
      time: 8,
    };
    // Current: (12 - 8) + 4 = 8 s. Reference: (15 - 7) + 2 = 10 s.
    expect(cornerDelta(current, reference, corner)).toBeCloseTo(-2, 12);
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Known timing",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Independent intervals",
      trackId: track.id,
      lapTime: reference.lapTime,
      units: { time: "s", progress: "fraction" },
      alignment: reference.alignment!,
      samples: reference.samples.map(({ time }) => ({ time })),
    };
    expect(cornerDelta(current, timing, corner)).toBeCloseTo(-2, 12);
    expect(cornerDelta(current, current, corner)).toBe(0);
    timing.alignment = {
      ...timing.alignment,
      trackFingerprint: `sha256:${"0".repeat(64)}`,
    };
    expect(cornerDelta(current, timing, corner)).toBeNull();
  });
  it("restores a different-resolution reference only for the matching source", async () => {
    const ref = lap([0, 0.5, 1], [0, 5, 10]);
    ref.sectors = [...ref.sectors, { ...ref.sectors[1], id: 3 }];
    expect(await restoreReference(ref, track)).toBe(ref);
    const changed = structuredClone(track);
    changed.points[0].widthRight -= 1;
    expect(await restoreReference(ref, changed)).toBeNull();
  });
  it("verifies actual legacy positions before migrating their index correspondence", async () => {
    const progress = Array.from(
      { length: track.points.length + 1 },
      (_, i) => i / track.points.length,
    );
    const ref = lap(
      progress,
      progress.map((p) => p * 10),
    );
    ref.alignment = undefined;
    ref.samples.forEach((s, i) =>
      Object.assign(s, track.points[i % track.points.length]),
    );
    ref.sectors = [...ref.sectors, { ...ref.sectors[1], id: 3 }];
    const restored = await restoreReference(ref, track);
    expect(restored?.alignment?.trackFingerprint).toBe(fingerprint);
    expect(restored?.alignment?.progress.at(-1)).toBe(1);
    ref.samples[20].x += 1;
    expect(await restoreReference(ref, track)).toBeNull();
  });
});
