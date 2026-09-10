# Source identity across JSON transport

The browser and solver identify the physical source using SHA-256 over the UTF-8
prefix `laptrix.track.v1\0`, followed by little-endian IEEE-754 float64 values:
point count, sector-fraction count, the fractions, then each point's `x`, `y`, `z`,
`widthLeft`, `widthRight` and `banking`, in that order. Descriptive metadata and the
track schema version are excluded. Project reuse separately checks schema version
because v1/v2 have different sector semantics.

Every exact zero is encoded as positive zero. Other values retain their exact
float64 representation, including subnormal values; there is no rounding or
geometry tolerance. The source object itself is unchanged. This corrects the
previous raw-sign-bit encoding while retaining every existing positive-zero hash
and the v1 prefix. JavaScript accepts JSON `-0` but serializes it as `0`; those
equivalent coordinates must not split source identity across API calls or Save.

## Reading historical references

Current matching references are returned unchanged. On a mismatch, the reader
can verify the old raw-byte fingerprint against the supplied source, then copy
only the alignment hash to its canonical value. Samples, progress, vehicle,
provenance and timing are retained. The legacy encoder is a reader helper; new
exports and calculations always use canonical encoding.

A native lap may retain original zero signs in `sampling.points` even when the
saved source has lost them. Recovery requires source sampling, matching source
and grid counts, an exact legacy hash over those points and current sector gates,
and a canonical hash equal to the current physical source. Resampled grids and
racing-line samples cannot supply this proof. The existing positional migration
for older unaligned native laps remains separate and unchanged.

If all original sign information is lost, a mismatching historical hash cannot be
verified. Such timing/native references remain rejected; the reader does not guess
sign patterns or accept approximate geometry. Portable projects and local Save
use the same verification boundary. Identity is a consistency check, not independent
authentication of an imported source, trajectory or claimed recording.

## Regression evidence

An accepted source with its first `banking` set to `-0` previously hashed to
`sha256:02cd7ca6d3467ef0f57345b850074b7539c08e80425946e800806f5521bb9633`.
Its API round trip hashed to the bundled source's unchanged canonical identity,
`sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689`.
The source could not restore its own generated reference, and portable preparation
created a false track-ID collision.

Nine TypeScript and five Python regressions cover those failures, coordinate zero
signs, subnormal distinctions, verified legacy migration, mismatching geometry,
lost/resampled source claims, immutable reference data and project reuse. The
browser journey imports literal `-0` JSON, restores both exported reference formats
against the in-memory source, preserves lap/cursor without recalculation, then
checks local Save and portable restoration in a fresh phone workspace.
