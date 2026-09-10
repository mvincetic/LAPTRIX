import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import type { Track } from "../../packages/shared/schema";

/** Original adversarial source: valid centerline, unsupported optimized slope. */
export function gradedWideTrack(): Track {
  const count = 240;
  const planar = Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count;
    const radius = 100 + 5 * Math.sin(8 * angle);
    return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
  });
  let elevation = 0;
  const points = planar.map((p, i) => {
    const point = {
      ...p,
      y: elevation,
      widthLeft: 40,
      widthRight: 40,
      banking: 0,
    };
    const next = planar[(i + 1) % count];
    elevation +=
      ((Math.hypot(next.x - p.x, next.z - p.z) * 0.29) /
        Math.sqrt(1 - 0.29 ** 2)) *
      (i < count / 2 ? 1 : -1);
    return point;
  });
  return {
    ...source,
    schemaVersion: 2,
    closed: true,
    id: "graded-wide-development",
    name: "Wide graded development loop",
    provenance:
      "Original synthetic regression geometry. Not a surveyed circuit.",
    points,
  };
}
