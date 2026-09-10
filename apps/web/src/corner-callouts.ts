export type ScreenPoint = { id: number; x: number; y: number };
export type ScreenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export const CALLOUT_WIDTH = 76;
export const CALLOUT_HEIGHT = 24;
export const CALLOUT_GAP = 6;
const padding = 8;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const overlap = (a: ScreenRect, b: ScreenRect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/** Place a readable event group in CSS pixels; anchors remain on their projected samples. */
export function layoutEventCallouts(
  points: ScreenPoint[],
  width: number,
  height: number,
  obstacles: ScreenRect[] = [],
  dimensions = {
    width: CALLOUT_WIDTH,
    height: CALLOUT_HEIGHT,
    gap: CALLOUT_GAP,
  },
) {
  const { width: labelWidth, height: labelHeight, gap: labelGap } = dimensions;
  if (
    ![labelWidth, labelHeight, labelGap].every(Number.isFinite) ||
    labelWidth <= 0 ||
    labelHeight <= 0 ||
    labelGap < 0
  )
    return [];
  const visible = points.filter(
    (point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= width &&
      point.y >= 0 &&
      point.y <= height,
  );
  if (!visible.length) return [];
  const groupHeight =
    visible.length * labelHeight + (visible.length - 1) * labelGap;
  if (width < labelWidth + padding * 2 || height < groupHeight + padding * 2)
    return [];
  const xs = visible.map((point) => point.x),
    ys = visible.map((point) => point.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2,
    centerY = (minY + maxY) / 2;
  const candidates = [
    { x: maxX + 16, y: centerY - groupHeight / 2 },
    { x: minX - 16 - labelWidth, y: centerY - groupHeight / 2 },
    { x: centerX - labelWidth / 2, y: minY - 16 - groupHeight },
    { x: centerX - labelWidth / 2, y: maxY + 16 },
  ];
  const occupied = [
    ...obstacles,
    ...visible.map((point) => ({
      x: point.x - 4,
      y: point.y - 4,
      width: 8,
      height: 8,
    })),
  ];
  const lastX = width - padding - labelWidth;
  const lastY = height - padding - groupHeight;
  const preferredY =
    visible.reduce(
      (sum, point, index) =>
        sum + point.y - index * (labelHeight + labelGap) - labelHeight / 2,
      0,
    ) / visible.length;
  // Search vertical free intervals at bounded horizontal candidates. Combining
  // independent x/y gaps finds room missed by four simple anchor-relative offsets.
  const horizontal = Array.from(
    new Set([
      ...candidates.map((point) => clamp(point.x, padding, lastX)),
      ...occupied
        .flatMap((rect) => [rect.x - labelWidth, rect.x + rect.width])
        .map((x) => clamp(x, padding, lastX)),
    ]),
  ).sort(
    (a, b) =>
      Math.abs(a + labelWidth / 2 - centerX) -
      Math.abs(b + labelWidth / 2 - centerX),
  );
  for (const x of new Set([padding, lastX, ...horizontal.slice(0, 62)])) {
    const intervals = occupied
      .filter((rect) => x < rect.x + rect.width && x + labelWidth > rect.x)
      .map((rect) => ({
        start: rect.y - groupHeight,
        end: rect.y + rect.height,
      }))
      .filter((interval) => interval.end >= padding && interval.start <= lastY)
      .sort((a, b) => a.start - b.start);
    let freeStart = padding;
    let bestY: number | null = null;
    const considerGap = (low: number, high: number) => {
      const y = clamp(preferredY, low, high);
      if (
        bestY === null ||
        Math.abs(y - preferredY) < Math.abs(bestY - preferredY)
      )
        bestY = y;
    };
    for (const interval of intervals) {
      if (interval.start > freeStart)
        considerGap(freeStart, Math.min(interval.start, lastY));
      freeStart = Math.max(freeStart, interval.end);
      if (freeStart > lastY) break;
    }
    if (freeStart <= lastY) considerGap(freeStart, lastY);
    if (bestY !== null) candidates.push({ x, y: bestY });
  }
  let selected: {
    x: number;
    y: number;
    obstruction: number;
    distance: number;
  } | null = null;
  for (const candidate of candidates) {
    const x = clamp(candidate.x, padding, width - padding - labelWidth);
    const y = clamp(candidate.y, padding, height - padding - groupHeight);
    const group = { x, y, width: labelWidth, height: groupHeight };
    const obstruction = occupied.reduce(
      (sum, rect) => sum + overlap(group, rect),
      0,
    );
    const distance = visible.reduce(
      (sum, point, index) =>
        sum +
        (point.x - x - labelWidth / 2) ** 2 +
        (point.y - y - index * (labelHeight + labelGap) - labelHeight / 2) ** 2,
      0,
    );
    if (
      !selected ||
      obstruction < selected.obstruction ||
      (obstruction === selected.obstruction && distance < selected.distance)
    )
      selected = { x, y, obstruction, distance };
  }
  return visible.map((point, index) => {
    const x = selected!.x,
      y = selected!.y + index * (labelHeight + labelGap);
    return {
      ...point,
      obstruction: selected!.obstruction,
      labelX: x,
      labelY: y,
      leaderX: clamp(point.x, x, x + labelWidth),
      leaderY: clamp(point.y, y, y + labelHeight),
    };
  });
}
