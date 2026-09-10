import { describe, expect, it } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import {
  canPlotTelemetry,
  channelDigits,
  channelFraction,
  channelValue,
  referenceChannelKeys,
  telemetryChannels,
  telemetryPath,
} from "../../apps/web/src/telemetryPlot";

const sample = (change: Partial<Sample> = {}): Sample => ({
  time: 0,
  distance: 0,
  x: 0,
  y: 0,
  z: 0,
  speed: 20,
  throttle: 0.5,
  brake: 0,
  rpm: 4000,
  gear: 2,
  steering: 0,
  longitudinalG: 0,
  lateralG: 0,
  verticalG: 0,
  normalLoadG: 1,
  trackGradient: 0,
  offset: 0,
  cornerId: 0,
  sectorId: 1,
  ...change,
});
const model = { verticalDynamics: "quasi-steady-road-normal-v1" as const };
const current = [
  sample({ verticalG: -0.12, normalLoadG: 0.8, trackGradient: -0.02 }),
  sample({ verticalG: 0.28, normalLoadG: 1.4, trackGradient: 0.035 }),
];

describe("loads and elevation graph contracts", () => {
  it("retains the existing seven-channel overview and its display precision", () => {
    const channels = telemetryChannels(current);
    expect(channels.map((channel) => channel.key)).toEqual([
      "speed",
      "throttle",
      "brake",
      "rpm",
      "gear",
      "lateralG",
      "y",
    ]);
    expect(channels.map(channelDigits)).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });
  it("uses fractional signed scales, weight units, a one-weight guide and slope percent", () => {
    const channels = telemetryChannels(current, "loads");
    expect(channels.map((channel) => channel.key)).toEqual([
      "speed",
      "longitudinalG",
      "lateralG",
      "verticalG",
      "normalLoadG",
      "trackGradient",
      "y",
    ]);
    expect(channels[3]).toMatchObject({
      min: -0.3,
      max: 0.3,
      unit: "G",
      digits: 3,
    });
    expect(channels[4]).toMatchObject({
      min: 0,
      max: 1.5,
      unit: "× weight",
      digits: 3,
      guide: 1,
    });
    expect(channelFraction(1, channels[4])).toBeCloseTo(2 / 3, 14);
    expect(channels[5]).toMatchObject({
      min: -4,
      max: 4,
      unit: "%",
      digits: 2,
    });
    expect(channelValue(current[1], channels[5])).toBeCloseTo(3.5, 14);
  });
  it("includes reference-only peaks in shared scales without changing either sample array", () => {
    const reference = [
      sample({ verticalG: 0.87, normalLoadG: 2.8, speed: 60 }),
    ];
    const before = structuredClone({ current, reference });
    const keys = referenceChannelKeys(model, reference, "loads");
    const channels = telemetryChannels(current, "loads", {
      samples: reference,
      keys,
    });
    expect(keys).toHaveLength(7);
    expect(channels[0].max).toBe(220);
    expect(channels[3]).toMatchObject({ min: -0.9, max: 0.9 });
    expect(channels[4].max).toBe(3);
    expect({ current, reference }).toEqual(before);
  });
  it("keeps ordinary legacy-reference curves while excluding undeclared vertical/load values", () => {
    const reference = [sample({ speed: 60, verticalG: 50, normalLoadG: 50 })];
    const keys = referenceChannelKeys({}, reference, "loads");
    expect(keys).toEqual([
      "speed",
      "longitudinalG",
      "lateralG",
      "trackGradient",
      "y",
    ]);
    const channels = telemetryChannels(current, "loads", {
      samples: reference,
      keys,
    });
    expect(channels[0].max).toBe(220);
    expect(channels[3]).toMatchObject({ min: -0.3, max: 0.3 });
    expect(channels[4].max).toBe(1.5);
  });
  it("limits reference availability per channel after missing data or display conversion overflow", () => {
    const reference = [
      sample({ speed: Number.MAX_VALUE, normalLoadG: undefined }),
    ];
    expect(canPlotTelemetry(reference)).toBe(false);
    expect(referenceChannelKeys(model, reference, "loads")).toEqual([
      "longitudinalG",
      "lateralG",
      "verticalG",
      "trackGradient",
      "y",
    ]);
    expect(referenceChannelKeys(null, reference, "loads")).toEqual([]);
    expect(referenceChannelKeys(model, [], "loads")).toEqual([]);
  });
  it("plots native load values on independently mapped current-lap axes", () => {
    const samples = [
      sample({ time: 0, normalLoadG: 0.5 }),
      sample({ time: 3, normalLoadG: 1.5 }),
      sample({ time: 5, normalLoadG: 0.5 }),
    ];
    const points = samples.map((sample, i) => ({
      time: [0, 1, 4][i],
      distance: i * 20,
      sample,
    }));
    const channel = { ...telemetryChannels(samples, "loads")[4], max: 2 };
    expect(telemetryPath(points, channel, 4, "time", 4)).toBe(
      "M0.00,153.00 L250.00,141.00 L1000.00,153.00",
    );
    expect(telemetryPath(points, channel, 4, "distance", 40)).toBe(
      "M0.00,153.00 L500.00,141.00 L1000.00,153.00",
    );
    expect(points[1].sample.time).toBe(3);
  });
  it("breaks a path at missing values instead of inventing zeros or joining across a gap", () => {
    const samples = [
      sample({ normalLoadG: 0.5 }),
      sample({ normalLoadG: undefined }),
      sample({ normalLoadG: 0.5 }),
    ];
    const points = samples.map((sample, i) => ({
      time: i,
      distance: i,
      sample,
    }));
    const channel = { ...telemetryChannels(samples, "loads")[4], max: 2 };
    expect(telemetryPath(points, channel, 4, "time", 2)).toBe(
      "M0.00,153.00 M1000.00,153.00",
    );
    expect(telemetryPath(points, channel, 4, "time", 0)).toBe("");
    expect(
      telemetryPath(
        [{ time: Infinity, distance: 0, sample: samples[0] }],
        channel,
        4,
        "time",
        2,
      ),
    ).toBe("");
  });
  it("keeps finite extreme load domains and path coordinates", () => {
    const samples = [
      sample({ verticalG: -1e308, normalLoadG: 1e308 }),
      sample({ verticalG: 1e308, normalLoadG: 1e308 }),
    ];
    const channels = telemetryChannels(samples, "loads");
    for (const channel of channels.filter((channel) =>
      ["normalLoadG", "verticalG"].includes(channel.key),
    )) {
      expect(Number.isFinite(channel.min) && Number.isFinite(channel.max)).toBe(
        true,
      );
      const path = telemetryPath(
        samples.map((sample, time) => ({ sample, time, distance: time })),
        channel,
        0,
        "time",
        1,
      );
      expect(path).not.toMatch(/NaN|Infinity/);
      expect(path).toMatch(/^M/);
    }
  });
});
