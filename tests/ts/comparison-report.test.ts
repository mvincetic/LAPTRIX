import { describe, expect, it } from "vitest";
import {
  defaultSetup,
  type Lap,
  type TimingReference,
} from "../../packages/shared/schema";
import { buildComparisonReport } from "../../packages/telemetry/comparison-report";
import { comparisonReportCsv } from "../../packages/telemetry/comparison-csv";

const stamp = "2026-09-10T15:30:00.000Z";
const fingerprint = `sha256:${"a".repeat(64)}`;
function lap(
  progress: number[],
  times: number[],
  distance: number[],
  speeds: number[],
): Lap {
  return {
    schemaVersion: 1,
    trackId: "original-comparison-fixture",
    vehicleId: "original-vehicle",
    setup: { ...defaultSetup },
    model: "Independent interpolation fixture",
    verticalDynamics: "quasi-steady-road-normal-v1",
    lapTime: times.at(-1)!,
    length: distance.at(-1)!,
    maxSpeed: Math.max(...speeds),
    averageSpeed: distance.at(-1)! / times.at(-1)!,
    elevationRange: 0,
    computationMs: 0,
    warnings: [],
    optimization: { method: "Fixture", converged: true, iterations: 0 },
    alignment: { trackFingerprint: fingerprint, progress },
    corners: [],
    sectors: [],
    samples: progress.map((_, i) => ({
      time: times[i],
      distance: distance[i],
      x: distance[i],
      y: 10,
      z: 0,
      speed: speeds[i],
      rpm: 4000,
      gear: i + 1,
      throttle: 0.5,
      brake: 0.2,
      steering: 0.1,
      longitudinalG: -0.2,
      lateralG: 1,
      verticalG: 0.1,
      normalLoadG: 1.3,
      trackGradient: 0.02,
      offset: 0,
      cornerId: i,
      sectorId: 1,
    })),
  };
}
const current = () =>
  lap(
    [0, 0.2, 0.6, 0.8, 1],
    [0, 2, 7, 9, 10],
    [0, 8, 22, 34, 40],
    [10, 20, 30, 20, 10],
  );
const native = () =>
  lap(
    [0, 0.1, 0.4, 0.9, 1],
    [0, 2, 4, 9, 13],
    [0, 4, 20, 38, 48],
    [10, 80, 20, 40, 10],
  );
function timing(): TimingReference {
  const value = native();
  return {
    format: "laptrix-timing-reference-v1",
    label: "Original timing fixture",
    vehicleLabel: "Timing vehicle",
    origin: "external-simulation",
    source: "Independent piecewise timing; no channels",
    trackId: value.trackId,
    lapTime: value.lapTime,
    units: { time: "s", progress: "fraction" },
    alignment: value.alignment!,
    samples: value.samples.map(({ time }) => ({ time })),
  };
}

