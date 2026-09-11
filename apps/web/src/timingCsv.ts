import {
  timingReferenceSchema,
  type TimingReference,
} from "../../../packages/shared/schema";

import type { TimingCsvData } from "./timingCsvData";
export {
  parseTimingCsv,
  prepareTimingCsv,
  type TimingCsvData,
  type TimingCsvSelection,
  type TimingCsvTable,
} from "./timingCsvData";

export type TimingCsvMetadata = Pick<
  TimingReference,
  "label" | "vehicleLabel" | "origin" | "source"
>;

export function timingCsvReference(
  data: TimingCsvData,
  metadata: TimingCsvMetadata,
  trackId: string,
  fingerprint: string,
): TimingReference {
  return timingReferenceSchema.parse({
    format: "laptrix-timing-reference-v1",
    ...metadata,
    label: metadata.label.trim(),
    vehicleLabel: metadata.vehicleLabel.trim(),
    source: metadata.source.trim(),
    trackId,
    lapTime: data.lapTime,
    units: { time: "s", progress: "fraction" },
    alignment: { trackFingerprint: fingerprint, progress: data.progress },
    samples: data.samples,
  });
}
