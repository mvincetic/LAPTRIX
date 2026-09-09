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

GT Development 01 is also synthetic. It uses selected numeric specification anchors
from the [Porsche EU 911 GT3 RS technical sheet, August 2022](https://newsroom.porsche.com/dam/jcr:1d390f77-93c3-49c0-89c7-634f5f02b26a/S22_3515_en.pdf)
alongside explicitly estimated parameters. The vehicle JSON records the URL,
anchored fields and assumptions, and the UI exposes them. See VEHICLE_MODEL.md
for the distinction between the published DIN mass and the independent base-mass
estimate. No manufacturer images, CAD, branding, measured telemetry or audio were
copied. The source document itself is linked, not redistributed.

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

## Track-data evaluation, 2026-09-09

[TUMFTM racetrack-database](https://github.com/TUMFTM/racetrack-database) was
reviewed as a potential geometry source. Its README describes smoothed
OpenStreetMap-derived centerlines and widths extracted from satellite imagery,
and warns that quality varies by location. Its format contains two horizontal
coordinates and widths, with no elevation channel. GitHub labels the repository
LGPL-3.0; a redistribution decision would require checking the selected revision
and underlying source-data terms. No dataset files have been copied or shipped.
It remains a candidate for explicitly approximate 2D imports, not a replacement
for independently documented 3D geometry. The original elevation circuit remains
the bundled source until appropriate data is identified.

## Application dependencies

React, React DOM, Vite, Three.js, React Three Fiber, Drei, Zod and FastAPI use MIT
licenses. NumPy and SciPy use BSD licenses; Pydantic uses MIT. Lucide icons use ISC.
Inter and Barlow Condensed fonts use SIL Open Font License and are bundled via
Fontsource packages with their license files. The npm lockfile and complete Python
requirements pin the actual dependency graph. Consult each package's included
license before redistributing a binary or hosted bundle; preserve required notices.