describe("source-aligned comparison reports", () => {
  it("preserves both grids, independent distances and a reference-only speed peak", () => {
    const report = buildComparisonReport(current(), native(), stamp)!;
    expect(report.samples.map((row) => row.progress)).toEqual([
      0, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1,
    ]);
    expect(report.samples[1]).toMatchObject({
      progress: 0.1,
      current: { time: 1, distance: 4, speed: 15, gear: 1 },
      reference: { time: 2, distance: 4, speed: 80, gear: 2 },
      deltaTime: -1,
    });
    expect(report.samples[3]).toMatchObject({
      current: { time: 4.5, distance: 15, speed: 25, gear: 2 },
      reference: { time: 4, distance: 20, speed: 20, gear: 3 },
      deltaTime: 0.5,
    });
    expect(report.samples.at(-1)).toMatchObject({
      progress: 1,
      current: { time: 10, distance: 40 },
      reference: { time: 13, distance: 48 },
      deltaTime: -3,
    });
    expect(report.summary).toEqual({
      currentLapTime: 10,
      referenceLapTime: 13,
      deltaTime: -3,
    });
  });
  it("declares canonical units, scope, interpolation and full precision", () => {
    const report = buildComparisonReport(current(), native(), stamp)!;
    expect(report).toMatchObject({
      format: "laptrix-comparison-v1",
      exportedAt: stamp,
      scope: "full-lap",
      basis: "source-progress",
      sourceTrackFingerprint: fingerprint,
      referenceKind: "native",
      deltaConvention: "current-minus-reference",
    });
    expect(report.units.sample).toMatchObject({
      speed: "m/s",
      steering: "rad",
      trackGradient: "rise/3D-distance",
      normalLoadG: "vehicle-weight-ratio",
    });
    expect(report.interpolation).toEqual({
      continuous: "linear",
      gearAndIds: "left-step",
    });
    expect(report.samples[2].reference.time).toBeCloseTo(8 / 3, 14);
    expect(report.samples[2].deltaTime).toBeCloseTo(-2 / 3, 14);
    expect(JSON.parse(JSON.stringify(report)).samples[2].deltaTime).toBe(
      report.samples[2].deltaTime,
    );
  });
  it("exports timing-only references without positions or vehicle channels", () => {
    const reference = timing();
    const report = buildComparisonReport(current(), reference, stamp)!;
    expect(report.referenceKind).toBe("timing-only");
    expect(report.availableFields.reference).toEqual(["time"]);
    expect(
      report.samples.every(
        (row) => Object.keys(row.reference).join() === "time",
      ),
    ).toBe(true);
    expect(report.samples[1]).toMatchObject({
      current: { speed: 15 },
      reference: { time: 2 },
      deltaTime: -1,
    });
    expect(report.inputs.reference).toEqual(reference);
  });
  it.each(["current", "reference"] as const)(
    "omits undeclared %s load channels while preserving the literal archived input",
    (side) => {
      const a = current(),
        b = native();
      const legacy = side === "current" ? a : b;
      delete legacy.verticalDynamics;
      for (const sample of legacy.samples) sample.verticalG = 0;
      const report = buildComparisonReport(a, b, stamp)!;
      expect(report.availableFields[side]).not.toContain("verticalG");
      expect(report.availableFields[side]).not.toContain("normalLoadG");
      for (const row of report.samples) {
        expect(row[side]).not.toHaveProperty("verticalG");
        expect(row[side]).not.toHaveProperty("normalLoadG");
        expect(row[side]).toHaveProperty("speed");
      }
      expect(report.inputs[side]).toEqual(legacy);
    },
  );
  it("retains source inputs and returns independent snapshots", () => {
    const a = current(),
      b = native(),
      before = structuredClone({ a, b });
    b.referenceImport = { fileName: "archived-native.json" };
    before.b.referenceImport = structuredClone(b.referenceImport);
    const report = buildComparisonReport(a, b, stamp)!;
    expect(report.inputs).toEqual({ current: a, reference: b });
    report.inputs.current.setup.fuel = 77;
    report.inputs.current.samples[0].speed = 999;
    report.samples[0].current.speed = 888;
    expect({ a, b }).toEqual(before);
  });
  it("refuses absent, unaligned or mismatched references without fallback", () => {
    const a = current(),
      b = native();
    expect(buildComparisonReport(a, null, stamp)).toBeNull();
    delete b.alignment;
    expect(buildComparisonReport(a, b, stamp)).toBeNull();
    const other = timing();
    other.alignment.trackFingerprint = `sha256:${"b".repeat(64)}`;
    expect(buildComparisonReport(a, other, stamp)).toBeNull();
    delete a.alignment;
    expect(buildComparisonReport(a, native(), stamp)).toBeNull();
  });
  it("retains the supported 2,001-point lap and 20,000-point timing grid", () => {
    const progress = Array.from({ length: 2001 }, (_, index) => index / 2000);
    const a = lap(
      progress,
      progress.map((p) => p * 80),
      progress.map((p) => p * 6000),
      progress.map(() => 75),
    );
    const b = timing();
    b.alignment.progress = Array.from(
      { length: 20000 },
      (_, index) => index / 19999,
    );
    b.samples = b.alignment.progress.map((p) => ({
      time: 90 * p + 2 * Math.sin(2 * Math.PI * p),
    }));
    b.lapTime = 90;
    const report = buildComparisonReport(a, b, stamp)!;
    expect(report.samples).toHaveLength(21999);
    expect(report.samples[0].deltaTime).toBe(0);
    expect(report.samples.at(-1)!.deltaTime).toBe(-10);
    expect(report.samples.every((row) => Number.isFinite(row.deltaTime))).toBe(
      true,
    );
    const knots = new Map(report.samples.map((row) => [row.progress, row]));
    for (let index = 0; index < b.samples.length; index++)
      expect(knots.get(b.alignment.progress[index])!.reference.time).toBe(
        b.samples[index].time,
      );
    expect(
      JSON.parse(JSON.stringify(report)).inputs.reference.samples,
    ).toHaveLength(20000);
    const csvRows = comparisonReportCsv(report).split("\r\n");
    expect(csvRows.pop()).toBe("");
    expect(csvRows).toHaveLength(22000);
    expect(csvRows.every((row) => row.split(",").length === 40)).toBe(true);
    expect(csvRows.at(-1)!.split(",").slice(0, 4)).toEqual([
      "1",
      "80",
      "90",
      "-10",
    ]);
  });
});

