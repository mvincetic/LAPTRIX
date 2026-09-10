import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import type { Track } from "../../packages/shared/schema";

/** Original circle in a sloped plane: R=500 m, y=0.28*z. */
export function slopedTerrainTrack(count = 40, width = 8): Track {
  return {
    ...source,
    schemaVersion: 2,
    closed: true,
    id: `terrain-slope-${count}`,
    name: `Original sloped circle ${count}`,
    provenance:
      "Original analytic R500 m circle with y=140 sin(theta), for terrain clearance checks; no surveyed data.",
    points: Array.from({ length: count }, (_, i) => {
      const theta = (i * 2 * Math.PI) / count;
      return {
        x: 500 * Math.cos(theta),
        z: 500 * Math.sin(theta),
        y: 140 * Math.sin(theta),
        widthLeft: width,
        widthRight: width,
        banking: 0,
      };
    }),
  };
}
