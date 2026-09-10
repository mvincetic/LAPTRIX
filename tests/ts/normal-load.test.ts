import { describe, expect, it } from "vitest";
import {
  defaultSetup,
  lapSchema,
  type Lap,
  type Sample,
} from "../../packages/shared/schema";
import { interpolate } from "../../packages/telemetry";

function legacy(): Lap {
  return {
    schemaVersion: 1,
    trackId: "contract-circle",
    vehicleId: "contract-vehicle",
    setup: { ...defaultSetup },
    model: "Original flat contract fixture",
    lapTime: 40,
    length: 400,
    maxSpeed: 10,
    averageSpeed: 10,
    elevationRange: 0,
    computationMs: 0,
    warnings: [],
    optimization: {
      method: "Contract fixture",
      converged: true,
      iterations: 0,
    },
    numericalChecks: {
      speedConverged: true,
      maxDemandRatio: 1,
      demandTolerance: 1.015,
    },
    samples: Array.from({ length: 41 }, (_, i) => ({
      distance: i * 10,
      time: i,
      x: (400 / (2 * Math.PI)) * Math.cos((i * 2 * Math.PI) / 40),
      y: 0,
      z: (400 / (2 * Math.PI)) * Math.sin((i * 2 * Math.PI) / 40),
      speed: 10,
      rpm: 4000,
      gear: 1,
      throttle: 0.1,
      brake: 0,
      steering: 0,
      longitudinalG: 0,
      lateralG: 0.1,
      verticalG: 0,
      trackGradient: 0,
      cornerId: 0,
      sectorId: i < 20 ? 1 : 2,
      offset: 0,
    })),
    sectors: [
      { id: 1, time: 20, split: 20, startDistance: 0, endDistance: 200 },
      { id: 2, time: 20, split: 40, startDistance: 200, endDistance: 400 },
    ],
    corners: [],
  };
}

function current(): Lap {
  const lap = legacy();
  lap.verticalDynamics = "quasi-steady-road-normal-v1";
  lap.samples = lap.samples.map((sample) => ({ ...sample, normalLoadG: 1 }));
  lap.numericalChecks!.minNormalLoadG = 1;
  return lap;
}

describe("declared vertical dynamics and native-file compatibility", () => {
  it("retains legacy reserved zeros without inventing a model or load channel", () => {
    const before = legacy();
    const restored = lapSchema.parse(JSON.parse(JSON.stringify(before)));
    expect(restored).toEqual(before);
    expect(restored).not.toHaveProperty("verticalDynamics");
    expect(restored.samples[0]).not.toHaveProperty("normalLoadG");
  });
  it("preserves the declared model, all load samples and minimum through JSON", () => {
    const before = current();
    expect(lapSchema.parse(JSON.parse(JSON.stringify(before)))).toEqual(before);
  });
  it.each([0, -0.01, NaN, Infinity])(
    "rejects a nonpositive or nonfinite load: %s",
    (load) => {
      const lap = current();
      lap.samples[3].normalLoadG = load;
      expect(lapSchema.safeParse(lap).success).toBe(false);
    },
  );
  it.each<[string, (lap: Lap) => void]>([
    [
      "one missing sample",
      (lap) => {
        delete lap.samples[3].normalLoadG;
      },
    ],
    [
      "all missing samples",
      (lap) => {
        for (const sample of lap.samples) delete sample.normalLoadG;
      },
    ],
    [
      "missing minimum",
      (lap) => {
        delete lap.numericalChecks!.minNormalLoadG;
      },
    ],
    [
      "incorrect minimum",
      (lap) => {
        lap.numericalChecks!.minNormalLoadG = 1.01;
      },
    ],
    [
      "missing model declaration",
      (lap) => {
        delete lap.verticalDynamics;
      },
    ],
  ])("rejects incomplete or contradictory load data: %s", (_, change) => {
    const lap = current();
    change(lap);
    expect(lapSchema.safeParse(lap).success).toBe(false);
  });
  it("rejects unsupported dynamics declarations and load summaries on legacy data", () => {
    expect(
      lapSchema.safeParse({ ...current(), verticalDynamics: "unknown" })
        .success,
    ).toBe(false);
    const lap = legacy();
    lap.numericalChecks!.minNormalLoadG = 1;
    expect(lapSchema.safeParse(lap).success).toBe(false);
  });
});

describe("authoritative vertical/load interpolation", () => {
  const base = legacy().samples[0];
  const samples: Sample[] = [
    { ...base, time: 0, distance: 0, verticalG: -0.2, normalLoadG: 0.8 },
    { ...base, time: 10, distance: 100, verticalG: 0.4, normalLoadG: 1.4 },
  ];
  it("interpolates both signed acceleration and load on either shared axis", () => {
    const before = structuredClone(samples);
    const atTime = interpolate(samples, 5);
    expect(atTime.verticalG).toBeCloseTo(0.1, 12);
    expect(atTime.normalLoadG).toBeCloseTo(1.1, 12);
    expect(interpolate(samples, 50, "distance")).toEqual(atTime);
    expect(samples).toEqual(before);
  });
  it.each([0, 1])("does not fill a missing load at endpoint %s", (endpoint) => {
    const incomplete = structuredClone(samples);
    delete incomplete[endpoint].normalLoadG;
    const before = structuredClone(incomplete);
    expect(interpolate(incomplete, 5)).not.toHaveProperty("normalLoadG");
    expect(incomplete).toEqual(before);
  });
});
