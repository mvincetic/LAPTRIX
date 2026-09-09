import type { Lap, Track } from "../../../packages/shared/schema";
import {
  normalizeTrack,
  trackFingerprint,
} from "../../../packages/track-engine";

/** Restore only references of the same physical source, across arbitrary solver grids. */
export async function restoreReference(
  reference: Lap,
  track: Track,
): Promise<Lap | null> {
  if (
    reference.trackId !== track.id ||
    reference.sectors.length !== track.sectorFractions.length
  )
    return null;
  const fingerprint = await trackFingerprint(track);
  if (reference.alignment)
    return reference.alignment.trackFingerprint === fingerprint
      ? reference
      : null;
  if (reference.samples.length !== track.points.length + 1) return null;
  const frame = normalizeTrack(track);
  // Old results used source indices. Verify their actual positions before attaching alignment.
  if (
    track.points.some((p, i) => {
      const sample = reference.samples[i],
        normal = frame.normals[i];
      return (
        Math.hypot(
          sample.x - p.x - normal[0] * sample.offset,
          sample.y - p.y,
          sample.z - p.z - normal[2] * sample.offset,
        ) > 0.001
      );
    })
  )
    return null;
  return {
    ...reference,
    alignment: {
      trackFingerprint: fingerprint,
      progress: [...frame.distances.map((d) => d / frame.length), 1],
    },
  };
}
