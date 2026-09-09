import type { Lap } from "../../../packages/shared/schema";

export type PlotViewport = {
  start: number;
  end: number;
  fullExtent: number;
  sectorId: number | null;
  x: number;
  width: number;
};

/** Keep canonical SVG coordinates; a viewport clips existing paths without resampling. */
export function plotViewport(
  lap: Lap | null,
  axis: "time" | "distance",
  sectorId: number | null,
): PlotViewport {
  const fullExtent = lap ? (axis === "time" ? lap.lapTime : lap.length) : 1;
  const sector = lap?.sectors.find((item) => item.id === sectorId);
  const start = sector
    ? axis === "time"
      ? sector.split - sector.time
      : sector.startDistance
    : 0;
  const end = sector
    ? axis === "time"
      ? sector.split
      : sector.endDistance
    : fullExtent;
  return {
    start,
    end,
    fullExtent,
    sectorId: sector?.id ?? null,
    x: (start / fullExtent) * 1000,
    width: ((end - start) / fullExtent) * 1000,
  };
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
