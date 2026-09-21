# Continuous vehicle orientation — 2026-09-21

The user reported unnatural, jerky turn-in. The previous `ghostPose` aimed the
body from its current interpolated position toward a point 0.15 seconds ahead.
On slow, sparsely sampled corners, both points could lie on the same straight
segment. Heading held constant until the look-ahead crossed a vertex, then
changed rapidly. The Onboard mount inherited the same motion. Native browser
recordings reproduce this while the clock advances regularly at roughly 60 fps;
there are no repeated poses in the measured sequences.

## Changed presentation contract

`packages/telemetry/motion-frame.ts` derives a local tangent at each native sample
from its neighbouring positions and distance spacing. Yaw is unwrapped before
interpolation. Shape-preserving cubic Hermite curves join yaw, pitch and visual
steering with continuous first derivatives in distance. The closed-lap seam uses
periodic derivatives; open traces retain one-sided endpoint tangents. Steering
retains every native sample value and stays within each neighbouring value pair.

The frame is a pure function of the installed samples and canonical distance.
There is no frame-history filter, delayed steering, added animation clock or
changed lap speed. Weakly cached curves belong to each immutable sample array.
Seeking, reverse seeking, pausing and different playback rates select the same
frame at the same position. Current and reference vehicles share this rule;
finished references retain the finish frame. The existing Onboard mount consumes
that exact body frame. The Chase camera's parameters are unchanged in this fix.

The numerical `interpolate` function is unchanged: all sample fields, coordinates,
timing, speed, steering readouts and exported telemetry retain their existing
meaning. `ghostPose.sample` stays exact. Its separate `steering` property drives
the visual front-wheel rig. Wheel rotation and GT brake lamps keep their native
distance and brake channels. No source track, solver, Blender asset or vehicle
profile changes.

## Evidence

The retained baseline is `2fc50a8`. Four unchanged native laps cover Formula/GT
on Red Bull Ring and LAPTRIX Dev Track. A 120 Hz numerical sweep over each full
lap reduces the maximum sampled yaw acceleration as follows, in rad/s²:

| Circuit / car | Before | After |
| --- | ---: | ---: |
| Red Bull Ring / Formula | 340.30 | 14.55 |
| Red Bull Ring / GT | 329.93 | 15.11 |
| Dev Track / Formula | 129.48 | 4.65 |
| Dev Track / GT | 133.77 | 3.80 |

These measure the presentation, not a new yaw-dynamics model. The former
derivative discontinuities produce larger peaks at finer sampling intervals.

Twelve real browser Play sequences per version cover both cars/tracks in Chase
and Onboard, with additional 390 px Red Bull Ring views. Each records at least
four lap seconds around the affected corner on an identified RTX 3060 Ti/ANGLE
Direct3D11. Native samples stay near 60 fps before and after. The actual rendered
position is independently projected back onto native telemetry segments to
recover the clock interval; CPU callback timing is not used to estimate angular
rates. At this roughly 60 Hz cadence, Red Bull Ring peak yaw acceleration falls
from 169–172 to 3.9–6.7 rad/s². Dev Track falls from 59–65 to 1.3–2.1 rad/s².
No additional simulation requests or browser runtime errors occur. These short
samples do not establish whole-lap or low-end hardware performance.

Ignored evidence lives under `artifacts/motion-continuity/`: original lap JSON,
baseline function snapshot, numerical comparison, 24 frame streams, before/after
videos, 48 endpoint captures and independently derived browser metrics.

Six analytical tests cover steady turning on a sparse circle, continuity at
nonuniform knots and the seam, bounded steering, unchanged telemetry and seek
history, grade/coordinate transforms, and short/open traces. Existing ghost
tests now expect the shared finish tangent and smoothed sparse-square grade;
position, reference timing and source immutability assertions remain intact.
Two passing browser regressions inspect actual body and wheel derivatives around
a native steering extremum, including exact source position and repeated seeking.
Nineteen affected development journeys pass, covering those regressions, native
references, idle rendering, daylight, Onboard, portrait Chase and reference
appearance. The first run exposed two test-harness mistakes (capturing the
centerline response and filling a step-constrained range with arbitrary precision);
the corrected tests use the optimized lap and the precise distance inspector.
The complete core gate passes 360 TypeScript and 178 Python cases, lint/types,
eleven asset packages, source-context reproduction and production build.
Four complete native-GPU 1× laps in 390 px portrait fullscreen inspect 19,728
presented frames across both cars and circuits. Conservative body bounds remain
inside the frustum throughout (largest horizontal normalized bound 0.803), with
no runtime errors. Finish and widest-projection captures are retained under
`artifacts/motion-continuity-chase-*`. Both focused Red Bull Ring rig inspections
also pass. All 42 production-browser cases pass in one uninterrupted 13.7-minute
run. The fix is committed and pushed as `f8ab1ab`. Its remote run passes six of
eight jobs, including both motion regressions and the daylight follow-up. CI.md
records the GT-brake/fullscreen deadline failures and their bounded follow-ups.

## Remaining limits and next step

The vehicle still follows the authoritative piecewise-linear position samples.
This change smooths its visual frame; it does not invent suspension, tyre slip,
driver reactions or a smoother numerical racing line. Sharp or unrealistic
source geometry remains visible. The previously documented software-renderer
performance limit is still open.

After this fix is accepted, compare Chase height/distance and fixed FOV with
actual high-speed and braking playback in the existing finish–T1 slice. Keep
vehicle framing, deterministic seeking and source-ground clearance as gates.
Broader scenery construction remains paused.
