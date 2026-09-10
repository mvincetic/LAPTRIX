import type { Lap, Sample } from "../../../packages/shared/schema";

export type LoadExtreme = {
  id: string;
  label: string;
  unit: string;
  value: number;
  sample: Sample;
};

/** Preserve exact current-lap samples; equal extrema retain the earliest sample. */
export function loadExtrema(
  lap: Pick<Lap, "verticalDynamics" | "samples"> | null,
): LoadExtreme[] {
  if (!lap?.verticalDynamics || !lap.samples.length) return [];
  if (
    lap.samples.some(
      (sample) =>
        !Number.isFinite(sample.verticalG) ||
        !Number.isFinite(sample.normalLoadG) ||
        !(sample.normalLoadG! > 0),
    )
  )
    return [];
  const first = lap.samples[0];
  let minLoad = first,
    maxLoad = first,
    minVertical = first,
    maxVertical = first;
  for (const sample of lap.samples) {
    if (sample.normalLoadG! < minLoad.normalLoadG!) minLoad = sample;
    if (sample.normalLoadG! > maxLoad.normalLoadG!) maxLoad = sample;
    if (sample.verticalG < minVertical.verticalG) minVertical = sample;
    if (sample.verticalG > maxVertical.verticalG) maxVertical = sample;
  }
  return [
    {
      id: "min-load",
      label: "Minimum tyre load",
      unit: "× weight",
      value: minLoad.normalLoadG!,
      sample: minLoad,
    },
    {
      id: "max-load",
      label: "Maximum tyre load",
      unit: "× weight",
      value: maxLoad.normalLoadG!,
      sample: maxLoad,
    },
    {
      id: "min-vertical",
      label: "Minimum vertical G",
      unit: "G",
      value: minVertical.verticalG,
      sample: minVertical,
    },
    {
      id: "max-vertical",
      label: "Maximum vertical G",
      unit: "G",
      value: maxVertical.verticalG,
      sample: maxVertical,
    },
  ];
}
