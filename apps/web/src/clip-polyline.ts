export type PlotVertex = readonly [number, number];

/** Clip rendered straight segments before dashed-stroke tessellation, preserving gaps. */
export function clipPolyline(
  points: readonly (PlotVertex | null)[],
  left: number,
  right: number,
) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left)
    return "";
  const commands: string[] = [];
  let previous: PlotVertex | null = null;
  let drawn: PlotVertex | null = null;
  for (const point of points) {
    if (!point) {
      previous = drawn = null;
      continue;
    }
    if (previous) {
      const dx = point[0] - previous[0];
      const from = dx ? (left - previous[0]) / dx : 0;
      const to = dx ? (right - previous[0]) / dx : 1;
      const start = Math.max(0, Math.min(from, to));
      const end = Math.min(1, Math.max(from, to));
      if (start <= end && (dx || (point[0] >= left && point[0] <= right))) {
        const at = (fraction: number): PlotVertex =>
          fraction === 0
            ? previous!
            : fraction === 1
              ? point
              : [
                  Math.max(left, Math.min(right, previous![0] + dx * fraction)),
                  previous![1] + (point[1] - previous![1]) * fraction,
                ];
        const a = at(start),
          b = at(end);
        if (!drawn || drawn[0] !== a[0] || drawn[1] !== a[1])
          commands.push(`M${a[0]},${a[1]}`);
        commands.push(`L${b[0]},${b[1]}`);
        drawn = b;
      } else drawn = null;
    }
    previous = point;
  }
  return commands.join(" ");
}
