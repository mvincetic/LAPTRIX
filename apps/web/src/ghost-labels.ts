import {
  layoutEventCallouts,
  type ScreenPoint,
  type ScreenRect,
} from "./corner-callouts";

export const GHOST_LABEL_WIDTH = 56;
export const GHOST_LABEL_HEIGHT = 20;
export const GHOST_LEADER_LIMIT = 120;

/** Place at most two independent names, leaving every vehicle anchor unchanged. */
export function layoutGhostLabels(
  points: ScreenPoint[],
  width: number,
  height: number,
  obstacles: ScreenRect[] = [],
) {
  if (points.length > 2)
    throw new Error("At most two ghost labels are supported");
  const occupied = [
    ...obstacles,
    ...points
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: point.x - 4,
        y: point.y - 4,
        width: 8,
        height: 8,
      })),
  ];
  const labels: ReturnType<typeof layoutEventCallouts> = [];
  for (const point of points) {
    const label = layoutEventCallouts([point], width, height, occupied, {
      width: GHOST_LABEL_WIDTH,
      height: GHOST_LABEL_HEIGHT,
      gap: 0,
    })[0];
    if (
      !label ||
      label.obstruction > 0 ||
      Math.hypot(label.x - label.leaderX, label.y - label.leaderY) >
        GHOST_LEADER_LIMIT
    )
      continue;
    labels.push(label);
    occupied.push({
      x: label.labelX - 3,
      y: label.labelY - 3,
      width: GHOST_LABEL_WIDTH + 6,
      height: GHOST_LABEL_HEIGHT + 6,
    });
  }
  return labels;
}
