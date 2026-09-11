import { describe, expect, it } from "vitest";
import {
  layoutSectorLabels,
  type SectorLabelPoint,
} from "../../apps/web/src/sector-labels";
import type { ScreenRect } from "../../apps/web/src/corner-callouts";

const overlaps = (a: ScreenRect, b: ScreenRect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
const point = (id: number, x: number, y: number): SectorLabelPoint => ({
  id,
  x,
  y,
  width: 72,
  height: 46,
});

describe("independent sector badge placement", () => {
  it("separates coincident badges of different sizes without moving their anchors", () => {
    const points = [
      point(1, 160, 160),
      { ...point(2, 160, 160), width: 88 },
      { ...point(3, 160, 160), height: 54 },
    ];
    const before = structuredClone(points),
      labels = layoutSectorLabels(points, 390, 400);
    expect(labels).toHaveLength(3);
    const boxes = labels.map((label) => ({
      ...points.find((p) => p.id === label.id)!,
      x: label.labelX,
      y: label.labelY,
    }));
    for (let i = 0; i < labels.length; i++) {
      expect(labels[i]).toMatchObject({ id: points[i].id, x: 160, y: 160 });
      for (const other of boxes.slice(i + 1))
        expect(overlaps(boxes[i], other)).toBe(false);
    }
    expect(points).toEqual(before);
    expect(layoutSectorLabels(points, 390, 400)).toEqual(labels);
  });
  it("avoids corner circles, a legend and a bottom caption on a narrow map", () => {
    const points = [point(1, 110, 210), point(2, 165, 125), point(3, 205, 205)];
    const obstacles = [
      { x: 140, y: 110, width: 25, height: 25 },
      { x: 90, y: 195, width: 25, height: 25 },
      { x: 187, y: 190, width: 25, height: 25 },
      { x: 170, y: 12, width: 122, height: 75 },
      { x: 8, y: 320, width: 185, height: 70 },
    ];
    const before = structuredClone({ points, obstacles });
    const labels = layoutSectorLabels(points, 302, 400, obstacles);
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      const rect = {
        ...points.find((p) => p.id === label.id)!,
        x: label.labelX,
        y: label.labelY,
      };
      for (const obstacle of obstacles)
        expect(overlaps(rect, obstacle)).toBe(false);
      expect(label.x).toBe(points.find((p) => p.id === label.id)!.x);
      expect(label.y).toBe(points.find((p) => p.id === label.id)!.y);
    }
    expect({ points, obstacles }).toEqual(before);
  });
  it("contains a badge and its leader end at every viewport corner", () => {
    for (const [x, y] of [
      [0, 0],
      [302, 0],
      [0, 400],
      [302, 400],
    ]) {
      const [label] = layoutSectorLabels([point(1, x, y)], 302, 400);
      expect(label).toBeDefined();
      expect(label.labelX).toBeGreaterThanOrEqual(0);
      expect(label.labelY).toBeGreaterThanOrEqual(0);
      expect(label.labelX + 72).toBeLessThanOrEqual(302);
      expect(label.labelY + 46).toBeLessThanOrEqual(400);
      expect(label.leaderX).toBeGreaterThanOrEqual(label.labelX);
      expect(label.leaderX).toBeLessThanOrEqual(label.labelX + 72);
      expect(label.leaderY).toBeGreaterThanOrEqual(label.labelY);
      expect(label.leaderY).toBeLessThanOrEqual(label.labelY + 46);
    }
  });
  it("omits offscreen, invalid, obstructed and unusably distant badges", () => {
    expect(
      layoutSectorLabels([point(1, -1, 20), point(2, NaN, 20)], 302, 400),
    ).toEqual([]);
    expect(
      layoutSectorLabels([point(1, 150, 180)], 302, 400, [
        { x: 0, y: 0, width: 302, height: 400 },
      ]),
    ).toEqual([]);
    expect(
      layoutSectorLabels([point(1, 80, 250)], 1000, 500, [
        { x: 0, y: 0, width: 850, height: 500 },
      ]),
    ).toEqual([]);
    expect(layoutSectorLabels([point(1, 0, 0)], 50, 40)).toEqual([]);
    expect(
      layoutSectorLabels([{ ...point(1, 100, 100), height: 0 }], 302, 400),
    ).toEqual([]);
  });
});
