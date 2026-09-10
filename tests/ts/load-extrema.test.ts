import { describe, expect, it } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import { loadExtrema } from "../../apps/web/src/loadExtrema";

const sample = (change: Partial<Sample> = {}): Sample => ({
  time: 0,
  distance: 0,
  x: 0,
  y: 0,
  z: 0,
  speed: 30,
  rpm: 5000,
  gear: 2,
  throttle: 1,
  brake: 0,
  steering: 0,
  longitudinalG: 0,
  lateralG: 0,
  verticalG: 0,
  normalLoadG: 1,
  trackGradient: 0,
  cornerId: 0,
  sectorId: 1,
  offset: 0,
  ...change,
});
const declared = { verticalDynamics: "quasi-steady-road-normal-v1" as const };

describe("exact current-lap load extrema", () => {
  it("retains independent channel extrema as the original exact samples without changing data", () => {
    const samples = [
      sample(),
      sample({
        time: 1.23456789,
        distance: 37,
        verticalG: 0.4,
        normalLoadG: 0.2,
      }),
      sample({ time: 5, distance: 90, normalLoadG: 3 }),
      sample({ time: 9, distance: 140, verticalG: -0.8 }),
    ];
    const before = structuredClone(samples);
    const extremes = loadExtrema({ ...declared, samples });
    expect(
      extremes.map((extreme) => [extreme.id, extreme.value, extreme.unit]),
    ).toEqual([
      ["min-load", 0.2, "× weight"],
      ["max-load", 3, "× weight"],
      ["min-vertical", -0.8, "G"],
      ["max-vertical", 0.4, "G"],
    ]);
    for (const [index, source] of [1, 2, 3, 1].entries())
      expect(extremes[index].sample).toBe(samples[source]);
    expect(extremes[0].sample.time).toBe(1.23456789);
    expect(samples).toEqual(before);
  });
  it("retains the first sample for tied values, including the duplicate closing endpoint", () => {
    const first = sample();
    const samples = [
      first,
      sample({ time: 10, distance: 100 }),
      sample({ time: 20, distance: 200 }),
    ];
    for (const extreme of loadExtrema({ ...declared, samples }))
      expect(extreme.sample).toBe(first);
  });
  it("does not turn undeclared values or an empty lap into modelled extrema", () => {
    expect(loadExtrema({ samples: [sample()] })).toEqual([]);
    expect(loadExtrema({ ...declared, samples: [] })).toEqual([]);
    expect(loadExtrema(null)).toEqual([]);
  });
  it("does not select a valid-looking subset from incomplete or nonfinite declared channels", () => {
    for (const change of [
      { normalLoadG: undefined },
      { normalLoadG: 0 },
      { normalLoadG: -1 },
      { normalLoadG: Infinity },
      { verticalG: NaN },
    ]) {
      expect(
        loadExtrema({ ...declared, samples: [sample(), sample(change)] }),
      ).toEqual([]);
    }
  });
});
