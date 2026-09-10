# Quasi-steady vertical tyre load

New results declare `verticalDynamics: "quasi-steady-road-normal-v1"`. The same
speed envelope calculates crest/compression load for centerline, minimum-curvature
and lap-time-refined trajectories, including every aero-study candidate. The model
is an unbanked point mass constrained to follow the road; it does not simulate
suspension motion, axle load transfer or flight.

## Geometry and force balance

Each incoming/outgoing 3D chord becomes a two-dimensional vector `(horizontal
length, elevation change)`. Signed Menger curvature of the two adjacent vectors
is `kv = 2 cross(a, b) / (|a| |b| |a+b|)`, in inverse metres. Positive values mean
compression, negative values mean a crest. Unequal source intervals are retained.
This is a discrete approximation in the horizontal-distance/elevation plane;
horizontal chord length approximates plan-view arc length. It does not smooth or
repair elevation noise. The original source remains unchanged by a solve.

For road speed `v`, mass including fuel `m`, slope angle `theta`, air density `rho`
and selected downforce area `ClA`, total contact load is:

```text
N / m = g cos(theta) + v² kv + rho ClA v² / (2 m)
```

This follows the road-normal projection of Newton's law and the centripetal
acceleration `v²/r`; see [OpenStax, Centripetal Force](https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force).
The downward aerodynamic force is assumed road-normal. Fixed aero coefficients,
constant tyre friction and rolling resistance `0.015 N` are LAPTRIX development
choices. Rolling loss now uses the same total contact load as grip, including
aerodynamic and curvature contributions; previous versions used normal weight
alone. Changes in lap time include both corrections.

The friction circle uses `mu N`. Lateral acceleration remains
`v² cos²(theta) kh`, where `kh` is signed horizontal Menger curvature. The initial
lateral cap retains its 98% capacity factor. Independently, wherever
`c = kv + rho ClA/(2m)` is negative, the initial speed also satisfies
`v² <= 0.98 g cos(theta) / -c`. This retains at least 2% of gravity-supported
contact load even on a straight crest with no lateral constraint. The 2% reserve
is a declared numerical margin, not a calibrated tyre or suspension property.

The existing forward/backward sweeps enforce wheel-force limits and can only
reduce these caps. Non-finite or nonpositive final contact load raises an explicit
geometry/source-spacing error. Positive contact alone does not establish full
feasibility: convergence and the existing maximum force-demand check remain
separate. Checks apply at discrete samples and do not certify continuous contact
between samples. Abrupt or noisy elevation can create large local curvature and
strong speed restrictions; finer interpolation adds no surveyed information.

## Authoritative telemetry and compatibility

| Field | Meaning |
| --- | --- |
| `samples[].verticalG` | Signed `v² kv / g`, road-normal kinematic acceleration excluding gravity; neither world-Y acceleration nor suspension/accelerometer output |
| `samples[].normalLoadG` | Positive `N / (m g)`, total tyre contact force as a multiple of vehicle weight, including gravity, curvature and downforce |
| `numericalChecks.minNormalLoadG` | Minimum of the complete normal-load sample array |
| `verticalDynamics` | Explicit interpretation/version marker for the new fields |

The shared Lap validator requires all normal-load values and a matching minimum
when the marker is present. It rejects partial, nonpositive, inconsistent or
undeclared normal-load data. Legacy laps without the marker remain valid: their
reserved zero `verticalG` is retained literally and no normal-load data is invented.
Mixed-generation native references survive Save and portable project restoration;
portable loading still recalculates the selected current lap with the installed
solver, as documented in PROJECT_FILES.md.

Cursor Data shows Vertical G in G and Normal tyre load in multiples of weight,
both to three decimal places. It explains the physical distinction and uses the
existing interpolation and playback clock. Legacy current telemetry instead shows
Vertical dynamics / Not modelled. The optional normal-load channel interpolates
only when both endpoints supply it; missing data stays missing. The seven default
graph channels are unchanged.
The optional Loads & elevation group now exposes whole-lap curves with declared
native-reference availability, shared scales and a 1× weight guide. Legacy reference
zeros remain unmodelled; see LOAD_GRAPHS.md.

## Independent checks

`tests/python/test_vertical_load.py` contains fourteen analytical cases:

- Eight exact circular vertical-arc checks cover crest/compression signs, unequal
  intervals, translations and yaw rotations, with curvature tolerance `1e-10 /m`.
- Two nonuniform straight-grade cases retain zero curvature within `1e-12 /m`.
- Three closed smooth height waves use independently differentiated continuous
  geometry at 360, 720 and 1,440 points. Acceleration/load error is bounded by
  `0.001 (360/count)²` G or multiples of weight; independent combined-force demand
  stays within 0.1%, and crest speed matches its analytical cap within 0.1%.
- A zero-downforce straight crest has no lateral speed restriction at its summit.
  The separate contact cap keeps it below the gravity contact limit, with minimum
  contact load between 0.019 and 0.04 times vehicle weight and passing force checks.

Existing slope, drivetrain and closed-wheel-work tests independently reconstruct
the new total load and rolling loss, retaining their prior tolerances. Their
previous weight-only expectations were updated because the declared equations
changed; failed initial logs remain in local artifacts. Fifteen TypeScript cases
cover compatibility, rejection and optional interpolation. Three browser journeys
cover real solver values, malformed imports, mixed-generation Save/portable
restoration at desktop/phone widths and explicit legacy-current presentation.

A retained pre-change synthetic wave study found 344 nodes with nonpositive
reconstructed contact load despite the old solver's converged force diagnostic.
Its crest speed was 107.390 m/s against an analytical zero-load limit of 90.400 m/s.
An isolated corrected prototype reduced it to 69.159 m/s because lateral demand
also applied, and all nodes retained contact. These are original synthetic probes,
not measured vehicle evidence. Production tests and both vehicle sampling studies
are the repeatable checks; see PHYSICS_BENCHMARKS.md and SOLVER_STUDY.md.

ELEVATION_SENSITIVITY.md adds a fixed 30-case source-phase study and six independent
geometry checks. Missing 10 cm waves and captured extrema can produce very different
loads while every discrete force check passes. This quantifies the raw-elevation
limitation without adding suspension, smoothing or a measured accuracy claim.

```powershell
node scripts/python.mjs -m pytest tests/python/test_vertical_load.py -q
npm run study:sampling -- --vehicle formula-development --output artifacts/vertical-load-formula-sampling.json
npm run study:sampling -- --vehicle gt-development --output artifacts/vertical-load-gt-sampling.json
```
