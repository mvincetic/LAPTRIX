import { describe, expect, it } from "vitest";
import { sourceProfile } from "../../packages/track-engine/profile";
import { sourceVerticalCurvature } from "../../packages/track-engine/vertical-profile";

describe("sampled source vertical curvature", () => {
  it.each([-1, 1])(
    "recovers signed inverse radius on unequal circular-arc chords (%s)",
    (sign) => {
      const radius = 90;
      const points = [
        {
          x: -radius * Math.sin(0.15),
          y: sign * radius * (1 - Math.cos(0.15)),
          z: 0,
        },
        { x: 0, y: 0, z: 0 },
        {
          x: radius * Math.sin(0.3),
          y: sign * radius * (1 - Math.cos(0.3)),
          z: 0,
        },
      ];
      const profile = sourceProfile(points);
      const before = structuredClone(profile);
      expect(sourceVerticalCurvature(profile)[1]).toBeCloseTo(
        sign / radius,
        13,
      );
      expect(profile).toEqual(before);
    },
  );

  it("keeps level sources and unequal constant-grade interior chords at zero", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 6, y: 2, z: 8 },
      { x: 24, y: 8, z: 32 },
      { x: 27, y: 9, z: 36 },
    ];
    const curve = sourceVerticalCurvature(sourceProfile(points));
    expect(curve[1]).toBeCloseTo(0, 14);
    expect(curve[2]).toBeCloseTo(0, 14);
    expect(
      sourceVerticalCurvature(
        sourceProfile(points.map((p) => ({ ...p, y: 17 }))),
      ),
    ).toEqual([0, 0, 0, 0]);
  });

  it("retains nodal signs through closure, start rotation, reversal and rigid transforms", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0.7, z: 0 },
      { x: 4, y: 0.7, z: 3 },
      { x: 0, y: 0, z: 3 },
    ];
    const original = sourceVerticalCurvature(sourceProfile(points));
    expect(original[0]).toBeGreaterThan(0);
    expect(original[1]).toBeLessThan(0);
    const reversed = sourceVerticalCurvature(
      sourceProfile([...points].reverse()),
    );
    reversed.forEach((value, index) =>
      expect(value).toBeCloseTo(original[3 - index], 13),
    );
    const rotated = sourceVerticalCurvature(
      sourceProfile([...points.slice(2), ...points.slice(0, 2)]),
    );
    expect(rotated).toEqual([...original.slice(2), ...original.slice(0, 2)]);
    const moved = sourceVerticalCurvature(
      sourceProfile(
        points.map((p) => ({ x: 100 - p.z, y: p.y + 7, z: 200 + p.x })),
      ),
    );
    moved.forEach((value, index) =>
      expect(value).toBeCloseTo(original[index], 13),
    );
  });

  it("shows sampled alternating extrema but cannot recover an absent elevation wave", () => {
    const radius = 1000,
      count = 720,
      amplitude = 0.1;
    const ring = Array.from({ length: count }, (_, index) => ({
      x: radius * Math.cos((2 * Math.PI * index) / count),
      y: 0,
      z: radius * Math.sin((2 * Math.PI * index) / count),
    }));
    expect(
      sourceVerticalCurvature(sourceProfile(ring)).every(
        (value) => value === 0,
      ),
    ).toBe(true);
    const sampled = sourceVerticalCurvature(
      sourceProfile(
        ring.map((point, index) => ({
          ...point,
          y: index % 2 ? -amplitude : amplitude,
        })),
      ),
    );
    const chord = 2 * radius * Math.sin(Math.PI / count);
    // Circumradius of an isosceles triangle with horizontal sides spanning the two neighbours.
    const expected = (4 * amplitude) / (chord ** 2 + 4 * amplitude ** 2);
    sampled.forEach((value, index) =>
      expect(value).toBeCloseTo((index % 2 ? 1 : -1) * expected, 12),
    );
  });

  it("rejects missing or nonfinite chord geometry", () => {
    expect(() => sourceVerticalCurvature({ segments: [] })).toThrow(
      "ordered segments",
    );
    const profile = sourceProfile([
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 1, z: 0 },
      { x: 4, y: 0, z: 3 },
    ]);
    for (const patch of [
      { horizontalLength: 0 },
      { rise: Infinity },
      { length: NaN },
    ]) {
      const invalid = structuredClone(profile);
      Object.assign(invalid.segments[0], patch);
      expect(() => sourceVerticalCurvature(invalid)).toThrow("finite chords");
    }
  });
});
