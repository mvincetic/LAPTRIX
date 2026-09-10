import type { Sample } from "../shared/schema";
import type { buildComparisonReport } from "./comparison-report";

export type ComparisonReport = NonNullable<
  ReturnType<typeof buildComparisonReport>
>;

/** Stable canonical units; every populated data cell is numeric. */
export const comparisonCsvFields = {
  time: "time_s",
  distance: "distance_m",
  x: "x_m",
  y: "y_m",
  z: "z_m",
  speed: "speed_m_per_s",
  rpm: "rpm",
  gear: "gear_integer",
  throttle: "throttle_fraction",
  brake: "brake_fraction",
  steering: "steering_rad",
  longitudinalG: "longitudinal_g0",
  lateralG: "lateral_g0",
  verticalG: "vertical_g0",
  normalLoadG: "normal_load_vehicle_weight_ratio",
  trackGradient: "track_gradient_rise_per_3d_distance",
  cornerId: "corner_id_integer",
  sectorId: "sector_id_integer",
  offset: "offset_m",
} satisfies Record<keyof Sample, string>;

const channels = (Object.keys(comparisonCsvFields) as (keyof Sample)[]).filter(
  (field) => field !== "time",
);
const sides = ["current", "reference"] as const;
export const comparisonCsvHeaders = [
  "source_progress_fraction",
  "current_time_s",
  "reference_time_s",
  "delta_time_s",
  ...channels.flatMap((field) =>
    sides.map((side) => `${side}_${comparisonCsvFields[field]}`),
  ),
];

/** Serialize the existing full-lap comparison; absent channels stay empty, not zero. */
export function comparisonReportCsv(report: ComparisonReport): string {
  const lines = new Array<string>(report.samples.length + 2);
  lines[0] = comparisonCsvHeaders.join(",");
  for (let index = 0; index < report.samples.length; index++) {
    const row = report.samples[index];
    const current: Partial<Sample> = row.current;
    const reference: Partial<Sample> = row.reference;
    const cells: (number | string)[] = [
      row.progress,
      row.current.time,
      row.reference.time,
      row.deltaTime,
    ];
    for (const field of channels)
      cells.push(current[field] ?? "", reference[field] ?? "");
    lines[index + 1] = cells.join(",");
  }
  lines[lines.length - 1] = "";
  return lines.join("\r\n");
}
