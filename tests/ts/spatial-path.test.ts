import { describe, expect, it } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import { ghostPose, interpolate } from "../../packages/telemetry";
import {
  MAX_PATH_DEVIATION,
  PATH_DRAW_ERROR,
  racingPath,
  spatialPathKind,
  spatialPose,
} from "../../packages/telemetry/spatial-path";

function sample(distance: number, x: number, y: number, z: number): Sample {
  return {
    distance,
    time: distance / 12,
    x,
    y,
    z,
    speed: 12,
    rpm: 4000,
    gear: 2,
    throttle: 1,
    brake: 0,
    steering: 0.1,
    longitudinalG: 0,
    lateralG: 1,
    verticalG: 0,
    trackGradient: 0,
    offset: 0,
    cornerId: 1,
    sectorId: 1,
  };
}
function circle() {
  const points = Array.from({ length: 41 }, (_, i) => {
    const angle =
      (2 * Math.PI * i) / 40 + 0.1 * Math.sin((2 * Math.PI * i) / 40);
    return sample(
      40 * angle,
      40 * Math.sin(angle),
      3 * Math.sin(angle),
      40 * Math.cos(angle),
    );
  });
  Object.assign(points.at(-1)!, {
    x: points[0].x,
    y: points[0].y,
    z: points[0].z,
  });
  return points;
}
const position = (p: Sample) => [p.x, p.y, p.z];

describe("shared spatial trajectory", () => {
  it("matches an independently solved natural cubic and its tangent", () => {
    const points = [
      sample(0, 0, 0, 0),
      sample(1, 1, 0, 0.1),
      sample(2, 2, 0, 0),
    ];
    expect(spatialPathKind(points)).toBe("natural-cubic");
    for (let x = 0; x <= 1; x += 0.05) {
      const pose = spatialPose(points, x)!;
      expect(pose.position[0]).toBeCloseTo(x, 13);
      expect(pose.position[2]).toBeCloseTo(0.15 * x - 0.05 * x ** 3, 13);
      expect(pose.tangent[2]).toBeCloseTo(0.15 - 0.15 * x ** 2, 13);
    }
  });

  it("has continuous position, tangent and curvature at nonuniform knots and the closed seam", () => {
    const points = circle(),
      eps = 0.0001,
      end = points.at(-1)!.distance;
    expect(spatialPathKind(points)).toBe("periodic-cubic");
    for (const point of points.slice(0, -1)) {
      const at = point.distance,
        before = spatialPose(points, at === 0 ? end - eps : at - eps)!,
        exact = spatialPose(points, at)!,
        after = spatialPose(points, at + eps)!;
      expect(exact.position).toEqual(position(point));
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(before.tangent[k] - after.tangent[k])).toBeLessThan(
          0.00001,
        );
        const left = (exact.tangent[k] - before.tangent[k]) / eps,
          right = (after.tangent[k] - exact.tangent[k]) / eps;
        expect(Math.abs(left - right)).toBeLessThan(0.000001);
      }
    }
    for (let k = 0; k < 3; k++)
      expect(spatialPose(points, 0)!.tangent[k]).toBeCloseTo(
        spatialPose(points, end)!.tangent[k],
        12,
      );
  });

  it("follows the curve between native samples, retaining channels, time/distance equivalence and deterministic seeking", () => {
    const points = circle(),
      before = structuredClone(points),
      lap = { samples: points, lapTime: points.at(-1)!.time };
    points.forEach(Object.freeze);
    Object.freeze(points);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1],
        distance = (a.distance + b.distance) / 2,
        time = (a.time + b.time) / 2,
        pose = ghostPose(lap, time),
        p = interpolate(points, distance, "distance");
      position(pose.sample).forEach((v, k) =>
        expect(v).toBeCloseTo(position(p)[k], 11),
      );
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(40, 3);
      expect(
        Math.hypot(p.x - (a.x + b.x) / 2, p.z - (a.z + b.z) / 2),
      ).toBeGreaterThan(0.05);
      const behind = interpolate(points, distance - 0.001, "distance"),
        ahead = interpolate(points, distance + 0.001, "distance");
      expect(pose.yaw).toBeCloseTo(
        Math.atan2(ahead.x - behind.x, ahead.z - behind.z),
        7,
      );
      for (const field of [
        "speed",
        "rpm",
        "brake",
        "steering",
        "distance",
        "time",
      ] as const)
        expect(pose.sample[field]).toBeCloseTo((a[field] + b[field]) / 2, 11);
      ghostPose(lap, lap.lapTime);
      expect(ghostPose(lap, time)).toEqual(pose);
    }
    expect(points).toEqual(before);
    expect(ghostPose(lap, -1).sample).toEqual(points[0]);
    expect(ghostPose(lap, lap.lapTime + 10).sample).toEqual(points.at(-1));
  });

  it("draws the same curve within five millimetres and retains native braking knots", () => {
    const points = circle();
    points[5].brake = 0.9;
    const line = racingPath(points);
    expect(line.length).toBeGreaterThan(points.length * 3);
    expect(line.length).toBeLessThan(points.length * 64);
    for (const point of points) expect(line).toContain(point);
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i],
        b = line[i + 1];
      for (const fraction of [0.2, 0.5, 0.8]) {
        const distance = a.distance + (b.distance - a.distance) * fraction,
          actual = interpolate(points, distance, "distance"),
          chord = [
            a.x + (b.x - a.x) * fraction,
            a.y + (b.y - a.y) * fraction,
            a.z + (b.z - a.z) * fraction,
          ];
        expect(
          Math.hypot(...position(actual).map((v, k) => v - chord[k])),
        ).toBeLessThan(PATH_DRAW_ERROR);
      }
      expect(a.brake).toBeCloseTo(
        interpolate(points, a.distance, "distance").brake,
        12,
      );
    }
  });

  it("bounds departure for the whole curve and keeps excessive/reversing sparse input linear consistently", () => {
    const points = circle();
    for (let i = 0; i < points.length - 1; i++)
      for (let j = 0; j <= 20; j++) {
        const a = points[i],
          b = points[i + 1],
          f = j / 20,
          p = spatialPose(
            points,
            a.distance + (b.distance - a.distance) * f,
          )!.position;
        expect(
          Math.hypot(
            ...p.map(
              (v, k) =>
                v - position(a)[k] - (position(b)[k] - position(a)[k]) * f,
            ),
          ),
        ).toBeLessThan(MAX_PATH_DEVIATION);
      }
    for (const unsafe of [
      [
        sample(0, 0, 0, 0),
        sample(10, 10, 0, 0),
        sample(20, 10, 0, 10),
        sample(30, 0, 0, 10),
        sample(40, 0, 0, 0),
      ],
      [sample(0, 0, 0, 0), sample(0.1, 0.1, 0, 0), sample(0.2, 0, 0, 0)],
    ]) {
      expect(spatialPathKind(unsafe)).toBe("linear");
      expect(racingPath(unsafe)).toBe(unsafe);
      expect(spatialPose(unsafe, unsafe[1].distance / 2)).toBeNull();
      expect(interpolate(unsafe, unsafe[1].time / 2).x).toBe(unsafe[1].x / 2);
    }
    expect(spatialPose([points[0]], 0)).toBeNull();
    expect(() => spatialPose([], 0)).toThrow();
    expect(() => spatialPose(points, NaN)).toThrow();
  });
});
