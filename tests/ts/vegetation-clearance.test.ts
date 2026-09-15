import { describe, expect, it } from "vitest";
import {
  visibleTreeIndices,
  type GroundFootprint,
} from "../../apps/web/src/vegetation-clearance";

describe("authored facility vegetation clearance", () => {
  const roof: GroundFootprint = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const sites: [number, number, number][] = [
    [0, 6, 0],
    [9, 6, 0],
    [-4, 6, 0],
    [20, 6, 20],
  ];
  it("reserves roof interiors and crown envelopes without renumbering surviving sites", () => {
    const before = structuredClone(sites);
    expect(visibleTreeIndices(sites)).toEqual([0, 1, 2, 3]);
    expect(visibleTreeIndices(sites, [roof])).toEqual([1, 3]);
    expect(sites).toEqual(before);
    expect(visibleTreeIndices(sites, [[...roof].reverse()])).toEqual([1, 3]);
  });
  it("retains clearance under world translation, rotation and irrelevant tree height", () => {
    const move = (x: number, z: number): [number, number] => [
      23000 + x * 0.6 - z * 0.8,
      -41000 + x * 0.8 + z * 0.6,
    ];
    const transformed = sites.map(([x, y, z]): [number, number, number] => {
      const p = move(x, z);
      return [p[0], y + 100, p[1]];
    });
    expect(
      visibleTreeIndices(transformed, [roof.map(([x, z]) => move(x, z))]),
    ).toEqual([1, 3]);
  });
});
