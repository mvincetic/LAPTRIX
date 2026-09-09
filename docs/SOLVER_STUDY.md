# Solver grid study — 2026-09-09

This is a numerical study of the original synthetic Ardennes Development Circuit
and Formula Development 01 at the default setup. It establishes model behavior,
not accuracy against a real circuit or car.

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
