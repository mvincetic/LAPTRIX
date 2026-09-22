# Continuous racing-line geometry — 2026-09-22

The orientation repair left the vehicle travelling along straight native chords.
On the Red Bull Ring source grid a single join changes travel direction by about
24.4 degrees. More points on those same straight chords would not fix it.

`packages/telemetry/spatial-path.ts` constructs a cubic interpolant through the
native XYZ positions, parameterized by native racing-line distance. Closed laps
use periodic boundary conditions; open traces use natural end conditions. Position,
tangent and second derivative are continuous, including the closed seam. A cached
linear-time tridiagonal solve has no frame history or additional playback clock.

The shared telemetry interpolator evaluates XYZ on this curve. Body yaw/pitch
follow its actual tangent; current/reference vehicles and Chase/Onboard cameras
therefore use the same path. Numerical steering retains its native interpolation;
front-wheel presentation retains the preceding shape-preserving steering curve.
All other channels, native knots, source identity, distance/time mapping, stored
Lap/project data, solver output and lap/sector times remain unchanged.

The visible racing line retains every native knot and subdivides each interval
according to its second-derivative bound. The resulting chords deviate from the
continuous path by at most 5 mm. Straight sections need few extra points; tight
turns receive more. Brake colors use the same linear native brake channel at each
added vertex. A 64-subdivision interval budget bounds imported input; the accepted
curve's displacement bound keeps its required subdivisions below that budget.

## Conservative interpolation

The cubic's two interior Bezier control displacements prove a whole-interval
deviation bound of 0.50 m against its native chord. All three derivative controls
must advance along that chord, ruling out backwards loops or a stationary tangent.
If any interval fails, the entire lap retains linear positions and the native
polyline; it does not display a smooth line with a different vehicle trajectory.
The earlier visual orientation fallback remains available for such sparse traces.
Short, stationary and reversing traces are handled without inventing a closing lap.

This is bounded interpolation of existing samples, not new measured geometry or a
denser physics solve. Native distance remains the solver's chord-distance parameter;
the interpolated curve's exact arc length is slightly different. The guard limits
departure but does not establish survey accuracy or arbitrary imported road clearance.
The explicit 5 m / 3 m solver modes remain available separately.

The cursor's XYZ and matched comparison-row positions use this same interpolant.
Comparison JSON explicitly reports `linear-except-position`, the native-distance
parameter and each side's effective `periodic-cubic`, `natural-cubic` or `linear`
position mode. Timing-only references have no position mode. The embedded original
inputs and ordinary native Lap exports remain unchanged.

## Verification

Five analytical regressions cover an independently solved natural cubic,
nonuniform periodic position/tangent/curvature continuity, actual travel direction,
unchanged numerical channels and seeks, drawing error/brake alignment, and whole-path
fallback for excessive or reversing input. Existing frame tests now judge the
approximate circle's actual tangent, rather than demanding an exact circular yaw
on a different positional path. Rendered Formula and GT regressions verify actual
position derivatives around the Red Bull Ring steering extremum, exact native
knots, deviation from the old chord, denser line buffers and car/line agreement.

Local core checks pass 365 TypeScript and 178 Python tests, lint/type checks,
eleven asset packages, source-context reproduction and production build.
Fourteen affected browser cases pass: the two rendered path regressions plus
twelve cursor, comparison-export, Onboard, portrait-Chase and reference-ghost
journeys. The latter batch completes in 3.9 minutes. Exact-revision remote
acceptance is available through the working-branch link in CI.md.

Twelve native-GPU Play sequences per version cover both cars and circuits in
Chase/Onboard, plus narrow 390 px Red Bull Ring views. Each retains at least four
lap seconds around the maximum steering event, screenshots, video and actual
rendered positions. The matched baseline disables only the shared spatial curve
in the browser, restoring the preceding straight-chord positions and frame code.
All four native lap/sector/alignment hashes match before/after. The integrated
RTX 3060 Ti / ANGLE Direct3D11 recordings stay around 60 fps, with no repeated
vehicle positions, runtime errors or additional simulation requests. These short
recordings do not establish full-lap or low-end hardware performance.

A separate full-lap portrait-fullscreen run subsequently checks 19,723 presented
frames across all four vehicle/circuit combinations, with no clipped body bounds
or runtime errors. Additional matched paused apex captures show the old polygon
and the new continuous bend at the same clock time. Eight jobs accept the original
commit on CI; CI.md records the remaining scenery-readiness test correction.

| Circuit / car | Native / drawn vertices | Largest chord join, before / after | Maximum positional departure |
| --- | ---: | ---: | ---: |
| Red Bull Ring / Formula | 721 / 1,420 | 24.38° / 3.99° | 0.189 m |
| Red Bull Ring / GT | 721 / 1,423 | 24.36° / 3.99° | 0.188 m |
| LAPTRIX Dev Track / Formula | 721 / 1,781 | 10.22° / 1.80° | 0.139 m |
| LAPTRIX Dev Track / GT | 721 / 1,780 | 10.22° / 1.80° | 0.138 m |

The drawn joins approximate the curve within 5 mm; the vehicle follows the
continuous curve itself. Downward raycasts from every drawn vertex hit the actual
road mesh on all four laps. The line stays 52–122 mm above that road, consistent
with the existing presentation lift. Native source road geometry is unchanged.
Ignored evidence is retained in `artifacts/spatial-path/`, with the repeatable
browser comparison in `artifacts/spatial-path-qa.mjs` and local gate logs alongside.
