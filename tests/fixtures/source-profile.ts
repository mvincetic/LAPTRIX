import type { Track } from "../../packages/shared/schema";

/** Original analytic rectangle: 400m ramps rise/fall100m, joined by level300m sides. */
export const profileTrack: Track = {
  schemaVersion: 2,
  id: "source-profile-ramp",
  name: "Source profile ramp circuit",
  country: "",
  provenance:
    "Original analytic QA geometry; no recorded or third-party circuit.",
  synthetic: true,
  closed: true,
  sectorFractions: [1 / 3, 2 / 3, 1],
  points: Array.from({ length: 40 }, (_, index) => {
    const corners = [
      { x: 0, y: 0, z: 0 },
      { x: 400, y: 100, z: 0 },
      { x: 400, y: 100, z: 300 },
      { x: 0, y: 0, z: 300 },
    ];
    const edge = Math.floor(index / 10),
      fraction = (index % 10) / 10;
    const a = corners[edge],
      b = corners[(edge + 1) % 4];
    return {
      x: a.x + (b.x - a.x) * fraction,
      y: a.y + (b.y - a.y) * fraction,
      z: a.z + (b.z - a.z) * fraction,
      widthLeft: 6,
      widthRight: 6,
      banking: 0,
    };
  }),
};
