import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import type { Track } from "../../packages/shared/schema";

/** Original development geometry scaled within the existing 30km input contract. */
export const largeFramingTrack: Track = {
  ...source,
  schemaVersion: 2,
  closed: true,
  id: "large-framing-circuit",
  name: "Large framing development circuit",
  provenance:
    "Original synthetic source scaled five times for camera validation; no surveyed circuit.",
  points: source.points.map((p) => ({
    ...p,
    x: p.x * 5,
    y: p.y * 5,
    z: p.z * 5,
  })),
};
