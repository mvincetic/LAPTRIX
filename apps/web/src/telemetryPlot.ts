import type { Sample } from "../../../packages/shared/schema";

export type Channel = {
  key: keyof Sample;
  label: string;
  unit: string;
  min: number;
  max: number;
  color: string;
  scale?: number;
};
export type PlotPoint = { time: number; distance: number; sample: Sample };
const definitions: Channel[] = [
  {
    key: "speed",
    label: "Speed",
    unit: "km/h",
    min: 0,
    max: 360,
    color: "#1474f5",
    scale: 3.6,
  },
  {
    key: "throttle",
    label: "Throttle",
    unit: "%",
    min: 0,
    max: 100,
    color: "#1474f5",
    scale: 100,
  },
  {
    key: "brake",
    label: "Brake",
    unit: "%",
    min: 0,
    max: 100,
    color: "#f44751",
    scale: 100,
  },
  {
    key: "rpm",
    label: "Engine",
    unit: "rpm",
    min: 0,
    max: 13000,
    color: "#7c68b5",
  },
  { key: "gear", label: "Gear", unit: "", min: 0, max: 8, color: "#45799c" },
  {
    key: "lateralG",
    label: "Lateral G",
    unit: "G",
    min: -5,
    max: 5,
    color: "#1474f5",
  },
  {
    key: "y",
    label: "Elevation",
    unit: "m",
    min: 0,
    max: 100,
    color: "#8c9aab",
  },
];

export const canPlotTelemetry = (samples: Sample[]) =>
  samples.every((sample) =>
    definitions.every((channel) =>
      Number.isFinite(sample[channel.key] * (channel.scale ?? 1)),
    ),
  );

export function telemetryChannels(samples: Sample[]): Channel[] {
  if (!samples.length) return definitions;
  return definitions.map((channel) => {
    if (channel.key === "throttle" || channel.key === "brake") return channel;
    let low = Infinity,
      high = -Infinity;
    for (const sample of samples) {
      const value = sample[channel.key] * (channel.scale ?? 1);
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (channel.key === "lateralG") {
      const max = Math.max(
        1,
        Math.ceil(Math.max(Math.abs(low), Math.abs(high))),
      );
      return { ...channel, min: -max, max };
    }
    const step = channel.key === "rpm" ? 1000 : channel.key === "gear" ? 1 : 10;
    const roundedLow = Math.floor(low / step) * step;
    const roundedHigh = Math.ceil(high / step) * step;
    const min =
      channel.key === "y"
        ? Number.isFinite(roundedLow)
          ? roundedLow
          : low
        : 0;
    return {
      ...channel,
      min,
      max: Math.max(
        min + step,
        Number.isFinite(roundedHigh) ? roundedHigh : high,
      ),
    };
  });
}

/** Axes belong to the current lap; point.sample retains its original telemetry. */
export function telemetryPath(
  points: PlotPoint[],
  channel: Channel,
  row: number,
  axis: "time" | "distance",
  extent: number,
) {
  // Normalize before subtracting so very large finite signed ranges cannot overflow.
  const magnitude = Math.max(Math.abs(channel.min), Math.abs(channel.max), 1);
  const range = channel.max / magnitude - channel.min / magnitude;
  return points
    .map((point, i) => {
      const x = ((point[axis] / extent) * 1000).toFixed(2);
      const value = point.sample[channel.key] * (channel.scale ?? 1);
      const fraction =
        range > 0 ? (value / magnitude - channel.min / magnitude) / range : 0.5;
      const y = (row * 33 + 27 - fraction * 24).toFixed(2);
      return i === 0
        ? `M${x},${y}`
        : channel.key === "gear"
          ? `H${x}V${y}`
          : `L${x},${y}`;
    })
    .join(" ");
}
