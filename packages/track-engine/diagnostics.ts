import type { Point } from "../shared/schema";

type Position = Pick<Point, "x" | "y" | "z">;
type ContactLocation = {
  firstFraction: number;
  secondFraction: number;
  x: number;
  z: number;
  firstHeight: number;
  secondHeight: number;
};
export type GeometryContact = {
  firstSegment: number;
  secondSegment: number;
  kind: "crossing" | "touch" | "overlap";
  from: ContactLocation;
  to: ContactLocation;
  minHeightGap: number;
  maxHeightGap: number;
};

const tolerance = 1e-6; // metres of geometric tolerance, not survey accuracy.
const detailLimit = 100;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const cross = (x: number, z: number, u: number, v: number) => x * v - z * u;

function contact(a: Position, b: Position, c: Position, d: Position) {
  const rx = b.x - a.x,
    rz = b.z - a.z,
    sx = d.x - c.x,
    sz = d.z - c.z;
  const rr = rx * rx + rz * rz,
    ss = sx * sx + sz * sz;
  const firstTolerance = tolerance / Math.sqrt(rr);
  const secondTolerance = tolerance / Math.sqrt(ss);
  const qx = c.x - a.x,
    qz = c.z - a.z;
  const determinant = cross(rx, rz, sx, sz);
  const location = (t: number, u: number): ContactLocation => ({
    firstFraction: clamp(t),
    secondFraction: clamp(u),
    x: a.x + clamp(t) * rx,
    z: a.z + clamp(t) * rz,
    firstHeight: a.y + clamp(t) * (b.y - a.y),
    secondHeight: c.y + clamp(u) * (d.y - c.y),
  });
  let kind: GeometryContact["kind"], from: ContactLocation, to: ContactLocation;
  if (Math.abs(determinant) > 1e-12 * Math.sqrt(rr * ss)) {
    const t = cross(qx, qz, sx, sz) / determinant;
    const u = cross(qx, qz, rx, rz) / determinant;
    if (
      t < -firstTolerance ||
      t > 1 + firstTolerance ||
      u < -secondTolerance ||
      u > 1 + secondTolerance
    )
      return null;
    kind =
      t > firstTolerance &&
      t < 1 - firstTolerance &&
      u > secondTolerance &&
      u < 1 - secondTolerance
        ? "crossing"
        : "touch";
    from = to = location(t, u);
  } else {
    // Parallel segments can share an interval; inspect its full height difference.
    if (
      Math.abs(cross(qx, qz, rx, rz)) > tolerance * Math.sqrt(rr) ||
      Math.abs(cross(d.x - a.x, d.z - a.z, rx, rz)) > tolerance * Math.sqrt(rr)
    )
      return null;
    const t0 = (qx * rx + qz * rz) / rr;
    const t1 = ((d.x - a.x) * rx + (d.z - a.z) * rz) / rr;
    let lo = Math.max(0, Math.min(t0, t1)),
      hi = Math.min(1, Math.max(t0, t1));
    if (lo > hi + firstTolerance) return null;
    kind = hi - lo > firstTolerance ? "overlap" : "touch";
    if (kind === "touch") lo = hi = clamp((lo + hi) / 2);
    const secondAt = (t: number) =>
      ((a.x + t * rx - c.x) * sx + (a.z + t * rz - c.z) * sz) / ss;
    from = location(lo, secondAt(lo));
    to = location(hi, secondAt(hi));
  }
  const firstGap = from.firstHeight - from.secondHeight;
  const lastGap = to.firstHeight - to.secondHeight;
  return {
    kind,
    from,
    to,
    minHeightGap:
      firstGap * lastGap <= 0
        ? 0
        : Math.min(Math.abs(firstGap), Math.abs(lastGap)),
    maxHeightGap: Math.max(Math.abs(firstGap), Math.abs(lastGap)),
  };
}

/** Inspect a validated closed source polyline, including its last-to-first segment.
 * Counts segment pairs, not unique places. AABB rejection bounds expensive work;
 * every pair is checked, while stored details are capped. No road-surface test.
 */
export function inspectTrackGeometry(points: readonly Position[]) {
  const n = points.length;
  if (n < 3 || n > 2000)
    throw new Error("Geometry inspection requires 3–2,000 points.");
  const segments = points.map((a, i) => {
    const b = points[(i + 1) % n];
    if (
      ![a.x, a.y, a.z].every(Number.isFinite) ||
      Math.hypot(b.x - a.x, b.z - a.z) < 1e-8
    )
      throw new Error(
        "Geometry inspection requires finite, horizontally distinct adjacent points.",
      );
    return {
      a,
      b,
      minX: Math.min(a.x, b.x),
      maxX: Math.max(a.x, b.x),
      minZ: Math.min(a.z, b.z),
      maxZ: Math.max(a.z, b.z),
    };
  });
  const contacts: GeometryContact[] = [];
  const counts = { crossing: 0, touch: 0, overlap: 0 };
  let minHeightGap: number | null = null;
  for (let i = 0; i < n; i++) {
    const first = segments[i];
    for (let j = i + 1; j < n; j++) {
      const second = segments[j];
      if (
        first.maxX + tolerance < second.minX ||
        second.maxX + tolerance < first.minX ||
        first.maxZ + tolerance < second.minZ ||
        second.maxZ + tolerance < first.minZ
      )
        continue;
      const hit = contact(first.a, first.b, second.a, second.b);
      if (
        !hit ||
        (hit.kind === "touch" && (j === i + 1 || (i === 0 && j === n - 1)))
      )
        continue;
      counts[hit.kind]++;
      minHeightGap = Math.min(minHeightGap ?? Infinity, hit.minHeightGap);
      if (contacts.length < detailLimit)
        contacts.push({ firstSegment: i, secondSegment: j, ...hit });
    }
  }
  const contactCount = counts.crossing + counts.touch + counts.overlap;
  return {
    algorithm: "closed-centerline-xz-v1" as const,
    units: "m" as const,
    tolerance,
    sourceSampleCount: n,
    checkedPairs: (n * (n - 1)) / 2,
    scanComplete: true as const,
    counts,
    contactCount,
    minHeightGap,
    contacts,
    detailLimit,
    omittedContacts: contactCount - contacts.length,
  };
}
