import { expect, it } from "vitest";
import { signed, comparisonTone } from "../../packages/telemetry";

it.each([
  [0, 3, "0.000", "neutral"],
  [-0, 3, "0.000", "neutral"],
  [1e-14, 3, "0.000", "neutral"],
  [-1e-14, 3, "0.000", "neutral"],
  [Number.MIN_VALUE, 3, "0.000", "neutral"],
  [0.00049, 3, "0.000", "neutral"],
  [-0.00049, 3, "0.000", "neutral"],
  [0.0005, 3, "+0.001", "negative"],
  [-0.0005, 3, "-0.001", "positive"],
  [0.0049, 2, "0.00", "neutral"],
  [-0.0049, 2, "0.00", "neutral"],
  [0.005, 2, "+0.01", "negative"],
  [-0.005, 2, "-0.01", "positive"],
  [12.3456, 3, "+12.346", "negative"],
  [-12.3456, 3, "-12.346", "positive"],
] as const)(
  "keeps text and comparison meaning consistent for %s at %s digits",
  (value, digits, text, tone) => {
    expect(signed(value, digits)).toBe(text);
    expect(comparisonTone(value, digits)).toBe(tone);
  },
);
it("keeps missing comparisons neutral", () =>
  expect(comparisonTone(null)).toBe("neutral"));
