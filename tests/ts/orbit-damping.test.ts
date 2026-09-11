import { expect, it } from "vitest";
import { orbitDampingFactor } from "../../apps/web/src/orbit-damping";

it("camera inertia consumes the same displacement across different frame rates", () => {
  expect(orbitDampingFactor(1 / 60)).toBeCloseTo(0.12, 12);
  const remaining = (steps: number[]) =>
    steps.reduce(
      (motion, delta) => motion * (1 - orbitDampingFactor(delta)),
      1,
    );
  const reference = remaining(Array.from({ length: 60 }, () => 1 / 60));
  for (const steps of [
    Array.from({ length: 30 }, () => 1 / 30),
    [0.5, 0.5],
    [0.1, 0.02, 0.48, 0.4],
  ])
    expect(remaining(steps)).toBeCloseTo(reference, 12);
  // A delayed display frame drains almost all old motion without overshooting.
  expect(orbitDampingFactor(1)).toBeGreaterThan(0.999);
  expect(orbitDampingFactor(100)).toBe(1);
  for (const delta of [0, -1, NaN, Infinity])
    expect(orbitDampingFactor(delta)).toBe(0.12);
});
