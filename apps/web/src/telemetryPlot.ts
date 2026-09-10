import type { Lap, Sample } from "../../../packages/shared/schema";

export type Channel = {
  key: keyof Sample;
  label: string;
  unit: string;
  min: number;
  max: number;
  color: string;
  scale?: number;
  digits?: number;
  symmetric?: boolean;
  rangeStep?: number;
  requiresVerticalModel?: boolean;
  guide?: number;
};
export type TelemetryGroup = "overview" | "loads";
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

const loadDefinitions: Channel[] = [
  definitions[0],
  {
    key: "longitudinalG",
    label: "Longitudinal G",
    unit: "G",
    min: -1,
    max: 1,
    color: "#7c68b5",
    digits: 3,
    symmetric: true,
    rangeStep: 0.1,
  },
  { ...definitions[5], digits: 3, rangeStep: 0.1 },
  {
    key: "verticalG",
    label: "Vertical G",
    unit: "G",
    min: -0.1,
    max: 0.1,
    color: "#1474f5",
    digits: 3,
    symmetric: true,
    rangeStep: 0.1,
    requiresVerticalModel: true,
  },
  {
    key: "normalLoadG",
    label: "Normal tyre load",
    unit: "× weight",
    min: 0,
    max: 1.25,
    color: "#078b73",
    digits: 3,
    requiresVerticalModel: true,
    guide: 1,
  },
  {
    key: "trackGradient",
    label: "Track gradient",
    unit: "%",
    min: -1,
    max: 1,
    color: "#45799c",
    scale: 100,
    digits: 2,
    symmetric: true,
  },
  definitions[6],
];
const groupDefinitions = (group: TelemetryGroup) =>
  group === "loads" ? loadDefinitions : definitions;

export function channelValue(sample: Sample, channel: Channel) {
  const raw = sample[channel.key];
  const value = raw === undefined ? undefined : raw * (channel.scale ?? 1);
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

export const channelDigits = (channel: Channel) =>
  channel.digits ?? (channel.key === "lateralG" ? 1 : 0);

/** Eligibility is per channel so older native references retain their known curves. */
export function referenceChannelKeys(
  reference: Pick<Lap, "verticalDynamics"> | null,
  samples: Sample[],
  group: TelemetryGroup,
) {
  if (!reference || !samples.length) return [];
  return groupDefinitions(group)
    .filter(
      (channel) =>
        (!channel.requiresVerticalModel || !!reference.verticalDynamics) &&
        samples.every((sample) => channelValue(sample, channel) !== undefined),
    )
    .map((channel) => channel.key);
}

export const canPlotTelemetry = (samples: Sample[]) =>
  samples.every((sample) =>
    definitions.every((channel) => channelValue(sample, channel) !== undefined),
  );

export function telemetryChannels(
  samples: Sample[],
  group: TelemetryGroup = "overview",
  reference?: { samples: Sample[]; keys: (keyof Sample)[] },
): Channel[] {
  return groupDefinitions(group).map((channel) => {
    if (channel.key === "throttle" || channel.key === "brake") return channel;
    let low = Infinity,
      high = -Infinity;
    const included = reference?.keys.includes(channel.key)
      ? [...samples, ...reference.samples]
      : samples;
    for (const sample of included) {
      const value = channelValue(sample, channel);
      if (value === undefined) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (!Number.isFinite(low) || !Number.isFinite(high)) return channel;
    if (channel.key === "lateralG" || channel.symmetric) {
      const peak = Math.max(Math.abs(low), Math.abs(high));
      const step = peak >= 1 ? 1 : (channel.rangeStep ?? 1);
      const rounded =
        step === 0.1 ? Math.ceil(peak * 10) / 10 : Math.ceil(peak);
      const max = Math.max(step, Number.isFinite(rounded) ? rounded : peak);
      return { ...channel, min: -max, max };
    }
    if (channel.key === "normalLoadG") {
      const rounded = Math.ceil(high / 0.25) * 0.25;
      return {
        ...channel,
        min: 0,
        max: Math.max(1.25, Number.isFinite(rounded) ? rounded : high),
      };
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

/** Shared display-unit mapping for curves, scale labels and zero guides. */
export function channelFraction(value: number, channel: Channel) {
  const magnitude = Math.max(Math.abs(channel.min), Math.abs(channel.max), 1);
  const range = channel.max / magnitude - channel.min / magnitude;
  return range > 0
    ? (value / magnitude - channel.min / magnitude) / range
    : 0.5;
}

/** Axes belong to the current lap; point.sample retains its original telemetry. */
export function telemetryPath(
  points: PlotPoint[],
  channel: Channel,
  row: number,
  axis: "time" | "distance",
  extent: number,
) {
  if (!Number.isFinite(extent) || extent <= 0) return "";
  let connected = false;
  const commands: string[] = [];
  for (const point of points) {
    const value = channelValue(point.sample, channel);
    if (value === undefined || !Number.isFinite(point[axis])) {
      connected = false;
      continue;
    }
    const xPosition = (point[axis] / extent) * 1000;
    const fraction = channelFraction(value, channel);
    const yPosition = row * 33 + 27 - fraction * 24;
    if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition)) {
      connected = false;
      continue;
    }
    const x = xPosition.toFixed(2),
      y = yPosition.toFixed(2);
    commands.push(
      !connected
        ? `M${x},${y}`
        : channel.key === "gear"
          ? `H${x}V${y}`
          : `L${x},${y}`,
    );
    connected = true;
  }
  return commands.join(" ");
}
