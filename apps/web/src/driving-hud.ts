import type { Lap, Track } from "../../../packages/shared/schema";
import { racingPath } from "../../../packages/telemetry/spatial-path";

/** A fixed north-up map; fitting never depends on the moving camera or cursor. */
export function drivingMap(track: Track, lap: Pick<Lap, "samples">) {
  const points = [...track.points, ...lap.samples];
  const xs = points.map((point) => point.x),
    zs = points.map((point) => point.z);
  const left = Math.min(...xs),
    right = Math.max(...xs);
  const top = Math.min(...zs),
    bottom = Math.max(...zs);
  const scale = Math.min(
    156 / Math.max(1, right - left),
    96 / Math.max(1, bottom - top),
  );
  const project = (point: { x: number; z: number }) => ({
    x: 90 + (point.x - (left + right) / 2) * scale,
    y: 60 + (point.z - (top + bottom) / 2) * scale,
  });
  return {
    project,
    path: racingPath(lap.samples)
      .map((point, index) => {
        const p = project(point);
        return `${index ? "L" : "M"}${p.x.toFixed(3)},${p.y.toFixed(3)}`;
      })
      .join(" "),
    start: project(lap.samples[0]),
  };
}

/** Derive splits from the authoritative lap, including exact gates and reverse seeks. */
export function drivingSectors(
  lap: Pick<Lap, "sectors" | "lapTime">,
  cursor: number,
) {
  const time = Math.max(0, Math.min(lap.lapTime, cursor));
  return lap.sectors.map((sector, index) => {
    const start = index ? lap.sectors[index - 1].split : 0;
    const state =
      time >= lap.lapTime || time >= sector.split
        ? "complete"
        : time >= start
          ? "active"
          : "upcoming";
    return {
      id: sector.id,
      state,
      elapsed:
        state === "complete"
          ? sector.time
          : state === "active"
            ? time - start
            : null,
    };
  });
}
