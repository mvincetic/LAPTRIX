import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import {
  defaultSetup,
  lapSchema,
  trackSchema,
  type Lap,
} from "../../packages/shared/schema";
import { trackFingerprint } from "../../packages/track-engine";
import { cornerDelta, lapDeltaAt } from "../../packages/telemetry";
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
  it("restores a different-resolution reference only for the matching source", async () => {
    const ref = lap([0, 0.5, 1], [0, 5, 10]);
    ref.sectors = [...ref.sectors, { ...ref.sectors[1], id: 3 }];
    expect(await restoreReference(ref, track, ref.vehicleId)).toBe(ref);
    const changed = structuredClone(track);
    changed.points[0].widthRight -= 1;
    expect(await restoreReference(ref, changed, ref.vehicleId)).toBeNull();
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
    const restored = await restoreReference(ref, track, ref.vehicleId);
    expect(restored?.alignment?.trackFingerprint).toBe(fingerprint);
    expect(restored?.alignment?.progress.at(-1)).toBe(1);
    ref.samples[20].x += 1;
    expect(await restoreReference(ref, track, ref.vehicleId)).toBeNull();
  });
});
