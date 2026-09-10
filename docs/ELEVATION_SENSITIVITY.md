# Elevation-sampling sensitivity

The original analytic study demonstrates a source limitation of the road-following
point-mass model: small, poorly sampled elevation changes can produce large load
and lap-time changes while every numerical force check passes. Finer solver spacing
does not recover a wave that is absent from the original samples. This is evidence
about this declared model and its inputs, not measured suspension or vehicle behavior.

## Reproduce and inspect

```powershell
node scripts/python.mjs scripts/elevation_study.py
node scripts/python.mjs -m pytest tests/python/test_elevation_study.py -q
```

The fixed study runs 30 centerline cases in both bundled vehicles. It writes
`artifacts/elevation-study.json` (about 49 MB) with all nine original source tracks,
vehicle snapshots, complete setup values, all 30 full returned Laps, numerical
checks, source/effective-grid metrics, solver provenance and a fingerprint of the
study script. `--output` selects another path. A rejected or numerically ineligible
case remains in the report and gives a nonzero exit status. It does not call the
browser, change the catalog, smooth source data or replace an active project.

## Original analytic input

The horizontal circle has radius R = 1,000 m, constant 6 m half-widths, no banking
and 360 elevation waves. Its horizontal wavelength is 17.453293 m. With angle θ,
amplitude A and phase p, the exact surface is:

```text
x = R cos θ, z = R sin θ
y = A sin(360 θ + p)
u = R θ
k_vertical = -A (360/R)² sin(360 θ + p)
             / [1 + (A 360/R cos(360 θ + p))²]^(3/2)
```

A is either 0 (flat control) or 0.10 m. The nonflat cases use phases 0 and π/2.
These phases are rotations of the same continuous ring. They are different sampled
tracks: on the 720-point source, phase 0 samples every zero crossing, while phase
π/2 samples alternating +0.10/−0.10 m extrema. The missing wave in the former is
not a rigid-transform bug in the solver. Its source simply has no useful evidence
of the continuous elevation between nodes.

The matrix compares each 720-point source on production source/5 m/3 m grids,
then directly samples the same analytic surface at 1,440 and 2,000 original nodes.
The 3 m production mode hits the 2,000-point cap; its actual spacing is about 3.14 m.
Directly supplying a denser source and interpolating a coarse source are separate
operations. Centerline mode isolates elevation sensitivity from line optimization.

## Observed model results

Lap times in seconds; each nonflat source has 0.10 m amplitude. Values are rounded
for this table; full precision and complete telemetry remain in the report.

| Original points / solver grid | Formula phase 0 | Formula phase π/2 | GT phase 0 | GT phase π/2 |
| --- | ---: | ---: | ---: | ---: |
| 720 / source | 68.391 | 112.832 | 74.253 | 142.317 |
| 720 / 5 m | 68.391 | 163.281 | 74.253 | 186.241 |
| 720 / 3 m (capped) | 68.391 | 187.253 | 74.253 | 207.097 |
| 1,440 / source | 180.867 | 180.867 | 201.580 | 201.580 |
| 2,000 / source | 185.958 | 186.102 | 205.772 | 205.911 |

The flat controls remain approximately 68.391 s for Formula and 74.253 s for GT.
The coarse phase-0 source stays within 1e−9 s of its corresponding flat control in
each production mode. All 30 cases converge and pass their existing 1.015 force
ratio tolerance with positive contact load; the largest ratio is about
1.000000010. Passing checks establish feasibility of the sampled discrete model,
not agreement with an unknown real surface.

The analytical continuous peak vertical curvature is 0.01296 /m. The coarse
phase-π/2 source captures about 40.51% of it; direct 1,440-point sources capture
81.01%, and 2,000-point sources about 89.58–89.76%. The 720-point phase-0 source
captures essentially none. Increasing its solver density preserves this absence.
The denser cases are still under-resolved and do not establish a converged true lap.

Metrics compare nodal curvature with the independently differentiated expression
above. They also evaluate piecewise-linear height error at 14,400 angular positions,
covering 40 points per wave. This is a sampled error estimate, not a certified
maximum bound. The phase-0 coarse source has near-zero error at its nodes but a
0.10 m inter-node height error. Nodal agreement alone therefore misses the whole
signal. A source's height/gradient bounds cannot by themselves establish useful
vertical-curvature resolution. The 0.50 m resampling displacement guard also does
not certify curvature accuracy; it checks a different geometric quantity.

## Checks and implications

Six independent tests verify the exact alternating source values, horizontal
radius, continuous peak curvature, and closed-form chord curvature
`4 A / (h² + 4 A²)` for horizontal chord length `h = 2 R sin(π/720)`.
They check outgoing slope independently, preserve original sources through all
three production modes, show that interpolation cannot recover the missing wave,
and verify that the 1,440-point original source captures the omitted extrema.
All nine tracks and 30 full Laps also pass the frontend's runtime schemas, with
unchanged parsed values, setup and vehicle snapshots.

The current solver treats supplied elevation as a road-following path. An elevation
error and an actual surface ripple with the same coordinates are indistinguishable
inputs. Suspension, tyres' transient response and flight are outside its scope;
the lap changes above should not be interpreted as measured vehicle penalties.

Retain supplied geometry and its provenance. Review elevation spacing and source
uncertainty before interpreting small lap-time differences. Smoothing would change
the assumed road and must be explicit, independently tested and retained as a
derived source if added. This study supplies no universal noise threshold, required
sampling interval, automatic correction or real-world error bar. See
[SAMPLING](SAMPLING.md) and [VERTICAL_LOAD](VERTICAL_LOAD.md) for current contracts.
