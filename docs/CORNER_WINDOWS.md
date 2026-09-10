# Corner events across start/finish

New results declare `cornerAnalysis: "closed-windows-v1"`. Corner detection and
inspection treat the track as a closed loop, including when the apex, braking
point or exit lies next to the lap origin. The declaration distinguishes these
periodic intervals from historical results whose windows were clipped at the seam.

The original regression moves the source start to the second centerline corner's
apex. Formula lap time remains 74.9635944974407 s, but the old analyzer changes
braking distance from 116.713841 m to zero and corner duration from 3.295900 s to
1.787263 s. The corrected analyzer preserves both physical intervals. Comparing
complete before/after telemetry on the rotated source changes only `cornerId`;
positions, timestamps, velocities, control inputs and loads are identical.

## Periodic event extraction

The existing curvature-prominence detector still searches three copies of the
absolute curvature and retains peaks in the middle copy. Thresholds, peak spacing
and the meaning of apex are unchanged. Each entry/exit search now accesses periodic
indices, bounded to `floor(n / 12)` samples on either side of its apex. It stops at
the existing 25% curvature threshold. Throttle pickup retains its first sample
above 30% between apex and exit, falling back to exit.

Backward braking inspection follows samples above 5% through the seam. It stops
before the complete brake-to-exit sequence reaches one lap. This bound guarantees
termination even for continuously applied brakes; such a bound is not a measured
braking onset. Minimum speed considers every sample in the closed entry/exit window.
Corner IDs cover those samples, including both sides of the origin. IDs remain
ordered by canonical apex index; later IDs retain precedence in overlapping windows.

Extraction uses temporary unwrapped integer indices for interval arithmetic. For
an axis with a closing endpoint, `axis[i % n] + floor(i / n) × axis[n]` evaluates
its periodic continuation. Differences give braking distance and corner time.
Exported event indices are always canonical `0..n−1`; the duplicate closing sample
is not an event index. The existing Lap remains the only telemetry and time source.

## Validation, comparison and inspection

The shared reader requires declared event indices to follow braking, entry,
turn-in, apex, throttle and exit within one cycle. Duration, braking distance and
apex distance must match authoritative samples within 1e-7 seconds/metres. Positive
duration and nonnegative braking distance are required. Invalid order, duplicate
closing indices, multiple cycles and inconsistent interval metrics are rejected.

When exit precedes entry in canonical order, reference corner comparison includes
the reference's own remaining lap interval before continuing from its origin.
Interpolation still uses the current corner's entry/exit source progress and the
reference's original samples. This works for unequal native grids and timing-only
references; it does not depend on reference corner numbering. A rotated source
has a different source fingerprint and is not silently aligned to the old origin.

The detail panel identifies events that cross start/finish and explains that
displayed distances use the current lap origin. Its numerical controls and scene
labels pause and seek exact canonical sample times. Braking near lap end and apex
near time zero remain positions on the same clock. Pending setup, references and
project data survive inspection without any additional solve.

Historical Laps without the marker retain their original ordered-interval rules
and literal corner estimates. Their clipped windows are not retroactively repaired.
The current reader accepts both forms; portable project import recalculates its
current lap while retaining a valid saved reference. No file format number changes.

## Evidence and limits

Six solver regressions rotate the catalog source to before, at and after the
selected apex for Formula and GT. They match every detected event, speed, lateral G,
braking distance and duration under index rotation, with unchanged lap time.
Independent event fixtures sum nonuniform segment lengths/times across the seam,
check minimum speed and assigned sample IDs, bound continuous braking, and retain
no prominent corners for uniform curvature. Contract tests reject invalid declared
intervals while accepting historical estimates. Reference tests independently
calculate wrapped duration across unequal native and external timing arrays.

Desktop/phone browser journeys use actual centerline solves, rotate the source,
seek numerical and scene controls, compare identical laps and known 10% slower
timing, and retain the current Lap, source, pending setup and cursor. The separate
`node scripts/corner-seam-qa.mjs` captures all four event states and the detail panel
at 1600/1280/390 px, checking label separation, bounds, full project preservation,
zero extra solves and WebGL/runtime errors.

Peak prominence and the bounded event windows remain sampled heuristics, not
surveyed corner definitions or a guarantee of all possible turn separation. This
change corrects seam clipping; it does not add transient dynamics or calibrate the
development vehicle models. The existing speed envelope and line solver are intact.
