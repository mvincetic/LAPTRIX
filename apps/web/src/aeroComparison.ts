import type {
  Lap,
  Setup,
  Track,
  Vehicle,
} from "../../../packages/shared/schema";
import { trackFingerprint } from "../../../packages/track-engine";

export type AeroCandidate = { aero: number; lap?: Lap; error?: string };
export type StudyRun = {
  startedAt: string;
  finishedAt: string;
  outcome: "completed" | "stopped";
};

export function aeroCandidates(start: number) {
  return [...new Set([start, -5, -2, 0, 2, 5])];
}

/** Missing diagnostics cannot establish eligibility, even on an otherwise valid lap. */
export function comparisonIssue(
  lap: Pick<Lap, "optimization" | "numericalChecks">,
): string | null {
  if (!lap.optimization.converged) return "Line solve did not converge";
  const checks = lap.numericalChecks;
  if (!checks) return "Numerical checks unavailable";
  if (!checks.speedConverged) return "Speed solve did not converge";
  if (checks.maxDemandRatio > checks.demandTolerance)
    return "Force demand exceeds tolerance";
  return null;
}

export async function buildAeroReport(input: {
  projectName: string;
  track: Track;
  vehicle: Vehicle;
  setup: Setup;
  rows: AeroCandidate[];
  selectedAero: number | null;
  run: StudyRun;
}) {
  const fingerprint = await trackFingerprint(input.track);
  const baseline = input.rows.find((row) => row.aero === input.setup.aero)?.lap;
  const eligible = input.rows.filter(
    (row) => row.lap && !row.error && !comparisonIssue(row.lap),
  );
  const fastest = [...eligible].sort(
    (a, b) => a.lap!.lapTime - b.lap!.lapTime,
  )[0];
  const selected = eligible.find((row) => row.aero === input.selectedAero);
  for (const row of input.rows) {
    if (
      row.lap &&
      (row.lap.trackId !== input.track.id ||
        row.lap.vehicleId !== input.vehicle.id ||
        row.lap.alignment?.trackFingerprint !== fingerprint ||
        (Object.keys(input.setup) as (keyof Setup)[]).some(
          (key) =>
            row.lap!.setup[key] !==
            (key === "aero" ? row.aero : input.setup[key]),
        ))
    )
      throw new Error(
        "A result does not match the study inputs. Run the comparison again.",
      );
  }
  return {
    format: "laptrix-aero-study-v1",
    projectName: input.projectName,
    ...input.run,
    exportedAt: new Date().toISOString(),
    model: "Development Physics Model",
    units: {
      lapTime: "s",
      delta: "s",
      distance: "m",
      speed: "m/s",
      aero: "dimensionless",
    },
    source: {
      trackFingerprint: fingerprint,
      track: input.track,
      vehicle: input.vehicle,
    },
    startingSetup: input.setup,
    startingAero: input.setup.aero,
    fastestCheckedAero: fastest?.aero ?? null,
    selectedAero: selected?.aero ?? null,
    limitations: [
      "Best among checked candidates only; no global optimum or measured accuracy is established.",
      "Request timestamps describe the study; the service may return cached calculations.",
      "Missing solver provenance is unknown. Numerical runtimes may differ even with identical source.",
      "Selection in this report does not imply that the result was applied to the workspace.",
    ],
    candidates: input.rows.map((row) => {
      const issue = row.error ?? (row.lap ? comparisonIssue(row.lap) : null);
      return {
        aero: row.aero,
        state: row.error
          ? "failed"
          : row.lap
            ? issue
              ? "excluded"
              : "passed"
            : "not-run",
        issue,
        deltaSeconds:
          row.lap && baseline && !comparisonIssue(baseline)
            ? row.lap.lapTime - baseline.lapTime
            : null,
        result: row.lap ?? null,
      };
    }),
  };
}
