import { describe, expect, it } from "vitest";
import { trackFingerprint } from "../../packages/track-engine";
import type { Track } from "../../packages/shared/schema";
import {
  projectGeographicPoints,
  type GeographicPoint,
} from "../../apps/web/src/geographic";

const point = (
  latitude: number,
  longitude: number,
  elevation = 10,
): GeographicPoint => ({ latitude, longitude, elevation });
describe("local geographic surface projection", () => {
  it("retains source identity through JSON serialization of southern-hemisphere zeros", async () => {
    const projected = projectGeographicPoints(
      Array.from({ length: 40 }, (_, index) => ({
        latitude: -33 + 0.001 * Math.cos((index / 40) * Math.PI * 2),
        longitude: 151 + 0.001 * Math.sin((index / 40) * Math.PI * 2),
        elevation: -0,
      })),
    );
    const track: Track = {
      schemaVersion: 2,
      id: "geographic-roundtrip",
      name: "Original geographic fixture",
      country: "",
      provenance: "Original analytic geometry, not measured data.",
      synthetic: true,
      closed: true,
      sectorFractions: [1 / 3, 2 / 3, 1],
      points: projected.map((point) => ({
        ...point,
        widthLeft: 6,
        widthRight: 6,
        banking: 0,
      })),
    };
    expect(await trackFingerprint(track)).toBe(
      await trackFingerprint(JSON.parse(JSON.stringify(track))),
    );
    for (const point of projected)
      for (const value of Object.values(point))
        expect(Object.is(value, -0)).toBe(false);
  });
  it("matches equatorial arc geometry and retains supplied elevations exactly", () => {
    const arc = 1000 / 6378137;
    const source = [
      point(0, 0, -25),
      point(0, (arc * 180) / Math.PI, 80.12345),
    ];
    const before = structuredClone(source);
    const projected = projectGeographicPoints(source);
    expect(projected[0]).toEqual({ x: 0, y: -25, z: 0 });
    expect(projected[1].x).toBeCloseTo(6378137 * Math.sin(arc), 8);
    expect(projected[1].z).toBe(0);
    expect(projected.map((value) => value.y)).toEqual([-25, 80.12345]);
    expect(source).toEqual(before);
  });
  it("uses north-negative z at the equator with the WGS84 meridional radius", () => {
    // Equatorial meridional curvature radius from the ellipse identity b²/a.
    const latitude = ((1 / 6335439.327293) * 180) / Math.PI;
    const [origin, north, south] = projectGeographicPoints([
      point(0, 0),
      point(latitude, 0),
      point(-latitude, 0),
    ]);
    expect(origin.z).toBe(0);
    expect(north.x).toBe(0);
    expect(north.z).toBeCloseTo(-1, 8);
    expect(south.z).toBeCloseTo(1, 8);
  });
  it("crosses the antimeridian without wrapping into a world-sized segment", () => {
    const p = projectGeographicPoints([point(0, 179.999), point(0, -179.999)]);
    expect(p[1].x).toBeCloseTo(6378137 * Math.sin((0.002 * Math.PI) / 180), 6);
    expect(p[1].z).toBeCloseTo(0, 12);
  });
  it("preserves local geometry under longitude rotation in the southern hemisphere", () => {
    const a = [point(-33, 0), point(-32.998, 0.001), point(-33.001, -0.002)];
    const b = a.map((p) => ({ ...p, longitude: p.longitude + 120 }));
    const left = projectGeographicPoints(a),
      right = projectGeographicPoints(b);
    left.forEach((p, i) => {
      expect(right[i].x).toBeCloseTo(p.x, 7);
      expect(right[i].z).toBeCloseTo(p.z, 7);
    });
    expect(left[1].z).toBeLessThan(0);
    expect(left[1].x).toBeGreaterThan(0);
  });
  it("rejects distant points using the complete surface chord, including antipodes", () => {
    expect(() => projectGeographicPoints([point(0, 0), point(0, 0.1)])).toThrow(
      "10 km",
    );
    expect(() =>
      projectGeographicPoints([point(0, 0), point(0, -180)]),
    ).toThrow("10 km");
  });
  it("rejects empty, nonfinite and out-of-contract geographic inputs", () => {
    expect(() => projectGeographicPoints([])).toThrow("no points");
    for (const p of [
      point(91, 0),
      point(-91, 0),
      point(0, 180),
      point(0, -181),
      point(NaN, 0),
      point(0, Infinity),
      point(0, 0, Infinity),
      point(0, 0, 100001),
    ])
      expect(() => projectGeographicPoints([point(0, 0), p])).toThrow(
        "Point 2",
      );
  });
});
