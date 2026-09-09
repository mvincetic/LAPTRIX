import type { Point } from "../../../packages/shared/schema";

export type GeographicPoint = {
  latitude: number;
  longitude: number;
  elevation: number;
};
const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const radians = Math.PI / 180;
// JSON writes -0 as 0; keep local binary fingerprints consistent with API/export data.
const canonicalZero = (value: number) => (value === 0 ? 0 : value);

function surfacePosition(point: GeographicPoint): [number, number, number] {
  const latitude = point.latitude * radians;
  const longitude = point.longitude * radians;
  const n = A / Math.sqrt(1 - E2 * Math.sin(latitude) ** 2);
  return [
    n * Math.cos(latitude) * Math.cos(longitude),
    n * Math.cos(latitude) * Math.sin(longitude),
    n * (1 - E2) * Math.sin(latitude),
  ];
}

/** Local WGS84 surface east/north, with supplied elevation retained independently. */
export function projectGeographicPoints(source: GeographicPoint[]): Point[] {
  if (!source.length) throw new Error("The GPX track has no points.");
  source.forEach((point, index) => {
    if (
      !Number.isFinite(point.latitude) ||
      Math.abs(point.latitude) > 90 ||
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude >= 180 ||
      !Number.isFinite(point.elevation) ||
      Math.abs(point.elevation) > 100000
    )
      throw new Error(
        `Point ${index + 1} has invalid latitude, longitude or elevation.`,
      );
  });
  const origin = surfacePosition(source[0]);
  const latitude = source[0].latitude * radians;
  const longitude = source[0].longitude * radians;
  return source.map((point) => {
    const position = surfacePosition(point);
    const [dx, dy, dz] = position.map((value, index) => value - origin[index]);
    // Bound the full chord, not its horizontal projection (an antipode projects near zero).
    if (Math.hypot(dx, dy, dz) > 10000)
      throw new Error(
        "All GPX points must be within 10 km of the first point.",
      );
    return {
      x: canonicalZero(-Math.sin(longitude) * dx + Math.cos(longitude) * dy),
      y: canonicalZero(point.elevation),
      z: canonicalZero(
        Math.sin(latitude) * Math.cos(longitude) * dx +
          Math.sin(latitude) * Math.sin(longitude) * dy -
          Math.cos(latitude) * dz,
      ),
    };
  });
}