function csvRows(currentLap: Lap, reference: Lap | TimingReference) {
  const report = buildComparisonReport(currentLap, reference, stamp)!;
  const before = structuredClone(report);
  const text = comparisonReportCsv(report);
  expect(report).toEqual(before);
  const lines = text.split("\r\n");
  expect(lines.pop()).toBe("");
  const headers = lines.shift()!.split(",");
  expect(headers).toHaveLength(40);
  expect(new Set(headers).size).toBe(headers.length);
  const rows = lines.map((line) => {
    const fields = line.split(",");
    expect(fields).toHaveLength(headers.length);
    return Object.fromEntries(headers.map((header, i) => [header, fields[i]]));
  });
  return { report, text, headers, rows };
}

describe("flat numeric comparison CSV", () => {
  it("declares canonical units and retains independent unequal-grid values", () => {
    const { headers, rows } = csvRows(current(), native());
    expect(headers.slice(0, 4)).toEqual([
      "source_progress_fraction",
      "current_time_s",
      "reference_time_s",
      "delta_time_s",
    ]);
    expect(headers).toContain("current_speed_m_per_s");
    expect(headers).toContain("reference_throttle_fraction");
    expect(headers).toContain("current_steering_rad");
    expect(headers).toContain("reference_longitudinal_g0");
    expect(headers).toContain("current_normal_load_vehicle_weight_ratio");
    expect(headers).toContain("reference_track_gradient_rise_per_3d_distance");
    expect(rows[1]).toMatchObject({
      source_progress_fraction: "0.1",
      current_time_s: "1",
      reference_time_s: "2",
      delta_time_s: "-1",
      current_speed_m_per_s: "15",
      reference_speed_m_per_s: "80",
      current_gear_integer: "1",
      reference_gear_integer: "2",
    });
    expect(rows[3]).toMatchObject({
      current_time_s: "4.5",
      reference_time_s: "4",
      delta_time_s: "0.5",
      current_distance_m: "15",
      reference_distance_m: "20",
    });
    expect(rows.at(-1)).toMatchObject({
      source_progress_fraction: "1",
      current_time_s: "10",
      reference_time_s: "13",
      delta_time_s: "-3",
    });
  });
  it("keeps every numeric value at full precision, including zero and negative values", () => {
    const { report, rows } = csvRows(current(), native());
    for (let i = 0; i < rows.length; i++) {
      expect(Number(rows[i].source_progress_fraction)).toBe(
        report.samples[i].progress,
      );
      expect(Number(rows[i].current_time_s)).toBe(
        report.samples[i].current.time,
      );
      expect(Number(rows[i].reference_time_s)).toBe(
        report.samples[i].reference.time,
      );
      expect(Number(rows[i].delta_time_s)).toBe(report.samples[i].deltaTime);
    }
    expect(rows[2].delta_time_s).not.toBe(
      Number(rows[2].delta_time_s).toFixed(3),
    );
    expect(rows[0].current_z_m).toBe("0");
    expect(rows[0].current_longitudinal_g0).toBe("-0.2");
    expect(rows[0].current_brake_fraction).toBe("0.2");
  });
  it("uses empty timing-only channel cells and excludes user-authored text from numeric CSV", () => {
    const reference = timing();
    reference.label = '=HYPERLINK("https://example.invalid","original test")';
    reference.source = "Original, quoted\nprovenance";
    const { rows, text } = csvRows(current(), reference);
    expect(text).not.toContain(reference.label);
    expect(text).not.toContain(reference.source);
    for (const row of rows) {
      const referenceChannels = Object.entries(row).filter(
        ([key]) => key.startsWith("reference_") && key !== "reference_time_s",
      );
      expect(referenceChannels).toHaveLength(18);
      expect(referenceChannels.every(([, value]) => value === "")).toBe(true);
      expect(row.reference_time_s).not.toBe("");
      expect(
        Object.values(row).every(
          (value) =>
            value === "" || /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value),
        ),
      ).toBe(true);
    }
    expect(rows[1].current_speed_m_per_s).toBe("15");
  });
  it.each(["current", "reference"] as const)(
    "leaves undeclared %s load cells blank while retaining known zeros",
    (side) => {
      const a = current(),
        b = native();
      delete (side === "current" ? a : b).verticalDynamics;
      const { rows } = csvRows(a, b);
      for (const row of rows) {
        expect(row[`${side}_vertical_g0`]).toBe("");
        expect(row[`${side}_normal_load_vehicle_weight_ratio`]).toBe("");
        expect(row[`${side}_z_m`]).toBe("0");
        expect(row[`${side}_speed_m_per_s`]).not.toBe("");
      }
    },
  );
});
