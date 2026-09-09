import type { Point } from "../shared/schema";

export type SourceSegment = {
  index: number;
  distance: number;
  endDistance: number;
  length: number;
  horizontalLength: number;
  rise: number;
  startElevation: number;
  endElevation: number;
  gradePercent: number;
};
export type SourceProfile = {
  segments: SourceSegment[];
  length: number;
  ascent: number;
  descent: number;
  minElevation: number;
  maxElevation: number;
  maxUphill: number;
  maxDownhill: number;
};

/** Closed original-source chords. Grade means rise/horizontal run, not rise/3D length. */
export function sourceProfile(points: Point[]): SourceProfile {
  if (points.length < 3 || points.length > 2000)
    throw new Error("Source profile needs 3–2,000 ordered points.");
  if (points.some((p) => ![p.x, p.y, p.z].every(Number.isFinite)))
    throw new Error("Source profile coordinates must be finite.");
  let length = 0,
    ascent = 0,
    descent = 0;
  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const horizontalLength = Math.hypot(next.x - point.x, next.z - point.z);
    const rise = next.y - point.y;
    const segmentLength = Math.hypot(horizontalLength, rise);
    if (horizontalLength <= 0 || !Number.isFinite(segmentLength))
      throw new Error(
        "Source profile segments need finite, nonzero horizontal length.",
      );
    const distance = length;
    length += segmentLength;
    ascent += Math.max(0, rise);
    descent += Math.max(0, -rise);
    return {
      index,
      distance,
      endDistance: length,
      length: segmentLength,
      horizontalLength,
      rise,
      startElevation: point.y,
      endElevation: next.y,
      gradePercent: (100 * rise) / horizontalLength,
    };
  });
  return {
    segments,
    length,
    ascent,
    descent,
    minElevation: Math.min(...points.map((p) => p.y)),
    maxElevation: Math.max(...points.map((p) => p.y)),
    maxUphill: Math.max(0, ...segments.map((s) => s.gradePercent)),
    maxDownhill: Math.min(0, ...segments.map((s) => s.gradePercent)),
  };
}

/** Pointer inspection snaps to the source segment containing this closed-lap distance. */
export function sourceSegmentAtDistance(
  profile: SourceProfile,
  distance: number,
) {
  if (!Number.isFinite(distance))
    throw new Error("Source distance must be finite.");
  const target = Math.max(0, Math.min(profile.length, distance));
  let low = 0,
    high = profile.segments.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2);
    if (profile.segments[middle].distance <= target) low = middle;
    else high = middle - 1;
  }
  return low;
}
