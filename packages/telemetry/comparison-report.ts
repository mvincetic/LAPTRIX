import {
  isTimingReference,
  type Lap,
  type Reference,
  type Sample,
} from "../shared/schema";
import { interpolate, prepareTimeComparison } from "./index";

export const comparisonSampleUnits = {
  time: "s",
  distance: "m",
  x: "m",
  y: "m",
  z: "m",
  speed: "m/s",
  rpm: "rpm",
  gear: "integer",
  throttle: "fraction",
  brake: "fraction",
  steering: "rad",
  longitudinalG: "g0",
  lateralG: "g0",
  verticalG: "g0",
  normalLoadG: "vehicle-weight-ratio",
  trackGradient: "rise/3D-distance",
  cornerId: "integer",
  sectorId: "integer",
  offset: "m",
} satisfies Record<keyof Sample, string>;

type ComparedTelemetry = Omit<Sample, "verticalG" | "normalLoadG"> &
  Partial<Pick<Sample, "verticalG" | "normalLoadG">>;

function knownSample(lap: Lap, sample: Sample): ComparedTelemetry {
  const result: ComparedTelemetry = { ...sample };
  if (!lap.verticalDynamics) {
    delete result.verticalG;
    delete result.normalLoadG;
  }
  return result;
}

/** Export validated inputs on the same merged source grid used by Time Delta. */
export function buildComparisonReport(
  current: Lap,
  reference: Reference | null,
  exportedAt: string,
) {
  const comparison = prepareTimeComparison(current, reference);
  if (!comparison || !reference) return null;
  const timingOnly = isTimingReference(reference);
  const samples = comparison.samples.map((point) => ({
    progress: point.progress,
    current: knownSample(current, {
      ...interpolate(current.samples, point.time),
      time: point.time,
      distance: point.distance,
    }),
    reference: timingOnly
      ? { time: point.referenceTime }
      : knownSample(
          reference,
          interpolate(reference.samples, point.referenceTime),
        ),
    deltaTime: point.delta,
  }));
  return {
    format: "laptrix-comparison-v1" as const,
    exportedAt,
    scope: "full-lap" as const,
    basis: "source-progress" as const,
    sourceTrackFingerprint: current.alignment!.trackFingerprint,
    referenceKind: timingOnly ? ("timing-only" as const) : ("native" as const),
    deltaConvention: "current-minus-reference" as const,
    interpolation: { continuous: "linear", gearAndIds: "left-step" },
    units: {
      progress: "fraction",
      deltaTime: "s",
      summary: { currentLapTime: "s", referenceLapTime: "s", deltaTime: "s" },
      sample: { ...comparisonSampleUnits },
    },
    standardGravity: { value: 9.81, unit: "m/s²" },
    availableFields: {
      current: Object.keys(samples[0].current),
      reference: Object.keys(samples[0].reference),
    },
    summary: {
      currentLapTime: current.lapTime,
      referenceLapTime: reference.lapTime,
      deltaTime: current.lapTime - reference.lapTime,
    },
    inputs: structuredClone({ current, reference }),
    samples,
  };
}
