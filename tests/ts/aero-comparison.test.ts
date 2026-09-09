import { expect, it } from "vitest";
import {
  aeroCandidates,
  comparisonIssue,
} from "../../apps/web/src/aeroComparison";

it("keeps nonstandard starting settings inside a bounded, unique comparison", () => {
  expect(aeroCandidates(1.5)).toEqual([1.5, -5, -2, 0, 2, 5]);
  expect(aeroCandidates(-2)).toEqual([-2, -5, 0, 2, 5]);
});

it("requires affirmative convergence and force checks before a result is eligible", () => {
  const lap = {
    optimization: { method: "test", converged: true, iterations: 1 },
    numericalChecks: {
      speedConverged: true,
      maxDemandRatio: 1.015,
      demandTolerance: 1.015,
    },
  };
  expect(comparisonIssue(lap)).toBeNull();
  expect(comparisonIssue({ ...lap, numericalChecks: undefined })).toMatch(
    /unavailable/,
  );
  expect(
    comparisonIssue({
      ...lap,
      optimization: { ...lap.optimization, converged: false },
    }),
  ).toMatch(/Line/);
  expect(
    comparisonIssue({
      ...lap,
      numericalChecks: { ...lap.numericalChecks, speedConverged: false },
    }),
  ).toMatch(/Speed/);
  expect(
    comparisonIssue({
      ...lap,
      numericalChecks: { ...lap.numericalChecks, maxDemandRatio: 1.016 },
    }),
  ).toMatch(/Force/);
});
