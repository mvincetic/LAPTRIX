import { describe, expect, it } from "vitest";
import formula from "../../data/vehicles/formula-development.json";
import gt from "../../data/vehicles/gt-development.json";
import { vehicleSchema } from "../../packages/shared/schema";

describe("vehicle data contracts", () => {
  it("accepts both catalog profiles with explicit provenance", () => {
    expect(vehicleSchema.parse(formula).bodyStyle).toBe("formula");
    expect(vehicleSchema.parse(gt).sources[0].url).toMatch(/^https:/);
  });
  it("rejects malformed or internally inconsistent drivetrain data without throwing", () => {
    for (const change of [
      { gearRatios: [] },
      { gearRatios: [2, 3] },
      { powerCurve: [] },
      { powerCurve: gt.powerCurve.slice(0, -1) },
      { powerKw: 400 },
      { idleRpm: 9500 },
      { sources: [{ ...gt.sources[0], url: "javascript:alert(1)" }] },
    ])
      expect(vehicleSchema.safeParse({ ...gt, ...change }).success).toBe(false);
  });
});
