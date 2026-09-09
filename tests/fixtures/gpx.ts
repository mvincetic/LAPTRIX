/** Original analytic circuit, not a recorded or third-party GPX asset. */
export function gpxFixture({
  count = 80,
  close = true,
  prefix = false,
  latitude = 0,
  longitude = 0,
}: {
  count?: number;
  close?: boolean;
  prefix?: boolean;
  latitude?: number;
  longitude?: number;
} = {}) {
  const points = Array.from({ length: count }, (_, index) => {
    const phase = (index / count) * 2 * Math.PI;
    return {
      latitude: latitude + 0.001 * Math.cos(phase),
      longitude: longitude + 0.0018 * Math.sin(phase),
      elevation: 30 + 2 * Math.sin(phase * 2),
    };
  });
  const tag = (name: string) => (prefix ? `g:${name}` : name);
  const rows = close ? [...points, points[0]] : points;
  return `<?xml version="1.0" encoding="UTF-8"?><${tag("gpx")} xmlns${prefix ? ":g" : ""}="http://www.topografix.com/GPX/1/1" version="1.1" creator="LAPTRIX original test fixture"><${tag("trk")}><${tag("name")}>Original GPX development circuit</${tag("name")}><${tag("trkseg")}>${rows.map((p) => `<${tag("trkpt")} lat="${p.latitude.toFixed(10)}" lon="${p.longitude.toFixed(10)}"><${tag("ele")}>${p.elevation.toFixed(8)}</${tag("ele")}></${tag("trkpt")}>`).join("")}</${tag("trkseg")}></${tag("trk")}></${tag("gpx")}>`;
}
