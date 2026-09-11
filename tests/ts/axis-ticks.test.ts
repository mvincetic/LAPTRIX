import { describe, expect, it } from "vitest";
import { visibleAxisTicks } from "../../apps/web/src/axis-ticks";

describe("readable axis intervals", () => {
  it("reserves both endpoints while omitting the colliding final interior label", () => {
    const input = [
      { left: 0, right: 6 },
      { left: 20, right: 44 },
      { left: 52, right: 76 },
      { left: 84, right: 108 },
      { left: 116, right: 140 },
      { left: 136, right: 160 },
    ];
    const before = structuredClone(input);
    expect(visibleAxisTicks(input, 160)).toEqual([
      true,
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(input).toEqual(before);
  });
  it("keeps all labels when there is room and reacts to wider precision", () => {
    const roomy = Array.from({ length: 6 }, (_, i) => ({
      left: i * 60,
      right: i * 60 + 20,
    }));
    expect(visibleAxisTicks(roomy, 320)).toEqual(Array(6).fill(true));
    const precise = roomy.map(({ left }) => ({
      left: left / 2,
      right: left / 2 + 45,
    }));
    const mask = visibleAxisTicks(precise, 195);
    const shown = precise.filter((_, i) => mask[i]);
    expect(mask[0]).toBe(true);
    expect(mask[5]).toBe(true);
    expect(shown.length).toBeLessThan(6);
    for (let i = 1; i < shown.length; i++)
      expect(shown[i].left - shown[i - 1].right).toBeGreaterThanOrEqual(6);
  });
  it("handles empty, unavailable and exceptionally narrow layouts without overflow", () => {
    expect(visibleAxisTicks([], 100)).toEqual([]);
    expect(visibleAxisTicks([{ left: 0, right: 10 }], 0)).toEqual([false]);
    expect(
      visibleAxisTicks(
        [
          { left: 0, right: 30 },
          { left: 20, right: 50 },
        ],
        50,
      ),
    ).toEqual([false, true]);
    expect(
      visibleAxisTicks(
        [
          { left: NaN, right: 15 },
          { left: 90, right: 120 },
        ],
        100,
      ),
    ).toEqual([false, false]);
  });
});
