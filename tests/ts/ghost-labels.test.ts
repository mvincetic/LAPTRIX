import { describe, expect, it } from "vitest";
import {
  layoutGhostLabels,
  GHOST_LABEL_WIDTH,
  GHOST_LABEL_HEIGHT,
} from "../../apps/web/src/ghost-labels";

const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
const box = (label: { labelX: number; labelY: number }) => ({
  x: label.labelX,
  y: label.labelY,
  width: GHOST_LABEL_WIDTH,
  height: GHOST_LABEL_HEIGHT,
});

describe("bounded ghost-name placement", () => {
  it("moves a name away from a timing badge without changing its anchor", () => {
    const points = [{ id: 0, x: 160, y: 140 }];
    const obstacles = [{ x: 135, y: 120, width: 80, height: 60 }];
    const before = structuredClone({ points, obstacles });
    const result = layoutGhostLabels(points, 390, 300, obstacles);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(points[0]);
    expect(overlap(box(result[0]), obstacles[0])).toBe(false);
    expect({ points, obstacles }).toEqual(before);
  });
  it("separates coincident current/reference names deterministically", () => {
    const points = [
      { id: 0, x: 180, y: 140 },
      { id: 1, x: 180, y: 140 },
    ];
    const result = layoutGhostLabels(points, 390, 300);
    expect(result).toHaveLength(2);
    expect(overlap(box(result[0]), box(result[1]))).toBe(false);
    expect(result.map(({ id, x, y }) => ({ id, x, y }))).toEqual(points);
    expect(layoutGhostLabels(points, 390, 300)).toEqual(result);
  });
  it("keeps separated names close to their own vehicles", () => {
    const result = layoutGhostLabels(
      [
        { id: 0, x: 40, y: 150 },
        { id: 1, x: 350, y: 150 },
      ],
      390,
      300,
    );
    expect(result).toHaveLength(2);
    for (const label of result)
      expect(
        Math.hypot(label.x - label.leaderX, label.y - label.leaderY),
      ).toBeLessThan(50);
  });
  it.each([
    [0, 0],
    [389, 0],
    [0, 299],
    [389, 299],
  ])("contains edge labels at %s,%s", (x, y) => {
    const result = layoutGhostLabels([{ id: 0, x, y }], 390, 300);
    expect(result).toHaveLength(1);
    const rect = box(result[0]);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(390);
    expect(rect.y + rect.height).toBeLessThanOrEqual(300);
    expect(result[0]).toMatchObject({ x, y });
  });
  it("omits labels when the view is occupied or the anchor is outside it", () => {
    expect(
      layoutGhostLabels([{ id: 0, x: 150, y: 150 }], 390, 300, [
        { x: 0, y: 0, width: 390, height: 300 },
      ]),
    ).toEqual([]);
    expect(
      layoutGhostLabels(
        [
          { id: 0, x: -1, y: 10 },
          { id: 1, x: NaN, y: 10 },
        ],
        390,
        300,
      ),
    ).toEqual([]);
    expect(layoutGhostLabels([{ id: 0, x: 5, y: 5 }], 30, 30)).toEqual([]);
  });
  it("bounds the supported ghost count", () => {
    expect(() =>
      layoutGhostLabels(
        [0, 1, 2].map((id) => ({ id, x: 150, y: 150 })),
        390,
        300,
      ),
    ).toThrow("two");
  });
  it("omits a name if the only free space requires a misleading long leader", () => {
    expect(
      layoutGhostLabels([{ id: 0, x: 150, y: 150 }], 800, 600, [
        { x: 0, y: 0, width: 400, height: 600 },
      ]),
    ).toEqual([]);
  });
});
