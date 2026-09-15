import spruce from "../../../assets/environment/spruce.json";

export type GroundFootprint = [number, number][];

/** Keep original site indices: excluding a crown must not change other trees. */
export function visibleTreeIndices(
  positions: [number, number, number][],
  footprints: GroundFootprint[] = [],
) {
  return positions.flatMap(([x, , z], index) => {
    const radius =
      (spruce.minHeight + (index % spruce.heightVariants)) *
        spruce.radiusRatio +
      0.5;
    const collides = footprints.some((polygon) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j],
          b = polygon[i];
        const dx = b[0] - a[0],
          dz = b[1] - a[1];
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz),
          ),
        );
        if (Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) <= radius)
          return true;
        if (a[1] > z !== b[1] > z && x < a[0] + (dx * (z - a[1])) / dz)
          inside = !inside;
      }
      return inside;
    });
    return collides ? [] : [index];
  });
}
