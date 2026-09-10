import { describe, expect, it } from "vitest";
import {
  CALLOUT_HEIGHT,
  CALLOUT_WIDTH,
  layoutEventCallouts,
} from "../../apps/web/src/corner-callouts";

describe("screen-space corner event callouts", () => {
  it.each([
    [0, 0],
    [389, 0],
    [0, 299],
    [389, 299],
  ])("keeps coincident edge events readable at %s, %s", (x, y) => {
    const points = [0, 1, 2].map((id) => ({ id, x, y }));
    const result = layoutEventCallouts(points, 390, 300);
    expect(result.map((point) => point.id)).toEqual([0, 1, 2]);
    for (const point of result) {
      expect(point.x).toBe(x);
      expect(point.y).toBe(y);
      expect(point.labelX).toBeGreaterThanOrEqual(0);
      expect(point.labelY).toBeGreaterThanOrEqual(0);
      expect(point.labelX + CALLOUT_WIDTH).toBeLessThanOrEqual(390);
      expect(point.labelY + CALLOUT_HEIGHT).toBeLessThanOrEqual(300);
      expect(point.leaderX).toBeGreaterThanOrEqual(point.labelX);
      expect(point.leaderX).toBeLessThanOrEqual(point.labelX + CALLOUT_WIDTH);
      expect(point.leaderY).toBeGreaterThanOrEqual(point.labelY);
      expect(point.leaderY).toBeLessThanOrEqual(point.labelY + CALLOUT_HEIGHT);
    }
    expect(result[0].labelY + CALLOUT_HEIGHT).toBeLessThan(result[1].labelY);
    expect(result[1].labelY + CALLOUT_HEIGHT).toBeLessThan(result[2].labelY);
  });

  it("retains ordered anchors while avoiding an occupied side of the viewport", () => {
    const points = [
      { id: 0, x: 160, y: 140 },
      { id: 1, x: 180, y: 150 },
      { id: 2, x: 195, y: 145 },
    ];
    const obstacles = [{ x: 200, y: 0, width: 190, height: 300 }];
    const before = structuredClone({ points, obstacles });
    const result = layoutEventCallouts(points, 390, 300, obstacles);
    expect(result).toHaveLength(3);
    expect(result.map(({ id, x, y }) => ({ id, x, y }))).toEqual(points);
    expect(result.every((point) => point.labelX + CALLOUT_WIDTH <= 200)).toBe(
      true,
    );
    expect(layoutEventCallouts(points, 390, 300, obstacles)).toEqual(result);
    expect({ points, obstacles }).toEqual(before);
  });

  it("omits offscreen and nonfinite anchors without manufacturing edge events", () => {
    const result = layoutEventCallouts(
      [
        { id: 0, x: -10, y: 100 },
        { id: 1, x: 150, y: 120 },
        { id: 2, x: 900, y: 120 },
        { id: 3, x: NaN, y: 120 },
      ],
      390,
      300,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, x: 150, y: 120 });
  });

  it("finds a free rectangle requiring both horizontal and vertical displacement", () => {
    const points = [0, 1, 2].map((id) => ({ id, x: 90 + id * 4, y: 210 }));
    // The only large free space is above the right block and beside the top-left block.
    const obstacles = [
      { x: 0, y: 0, width: 150, height: 180 },
      { x: 0, y: 180, width: 390, height: 120 },
      { x: 250, y: 0, width: 140, height: 180 },
    ];
    const result = layoutEventCallouts(points, 390, 300, obstacles);
    expect(result).toHaveLength(3);
    for (const point of result) {
      expect(point.labelX).toBeGreaterThanOrEqual(150);
      expect(point.labelX + CALLOUT_WIDTH).toBeLessThanOrEqual(250);
      expect(point.labelY + CALLOUT_HEIGHT).toBeLessThanOrEqual(180);
    }
  });

  it("returns no labels when there are no visible events or no room for readable controls", () => {
    expect(layoutEventCallouts([], 390, 300)).toEqual([]);
    expect(layoutEventCallouts([{ id: 0, x: 20, y: 20 }], 50, 50)).toEqual([]);
  });
});
