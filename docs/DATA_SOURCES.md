# Data, dependencies and external solver evaluation

## Original data and assets

The track was authored for LAPTRIX using `scripts/generate_track.py`. A periodic
spline through original control points is resampled into 720 points; independent
periodic functions produce about 87 m of elevation variation. Centerline length is
approximately 5.605 km. It is inspired by the usefulness of an elevation circuit,
not copied from Spa, Monza or a game. The JSON is the runtime source of truth; the
generator is a reproducible provenance record. No claim of survey accuracy is made.

Formula Development 01 is a synthetic parameter set authored for this model. Its
values are illustrative, not official vehicle specifications. Terrain, trees and
the simple ghost mesh are procedural original geometry. The supplied UI screenshot
is retained only as design documentation, not shipped as the app's rendered scene.

## External research, inspected 2026-09-09

- [TUMFTM global racetrajectory optimization](https://github.com/TUMFTM/global_racetrajectory_optimization)
  declares **LGPL-3.0**. Its research pipeline offers curvature and minimum-time
  approaches but documents an older Python/Ubuntu environment and native dependency
  considerations. The upstream issue list has unresolved dependency questions.
  This is useful research context, not a drop-in dependency for this Windows MVP.
- [Fastest-lap](https://github.com/juanmanzanero/fastest-lap) declares **MIT**. Its
  C++ core/Python API and Ipopt/CppAD optimal-control approach offer richer transient
  dynamics. The native toolchain, vehicle calibration and separate data provenance
  need evaluation before integration. The README says full documentation is not yet
  available; repository presence alone does not establish a support commitment.

Neither repository's code, telemetry, vehicle parameters, geometry nor audio has
been copied or vendored. No integration license obligations are implied by this
evaluation. Any future integration must recheck the selected revision's license,
maintenance state and transitive dependencies, and isolate the adapter.

## Application dependencies

React, React DOM, Vite, Three.js, React Three Fiber, Drei, Zod and FastAPI use MIT
licenses. NumPy and SciPy use BSD licenses; Pydantic uses MIT. Lucide icons use ISC.
Inter and Barlow Condensed fonts use SIL Open Font License and are bundled via
Fontsource packages with their license files. The npm lockfile and complete Python
requirements pin the actual dependency graph. Consult each package's included
license before redistributing a binary or hosted bundle; preserve required notices.
