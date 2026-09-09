import { describe, expect, it } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import {
  channelFraction,
  canPlotTelemetry,
  telemetryChannels,
  telemetryPath,
} from "../../apps/web/src/telemetryPlot";

const sample = (change: Partial<Sample> = {}): Sample => ({
  time: 0,
  distance: 0,
  x: 0,
  y: 5,
  z: 0,
  speed: 20,
  throttle: 0.5,
  brake: 0.2,
  rpm: 4000,
  gear: 2,
  steering: 0,
  longitudinalG: 0,
  lateralG: 1,
  verticalG: 0,
  trackGradient: 0,
  offset: 0,
  cornerId: 0,
  sectorId: 1,
  ...change,
});

describe("telemetry plot units and interpolation", () => {
  it("places signed zero guides on the same scale as the plotted channels", () => {
    const channels = telemetryChannels([
      sample({ lateralG: -6.2, y: -12 }),
      sample(),
    ]);
    const lateral = channels.find((channel) => channel.key === "lateralG")!;
    const elevation = channels.find((channel) => channel.key === "y")!;
    expect(channelFraction(lateral.min, lateral)).toBe(0);
    expect(channelFraction(lateral.max, lateral)).toBe(1);
    expect(channelFraction(0, lateral)).toBe(0.5);
    expect(channelFraction(0, elevation)).toBeCloseTo(2 / 3, 14);
    expect(
      telemetryPath(
        [{ time: 0.5, distance: 0.5, sample: sample({ y: 0 }) }],
        elevation,
        6,
        "time",
        1,
      ),
    ).toBe("M500.00,209.00");
  });
  it("uses common channel ranges for both laps after converting display units", () => {
    const samples = [
      sample(),
      sample({ speed: 80, rpm: 18000, gear: 10, lateralG: -6.2, y: -12 }),
    ];
    expect(
      telemetryChannels(samples).map((channel) => [
        channel.key,
        channel.min,
        channel.max,
      ]),
    ).toEqual([
      ["speed", 0, 290],
      ["throttle", 0, 100],
      ["brake", 0, 100],
      ["rpm", 0, 18000],
      ["gear", 0, 10],
      ["lateralG", -7, 7],
      ["y", -20, 10],
    ]);
    expect(canPlotTelemetry(samples)).toBe(true);
    expect(canPlotTelemetry([sample({ speed: Number.MAX_VALUE })])).toBe(false);
  });
  it("holds gear values until their mapped knot and uses plot axes independently of native sample timing", () => {
    const points = [0, 2, 4].map((time, i) => ({
      time,
      distance: [0, 10, 40][i],
      sample: sample({ time, gear: i + 1 }),
    }));
    const channels = telemetryChannels(points.map((point) => point.sample));
    const gear = channels.find((channel) => channel.key === "gear")!;
    expect(telemetryPath(points, gear, 0, "time", 4)).toBe(
      "M0.00,19.00 H500.00V11.00 H1000.00V3.00",
    );
    expect(telemetryPath(points, gear, 0, "distance", 40)).toBe(
      "M0.00,19.00 H250.00V11.00 H1000.00V3.00",
    );
    const mapped = points.map((point, i) => ({ ...point, time: [0, 1, 4][i] }));
    expect(telemetryPath(mapped, gear, 0, "time", 4)).toBe(
      "M0.00,19.00 H250.00V11.00 H1000.00V3.00",
    );
    expect(mapped[1].sample.time).toBe(2);
    const speed = channels.find((channel) => channel.key === "speed")!;
    expect(telemetryPath(points, speed, 0, "time", 4)).toBe(
      "M0.00,5.40 L500.00,5.40 L1000.00,5.40",
    );
  });
  it("normalizes finite signed ranges without overflowing their difference", () => {
    const samples = [
      sample({ lateralG: -1e308, y: -1e308 }),
      sample({ lateralG: 1e308, y: 1e308 }),
    ];
    const points = samples.map((sample, i) => ({
      time: i,
      distance: i,
      sample,
    }));
    for (const channel of telemetryChannels(samples).filter((channel) =>
      ["lateralG", "y"].includes(channel.key),
    )) {
      expect(Number.isFinite(channel.min)).toBe(true);
      expect(Number.isFinite(channel.max)).toBe(true);
      expect(telemetryPath(points, channel, 0, "time", 1)).toBe(
        "M0.00,27.00 L1000.00,3.00",
      );
    }
  });
});
