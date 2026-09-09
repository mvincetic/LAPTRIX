import type { Lap } from "../../../packages/shared/schema";

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
