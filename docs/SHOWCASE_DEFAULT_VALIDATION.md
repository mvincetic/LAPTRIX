# Showcase-default CI follow-up — 2026-09-22

Run [35716105268](https://github.com/mvincetic/LAPTRIX/actions/runs/35716105268)
checks the default-track commit `4e0330b`. Production shard 2 reported a 60-second
showcase journey deadline and two 15-second graphics-readback polling deadlines.
These are separate from the subsequent driving HUD change.

The showcase trace spends 15.17 s and 10.45 s in its two reloads. Move the added
Dev Track save/reload checks to a dedicated test at both original widths. Retain
all source, persistence and portable-restoration assertions, and the same deadlines.
The dedicated test additionally checks restored setup/reference identity.

The first graphics-restoration assertion times out before any context-loss event.
Its desktop screenshot call consumes 14.919 s; the pixel evaluation returns 3,651
blue pixels and GL error 0, meeting the original >100-pixel condition too late for
the poll deadline. The captured image shows the complete Red Bull Ring. Retain the
existing graphics thresholds/deadlines; this is not evidence of missing road geometry.

The completed run also reports deadline failures in aero studies, large-import
framing, corner/ghost annotations, load extrema, portable vehicle profiles, mixed
legacy load restoration and one phone fullscreen journey. Four development
shards reach the existing 20-minute browser ceiling. These failures have no new
numerical mismatch in the reported logs; they occur in long UI journeys.

Restore the original explicit Dev Track fixture for the independent aero,
large-import, annotation, extrema, vehicle-profile, legacy-load and generic
graphics-restoration scenarios. This avoids loading the larger showcase scenery
when it is not the subject of those regressions. First-visit/default tests still
start at Red Bull Ring; circuit-specific scenery, camera, HUD and daylight
restoration tests continue to exercise it. Keep assertions, test/global timeouts
and CI shard counts unchanged. The dedicated saved-selection browser cases make
the fixture's saved-project boundary explicit rather than altering production defaults.

Local logs and downloaded traces remain under ignored `artifacts/default-ci-production`
and `artifacts/driving-hud-*`. All 13 affected development browser cases pass locally
with their explicit fixtures. Five production showcase cases and both original
Red Bull Ring graphics-restoration cases also pass locally. This record does not claim the older remote run is
fully green. The next pushed revision runs the complete workflow again.
