import type { Sample } from "../shared/schema";

type Point = Pick<Sample, "x" | "y" | "z" | "distance">;
type Vec = [number, number, number];
type Segment = {
  start: number;
  length: number;
  a: Vec;
  b: Vec;
  c: Vec;
  d: Vec;
};
type Path = {
  segments: Segment[];
  kind: "periodic-cubic" | "natural-cubic" | "linear";
};
const paths = new WeakMap<Point[], Path>();
const axes = ["x", "y", "z"] as const;
// Presentation interpolation is bounded against the native chord, not a new solve.
export const MAX_PATH_DEVIATION = 0.5;
export const PATH_DRAW_ERROR = 0.005;

/** Thomas elimination; inputs stay intact for the cyclic correction and other axes. */
function tridiagonal(
  lower: number[],
  diagonal: number[],
  upper: number[],
  rhs: number[],
) {
  const b = diagonal.slice(),
    x = rhs.slice();
  for (let i = 1; i < b.length; i++) {
    const ratio = lower[i] / b[i - 1];
    b[i] -= ratio * upper[i - 1];
    x[i] -= ratio * x[i - 1];
  }
  x[x.length - 1] /= b.at(-1)!;
  for (let i = x.length - 2; i >= 0; i--)
    x[i] = (x[i] - upper[i] * x[i + 1]) / b[i];
  return x;
}

function secondDerivatives(values: number[], h: number[], closed: boolean) {
  const n = h.length,
    count = closed ? n : n + 1,
    lower = Array<number>(count).fill(0),
    diagonal = Array<number>(count).fill(1),
    upper = Array<number>(count).fill(0),
    rhs = Array<number>(count).fill(0),
    secants = h.map((length, i) => (values[i + 1] - values[i]) / length);
  for (let i = closed ? 0 : 1; i < n; i++) {
    const previous = (i + n - 1) % n;
    lower[i] = h[previous];
    diagonal[i] = 2 * (h[previous] + h[i]);
    upper[i] = h[i];
    rhs[i] = 6 * (secants[i] - secants[previous]);
  }
  if (!closed) return tridiagonal(lower, diagonal, upper, rhs);
  // Rank-one correction of the periodic tridiagonal system, O(n) storage/work.
  const corner = h[n - 1],
    gamma = -diagonal[0];
  diagonal[0] -= gamma;
  diagonal[n - 1] -= (corner * corner) / gamma;
  const u = Array<number>(n).fill(0);
  u[0] = gamma;
  u[n - 1] = corner;
  const x = tridiagonal(lower, diagonal, upper, rhs),
    z = tridiagonal(lower, diagonal, upper, u),
    factor =
      (x[0] + (corner * x[n - 1]) / gamma) /
      (1 + z[0] + (corner * z[n - 1]) / gamma),
    result = x.map((v, i) => v - factor * z[i]);
  return [...result, result[0]];
}

