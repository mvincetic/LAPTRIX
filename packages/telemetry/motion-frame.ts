import type { Sample } from "../shared/schema";
import { spatialPose } from "./spatial-path";

type Curve = { values: number[]; slopes: number[] };
type Frame = { distance: number[]; yaw: Curve; pitch: Curve; steering: Curve };
// Installed lap samples are immutable. Releasing a lap also releases its curves.
const frames = new WeakMap<Sample[], Frame>();
const turn = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Monotone cubic derivatives preserve native extrema without overshoot. */
function curve(distance: number[], values: number[], periodic: boolean): Curve {
  const n = values.length - 1;
  if (n < 1) return { values, slopes: [0] };
  const h = distance.slice(1).map((v, i) => v - distance[i]),
    secant = h.map((v, i) => (values[i + 1] - values[i]) / v);
  const at = (a: number, b: number) => {
    if (secant[a] * secant[b] <= 0) return 0;
    const first = 2 * h[b] + h[a],
      second = h[b] + 2 * h[a];
    return (first + second) / (first / secant[a] + second / secant[b]);
  };
  const slopes = values.map((_, i) =>
    i === 0
      ? periodic
        ? at(n - 1, 0)
        : secant[0]
      : i === n
        ? periodic
          ? at(n - 1, 0)
          : secant[n - 1]
        : at(i - 1, i),
  );
  return { values, slopes };
}

function prepare(samples: Sample[]): Frame {
  const distance = samples.map((s) => s.distance),
    n = samples.length - 1,
    first = samples[0],
    last = samples[n],
    closed =
      n > 2 &&
      Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) < 1e-6,
    yaw: number[] = [],
    pitch: number[] = [];
  for (let i = 0; i <= n; i++) {
    if (closed && i === n) {
      yaw.push(yaw[n - 1] + turn(yaw[0] - yaw[n - 1]));
      pitch.push(pitch[0]);
      continue;
    }
    const p = samples[i],
      before = samples[i > 0 ? i - 1 : closed ? n - 1 : 0],
      after = samples[i < n ? i + 1 : n],
      back =
        i === 0 && closed
          ? last.distance - before.distance
          : p.distance - before.distance,
      ahead = after.distance - p.distance;
    const tangent = (axis: "x" | "y" | "z") => {
      if (back <= 0) return ahead > 0 ? (after[axis] - p[axis]) / ahead : 0;
      if (ahead <= 0) return (p[axis] - before[axis]) / back;
      // Derivative of the local quadratic on a nonuniform distance grid.
      return (
        (((p[axis] - before[axis]) * ahead) / back +
          ((after[axis] - p[axis]) * back) / ahead) /
        (back + ahead)
      );
    };
    const dx = tangent("x"),
      dy = tangent("y"),
      dz = tangent("z"),
      angle =
        Math.hypot(dx, dz) > 1e-12 ? Math.atan2(dx, dz) : (yaw.at(-1) ?? 0);
    yaw.push(i === 0 ? angle : yaw[i - 1] + turn(angle - yaw[i - 1]));
    pitch.push(-Math.atan2(dy, Math.hypot(dx, dz)));
  }
  return {
    distance,
    yaw: curve(distance, yaw, closed),
    pitch: curve(distance, pitch, closed),
    steering: curve(
      distance,
      samples.map((s) => s.steering),
      closed && first.steering === last.steering,
    ),
  };
}

/** A distance-derived visual frame; it has no elapsed-frame history or time lag. */
export function motionFrame(samples: Sample[], distance: number) {
  if (!samples.length || !Number.isFinite(distance))
    throw new Error("Motion needs samples and a finite distance");
  let frame = frames.get(samples);
  if (!frame) {
    frame = prepare(samples);
    frames.set(samples, frame);
  }
  const axis = frame.distance;
  let lo = 0,
    hi = axis.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (axis[mid] <= distance) lo = mid;
    else hi = mid;
  }
  const h = axis[hi] - axis[lo],
    t = h > 0 ? Math.max(0, Math.min(1, (distance - axis[lo]) / h)) : 0;
  const value = ({ values, slopes }: Curve) => {
    if (!h) return values[lo];
    const square = t * t,
      cube = square * t;
    return (
      (2 * cube - 3 * square + 1) * values[lo] +
      (cube - 2 * square + t) * h * slopes[lo] +
      (-2 * cube + 3 * square) * values[hi] +
      (cube - square) * h * slopes[hi]
    );
  };
  const path = spatialPose(samples, distance),
    [dx, dy, dz] = path?.tangent ?? [0, 0, 0];
  return {
    yaw: path ? Math.atan2(dx, dz) : turn(value(frame.yaw)),
    pitch: path ? -Math.atan2(dy, Math.hypot(dx, dz)) : value(frame.pitch),
    steering: value(frame.steering),
  };
}
