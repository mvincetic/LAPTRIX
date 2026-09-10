# Solver grid study — updated 2026-09-10

This is a numerical study of the original synthetic Ardennes Development Circuit
and Formula Development 01 at the default setup. It establishes model behavior,
not accuracy against a real circuit or car.

The first table records commit `cf91692`. The subsequent controlled-sampling update
changed the refinement anchor after an orientation-invariance test. Those tables
remain historical baselines; the final section records the slope-force correction.

Reproduce with `npm run study:solver`. The script writes full diagnostics to
`artifacts/solver-study.json`. Coordinates are periodically cubic-interpolated in
the source sample parameter; widths are linearly interpolated. No data file is
modified, and extra samples do not create new surveyed information. The default
720-sample input, setup and all three solver modes use the production code path.

| Samples | Centerline (s) | Curvature seed (s) | Refined (s) | Refinement gain (s) | Seed / refined runtime (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 180 | 74.142 | 70.608 | 70.511 | 0.097 | 25 / 658 |
| 360 | 74.430 | 71.379 | 71.316 | 0.063 | 49 / 1,263 |
| 720 | 74.486 | 71.532 | 71.466 | 0.066 | 129 / 2,470 |
| 1,440 | 74.452 | 71.652 | 71.589 | 0.063 | 400 / 5,143 |
| 2,000 | 74.432 | 71.662 | 71.599 | 0.063 | 557 / 7,349 |

Measurements used Windows, Python 3.12.7, NumPy/SciPy from the pinned environment.
Times are single local observations without API caching, not cross-machine
benchmarks or guaranteed response times. Concurrent browser tests can increase
observed wall time.

Every studied curvature seed passed its projected-gradient residual criterion;
every speed envelope converged. Maximum integrated force demand/capacity was below
1.0014 in these cases, within the 1.015 acceptance tolerance. Each local refinement
examined 78 candidates and retained an improvement under the identical setup.

The previous L-BFGS-B implementation exhausted 5,000 iterations at 1,440 samples.
Its pointwise offset regularization also varied in total strength with sample
count. The sparse active-set solver resolves the quadratic directly on each free
face, and the revised regularizer is integrated over distance. The default
curvature time changed from 71.544 to 71.532 seconds as part of that correction.

The 720-to-1,440 seed difference is about 0.120 seconds; the next refinement to 2,000
points changes it by about 0.010 seconds. Refined laps show similar sensitivity.
The coarse 180-point result is substantially optimistic. This is evidence to
retain a resolution caveat, not proof of an asymptotic error bound. In particular,
the 0.066-second default search gain is smaller than the 720-to-1,440 grid effect.
Displayed milliseconds describe calculated samples, not prediction accuracy.

Further work should establish a controlled spatial resampling policy and wider
curvature/gradient/vehicle benchmarks before claiming better physical accuracy.
The current search considers broad bounded blends; it does not solve every local
direction or establish a global minimum-lap-time trajectory.

## Production sampling comparison

`npm run study:sampling` compares all modes on the same untouched 720-point source.
Its output is `artifacts/sampling-study.json`. The search anchor is now invariant to
rigid coordinate transforms. Each sample mode has the same source fingerprint.

| Sampling | Grid points | Mean spacing (m) | Centerline (s) | Curvature (s) | Refined (s) | Seed / refined runtime (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 720 | 7.784 | 74.486 | 71.532 | 71.392 | 133 / 2,413 |
| 5 m target | 1,121 | 5.000 | 74.454 | 71.667 | 71.523 | 290 / 3,958 |
| 3 m target | 1,869 | 2.999 | 74.438 | 71.623 | 71.479 | 553 / 6,437 |

Every seed and speed envelope converged; maximum demand ratio remained below
1.0015. The 5 m/3 m refined difference is about 0.044 seconds. Maximum cubic-source
displacement was 0.242 m, below the 0.50 m guard; neither run reached the point cap.
These are discrete-model observations, not a rigorous error bound. Added samples
remain interpolations of synthetic geometry, not new measurements.

## Current sampling study after slope-force correction

On 2026-09-10, the same production-path sampling study was rerun after correcting
slope-normal weight, horizontal lateral speed and signed downhill braking. The
track, default Formula profile/setup and sampling policy are unchanged.

| Sampling | Grid points | Centerline (s) | Curvature (s) | Refined (s) | Gain (s) | Seed / refined runtime (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 720 | 74.473 | 71.514 | 71.374 | 0.140 | 165 / 3,443 |
| 5 m target | 1,121 | 74.441 | 71.649 | 71.506 | 0.143 | 345 / 5,542 |
| 3 m target | 1,869 | 74.425 | 71.606 | 71.462 | 0.144 | 638 / 9,075 |

All nine envelopes and their curvature seeds converge; every maximum demand ratio
is within floating-point roundoff of 1.0. Source fingerprints remain equal across
grids. The 5 m/3 m refined difference remains about 0.044 s, so the numerical
resolution caveat still applies. Runtime values are single local observations.
The current report is `artifacts/sampling-study.json` with its gate log at
`artifacts/slope-sampling-study-final.log`. New solver outputs carry source fingerprint
`sha256:9b6df677035dea8a13656277c923140953d2454b7cdb05684a9017aac20ebf61`.

At original resolution the Formula centerline/curvature laps change by -0.0129 /
-0.0181 s. GT centerline changes from 94.759842 to 94.745802 s and curvature from
91.468502 to 91.454362 s. These differences correct the declared development
equations; they do not establish a closer match to a measured real lap.