function prepare(samples: Point[]): Path {
  const fallback: Path = { segments: [], kind: "linear" },
    n = samples.length - 1;
  if (n < 2) return fallback;
  const first = samples[0],
    last = samples[n],
    closed = n > 2 && axes.every((axis) => first[axis] === last[axis]),
    h = samples.slice(1).map((p, i) => p.distance - samples[i].distance);
  if (h.some((length) => !Number.isFinite(length) || length <= 0))
    return fallback;
  const derivatives = axes.map((axis) =>
    secondDerivatives(
      samples.map((p) => p[axis]),
      h,
      closed,
    ),
  );
  const segments: Segment[] = [];
  for (let i = 0; i < n; i++) {
    const a = axes.map((axis) => samples[i][axis]) as Vec,
      chord = axes.map(
        (axis) => (samples[i + 1][axis] - samples[i][axis]) / h[i],
      ) as Vec,
      b = axes.map(
        (_, k) =>
          chord[k] -
          (h[i] * (2 * derivatives[k][i] + derivatives[k][i + 1])) / 6,
      ) as Vec,
      c = derivatives.map((values) => values[i] / 2) as Vec,
      d = derivatives.map(
        (values) => (values[i + 1] - values[i]) / (6 * h[i]),
      ) as Vec,
      end = b.map((v, k) => v + 2 * c[k] * h[i] + 3 * d[k] * h[i] ** 2) as Vec,
      startDeviation = b.map((v, k) => ((v - chord[k]) * h[i]) / 3) as Vec,
      endDeviation = end.map((v, k) => ((chord[k] - v) * h[i]) / 3) as Vec;
    // The two interior Bernstein weights sum to <= 3/4. This proves a bound
    // over the entire interval, including extrema missed by a sample-only test.
    const bound =
      0.75 *
      Math.max(Math.hypot(...startDeviation), Math.hypot(...endDeviation));
    const middle = chord.map((v, k) => 3 * v - b[k] - end[k]);
    if (
      !Number.isFinite(bound) ||
      bound > MAX_PATH_DEVIATION ||
      [b, middle, end].some(
        (v) => v.reduce((sum, value, k) => sum + value * chord[k], 0) <= 1e-12,
      )
    )
      return fallback;
    segments.push({ start: samples[i].distance, length: h[i], a, b, c, d });
  }
  return { segments, kind: closed ? "periodic-cubic" : "natural-cubic" };
}

function path(samples: Point[]) {
  let result = paths.get(samples);
  if (!result) {
    result = prepare(samples);
    paths.set(samples, result);
  }
  return result;
}

export function spatialPathKind(samples: Point[]) {
  return path(samples).kind;
}

function evaluate(segment: Segment, distance: number) {
  const t = Math.max(0, Math.min(segment.length, distance - segment.start));
  return {
    position: segment.a.map(
      (a, k) => a + t * (segment.b[k] + t * (segment.c[k] + t * segment.d[k])),
    ) as Vec,
    tangent: segment.b.map(
      (b, k) => b + t * (2 * segment.c[k] + 3 * t * segment.d[k]),
    ) as Vec,
  };
}

/** One C2 distance curve for the line, position inspector, ghosts and cameras. */
export function spatialPose(samples: Point[], distance: number) {
  if (!samples.length || !Number.isFinite(distance))
    throw new Error("Path needs samples and a finite distance");
  const { segments } = path(samples);
  if (!segments.length) return null;
  let lo = 0,
    hi = segments.length;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= distance) lo = mid;
    else hi = mid;
  }
  return evaluate(segments[lo], distance);
}

/** Native knots plus curvature-driven subdivisions; <= 5 mm chord error.
 * A 64-way per-interval budget bounds sparse imported traces. Unsafe curves keep
 * their native polyline everywhere, instead of smoothing only a rendered line.
 */
export function racingPath(
  samples: Sample[],
): (Point & Pick<Sample, "brake">)[] {
  const { segments } = path(samples);
  if (!segments.length) return samples;
  const result: (Point & Pick<Sample, "brake">)[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i],
      a = samples[i],
      b = samples[i + 1],
      secondStart = segment.c.map((v) => 2 * v) as Vec,
      secondEnd = segment.c.map(
        (v, k) => 2 * v + 6 * segment.d[k] * segment.length,
      ) as Vec,
      maxSecond = Math.max(
        Math.hypot(...secondStart),
        Math.hypot(...secondEnd),
      ),
      divisions = Math.min(
        64,
        Math.max(
          1,
          Math.ceil(
            segment.length * Math.sqrt(maxSecond / (8 * PATH_DRAW_ERROR)),
          ),
        ),
      );
    for (let j = 0; j < divisions; j++) {
      if (j === 0) {
        result.push(a);
        continue;
      }
      const f = j / divisions,
        distance = a.distance + f * segment.length,
        [x, y, z] = evaluate(segment, distance).position;
      result.push({
        distance,
        x,
        y,
        z,
        brake: a.brake + (b.brake - a.brake) * f,
      });
    }
  }
  result.push(samples.at(-1)!);
  return result;
}
