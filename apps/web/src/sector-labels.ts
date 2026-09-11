import {
  layoutEventCallouts,
  type ScreenPoint,
  type ScreenRect,
} from "./corner-callouts";

export type SectorLabelPoint = ScreenPoint & { width: number; height: number };

/** Retain each sector's own anchor while finding a free rectangle near it. */
export function layoutSectorLabels(
  points: SectorLabelPoint[],
  width: number,
  height: number,
  obstacles: ScreenRect[] = [],
) {
  const occupied = [
    ...obstacles,
    ...points
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => ({ x: p.x - 4, y: p.y - 4, width: 8, height: 8 })),
  ];
  const labels: ReturnType<typeof layoutEventCallouts> = [];
  for (const point of points) {
    const placed = layoutEventCallouts([point], width, height, occupied, {
      width: point.width,
      height: point.height,
      gap: 0,
    })[0];
    if (
      !placed ||
      placed.obstruction > 0 ||
      Math.hypot(placed.x - placed.leaderX, placed.y - placed.leaderY) > 160
    )
      continue;
    labels.push(placed);
    occupied.push({
      x: placed.labelX - 3,
      y: placed.labelY - 3,
      width: point.width + 6,
      height: point.height + 6,
    });
  }
  return labels;
}
