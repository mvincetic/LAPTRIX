import { describe, expect, it } from "vitest";
import { drivingMap, drivingSectors } from "../../apps/web/src/driving-hud";
import {
  trackSchema,
  type Lap,
  type Sample,
} from "../../packages/shared/schema";
import development from "../../data/tracks/ardennes-development.json";
import showcase from "../../data/tracks/red-bull-ring.json";

describe("driving telemetry presentation", () => {
  it("uses precise split boundaries, hides future results and restores prior states on seeks", () => {
    const lap: Pick<Lap, "lapTime" | "sectors"> = {
      lapTime: 61.25,
      sectors: [
        { id: 1, time: 20.5, split: 20.5, startDistance: 0, endDistance: 100 },
        {
          id: 2,
          time: 21.25,
          split: 41.75,
          startDistance: 100,
          endDistance: 210,
        },
        {
          id: 3,
          time: 19.5,
          split: 61.25 + 1e-12,
          startDistance: 210,
          endDistance: 300,
        },
      ],
    };
    const before = structuredClone(lap);
    const initial = drivingSectors(lap, 0);
    expect(initial.map((s) => [s.state, s.elapsed])).toEqual([
      ["active", 0],
      ["upcoming", null],
      ["upcoming", null],
    ]);
    expect(drivingSectors(lap, 20.49)[0].elapsed).toBeCloseTo(20.49);
    expect(drivingSectors(lap, 20.5).map((s) => [s.state, s.elapsed])).toEqual([
      ["complete", 20.5],
      ["active", 0],
      ["upcoming", null],
    ]);
    expect(drivingSectors(lap, 43.75)[2]).toEqual({
      id: 3,
      state: "active",
      elapsed: 2,
    });
    for (const time of [lap.lapTime, lap.lapTime + 5])
      expect(
        drivingSectors(lap, time).map((s) => [s.state, s.elapsed]),
      ).toEqual([
        ["complete", 20.5],
        ["complete", 21.25],
        ["complete", 19.5],
      ]);
    expect(drivingSectors(lap, 0)).toEqual(initial);
    expect(drivingSectors(lap, -1)).toEqual(initial);
    expect(lap).toEqual(before);
  });
  it.each([development, showcase])(
    "fits every source point and keeps north up for $name",
    (source) => {
      const track = trackSchema.parse(source);
      const samples: Sample[] = [...track.points, track.points[0]].map(
        (p, i) => ({
          x: p.x,
          y: p.y,
          z: p.z,
          distance: i * 10,
          time: i,
          speed: 10,
          rpm: 5000,
          gear: 2,
          throttle: 1,
          brake: 0,
          steering: 0,
          longitudinalG: 0,
          lateralG: 0,
          verticalG: 0,
          trackGradient: 0,
          offset: 0,
          cornerId: 0,
          sectorId: 1,
        }),
      );
      const map = drivingMap(track, { samples });
      for (const point of samples) {
        const p = map.project(point);
        expect(p.x).toBeGreaterThanOrEqual(11.99);
        expect(p.x).toBeLessThanOrEqual(168.01);
        expect(p.y).toBeGreaterThanOrEqual(11.99);
        expect(p.y).toBeLessThanOrEqual(108.01);
      }
      expect(map.project({ x: 0, z: -1 }).y).toBeLessThan(
        map.project({ x: 0, z: 0 }).y,
      );
      expect(map.project({ x: 1, z: 0 }).x).toBeGreaterThan(
        map.project({ x: 0, z: 0 }).x,
      );
      expect(map.start).toEqual(map.project(samples.at(-1)!));
      expect(map.path).not.toMatch(/NaN|Infinity/);
      expect(map.path.match(/L/g)!.length).toBeGreaterThanOrEqual(
        samples.length - 1,
      );
    },
  );
});
