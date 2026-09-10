import type { SourceProfile } from "./profile";

/** Signed three-point curvature of unsmoothed horizontal-distance/elevation chords. */
export function sourceVerticalCurvature(
  profile: Pick<SourceProfile, "segments">,
) {
  const { segments } = profile;
  if (segments.length < 3 || segments.length > 2000)
    throw new Error("Source curvature needs 3–2,000 ordered segments.");
  if (
    segments.some(
      (segment) =>
        ![segment.horizontalLength, segment.length, segment.rise].every(
          Number.isFinite,
        ) ||
        segment.horizontalLength <= 0 ||
        segment.length <= 0,
    )
  )
    throw new Error(
      "Source curvature needs finite chords with positive horizontal length.",
    );
  return segments.map((outgoing, index) => {
    const incoming = segments[(index + segments.length - 1) % segments.length];
    const span = Math.hypot(
      incoming.horizontalLength + outgoing.horizontalLength,
      incoming.rise + outgoing.rise,
    );
    const cross =
      (incoming.horizontalLength / incoming.length) *
        (outgoing.rise / outgoing.length) -
      (incoming.rise / incoming.length) *
        (outgoing.horizontalLength / outgoing.length);
    const curvature = (2 * cross) / span;
    if (!Number.isFinite(span) || span <= 0 || !Number.isFinite(curvature))
      throw new Error("Source curvature must be finite.");
    return curvature === 0 ? 0 : curvature;
  });
}
