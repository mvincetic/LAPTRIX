import type { Lap } from "../../../packages/shared/schema";
import { interpolate } from "../../../packages/telemetry";

export type PlotTimeRange = Readonly<{ start: number; end: number }>;
export const minimumPlotWindow = 0.001;

/** The editor uses seconds; validate both axis projections before committing it. */
export function createPlotWindow(
  lap: Lap,
  start: number,
  end: number,
): PlotTimeRange | null {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start + minimumPlotWindow ||
    end > lap.lapTime
  )
    return null;
  const from = interpolate(lap.samples, start).distance;
  const to = interpolate(lap.samples, end).distance;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return { start, end };
}

export type PlotViewport = {
  start: number;
  end: number;
  fullExtent: number;
  sectorId: number | null;
  custom: boolean;
  x: number;
  width: number;
};

/** Keep canonical SVG coordinates; a viewport clips existing paths without resampling. */
export function plotViewport(
  lap: Lap | null,
  axis: "time" | "distance",
  sectorId: number | null,
  range: PlotTimeRange | null = null,
): PlotViewport {
  const fullExtent = lap ? (axis === "time" ? lap.lapTime : lap.length) : 1;
  const sector = lap?.sectors.find((item) => item.id === sectorId);
  const custom =
    lap && range ? createPlotWindow(lap, range.start, range.end) : null;
  const start =
    custom && lap
      ? axis === "time"
        ? custom.start
        : interpolate(lap.samples, custom.start).distance
      : sector
        ? axis === "time"
          ? sector.split - sector.time
          : sector.startDistance
        : 0;
  const end =
    custom && lap
      ? axis === "time"
        ? custom.end
        : interpolate(lap.samples, custom.end).distance
      : sector
        ? axis === "time"
          ? sector.split
          : sector.endDistance
        : fullExtent;
  return {
    start,
    end,
    fullExtent,
    sectorId: custom ? null : (sector?.id ?? null),
    custom: !!custom,
    x: (start / fullExtent) * 1000,
    width: ((end - start) / fullExtent) * 1000,
  };
}

export function plotTickLabel(
  value: number,
  viewport: PlotViewport,
  axis: "time" | "distance",
) {
  const baseDigits =
    axis === "time" && (viewport.custom || viewport.sectorId !== null) ? 1 : 0;
  const digits = viewport.custom
    ? Math.max(
        baseDigits,
        Math.ceil(-Math.log10((viewport.end - viewport.start) / 5)) + 1,
      )
    : baseDigits;
  return value.toFixed(Math.min(12, digits));
}

export const viewportFraction = (value: number, viewport: PlotViewport) =>
  (value - viewport.start) / (viewport.end - viewport.start);

/** Pointer fractions are local to the selected window; playback remains full-lap. */
export function viewportLapFraction(fraction: number, viewport: PlotViewport) {
  if (!Number.isFinite(fraction)) throw new Error("Plot cursor must be finite");
  return (
    (viewport.start +
      Math.max(0, Math.min(1, fraction)) * (viewport.end - viewport.start)) /
    viewport.fullExtent
  );
}
