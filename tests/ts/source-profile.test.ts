import { describe, expect, it } from "vitest";
import {
  sourceProfile,
  sourceSegmentAtDistance,
} from "../../packages/track-engine/profile";

const rectangle = [
  { x: 0, y: 0, z: 0 },
  { x: 4, y: 1, z: 0 },
  { x: 4, y: 1, z: 3 },
  { x: 0, y: 0, z: 3 },
];
describe("closed original-source profiles", () => {
  it("uses horizontal-run grade and 3D distance on an analytic ramp rectangle", () => {
    const before = structuredClone(rectangle);
    const profile = sourceProfile(rectangle);
    expect(profile.segments.map((s) => s.gradePercent)).toEqual([
      25, 0, -25, 0,
    ]);
    expect(profile.segments.map((s) => s.distance)).toEqual([
      0,
      Math.sqrt(17),
      Math.sqrt(17) + 3,
      Math.sqrt(17) * 2 + 3,
    ]);
    expect(profile.length).toBe(2 * Math.sqrt(17) + 6);
    expect(profile.ascent).toBe(1);
    expect(profile.descent).toBe(1);
    expect(profile.minElevation).toBe(0);
    expect(profile.maxElevation).toBe(1);
    expect(profile.maxUphill).toBe(25);
    expect(profile.maxDownhill).toBe(-25);
    expect(rectangle).toEqual(before);
  });
  it("includes elevation change in the closing seam and preserves totals after start rotation", () => {
    const rotated = [...rectangle.slice(1), rectangle[0]];
    const profile = sourceProfile(rotated);
    expect(profile.segments.at(-1)!.rise).toBe(1);
    expect(profile.segments.at(-1)!.endElevation).toBe(1);
    expect(profile.segments.at(-1)!.endDistance).toBe(profile.length);
    expect(profile.ascent).toBe(1);
    expect(profile.descent).toBe(1);
    expect(profile.length).toBeCloseTo(sourceProfile(rectangle).length, 12);
  });
  it("is invariant under horizontal rigid transforms and reverses segment signs with direction", () => {
    const moved = rectangle.map((p) => ({
      x: 100 - p.z,
      y: p.y - 10,
      z: 200 + p.x,
    }));
    const profile = sourceProfile(moved);
    expect(profile.length).toBe(sourceProfile(rectangle).length);
    expect(profile.segments.map((s) => s.gradePercent)).toEqual([
      25, 0, -25, 0,
    ]);
    expect(profile.minElevation).toBe(-10);
    expect(profile.maxElevation).toBe(-9);
    const reversed = sourceProfile([...rectangle].reverse());
    expect(reversed.segments.map((s) => s.gradePercent)).toEqual([
      25, 0, -25, 0,
    ]);
    // Reversed segment 0 traverses original segment 2 in the opposite direction.
    expect(reversed.segments[0].gradePercent).toBe(
      -sourceProfile(rectangle).segments[2].gradePercent,
    );
  });
  it("selects actual unequal-length segments, including the last closing interval", () => {
    const profile = sourceProfile(rectangle);
    expect(sourceSegmentAtDistance(profile, -2)).toBe(0);
    expect(sourceSegmentAtDistance(profile, Math.sqrt(17) - 1e-8)).toBe(0);
    expect(sourceSegmentAtDistance(profile, Math.sqrt(17))).toBe(1);
    expect(sourceSegmentAtDistance(profile, profile.length - 1)).toBe(3);
    expect(sourceSegmentAtDistance(profile, profile.length)).toBe(3);
    expect(sourceSegmentAtDistance(profile, profile.length + 1)).toBe(3);
    expect(() => sourceSegmentAtDistance(profile, NaN)).toThrow("finite");
  });
  it("handles level geometry and rejects undefined source profiles", () => {
    const flat = sourceProfile(rectangle.map((p) => ({ ...p, y: 5 })));
    expect(flat.ascent).toBe(0);
    expect(flat.descent).toBe(0);
    expect(flat.maxUphill).toBe(0);
    expect(flat.maxDownhill).toBe(0);
    expect(() => sourceProfile([])).toThrow("ordered points");
    expect(() =>
      sourceProfile([
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 0, z: 0 },
      ]),
    ).toThrow("horizontal length");
    expect(() =>
      sourceProfile(rectangle.map((p, i) => (i === 0 ? { ...p, y: NaN } : p))),
    ).toThrow("finite");
  });
});
