# Supported racing-line geometry

A valid source centerline does not guarantee a valid offset racing line. Changing
horizontal positions while retaining source elevation can steepen a solved chord;
broad widths can also let the curvature approximation double back between source
samples. Numerical convergence and force-demand checks do not establish that the
line stays inside this geometry domain.

`line_geometry_error` checks the initial optimized seed before calculating its speed
profile. The lap-time search uses that same helper for each candidate and retains
its existing rejected-candidate count. It checks:

- Finite solved coordinates.
- At least 0.1 m of forward progress projected onto each corresponding source
  interval, including the seam, so collapsed/reversed intervals cannot reach the
  envelope.
- Absolute rise / 3D chord length at most 0.30, the established slope-sine bound.

Derived checks allow a `1e-9` numerical margin at each boundary. Tests distinguish
roundoff from meaningful violations. The input Track contract is unchanged and
centerline mode continues to consume its validated source directly.

An invalid initial seed raises a descriptive error before the envelope or search.
The API returns 422 with advice to use **Centerline** mode or review source geometry,
elevations and widths. It does not silently change the solver mode or substitute a
different source. A failed import/run retains the completed workspace through the
existing calculation transaction; users can select Centerline and retry the import.
Invalid refined candidates are rejected within the existing bounded search.

## Evidence and limits

Original 240-point fixtures use radius `100 + amplitude sin(8 phase)` and 40 m
half-widths. With equal rising/falling source halves at slope ratio 0.29, amplitude
5 produces a converged optimized slope of 0.345159. Larger amplitudes reached
0.484206 and 0.964057 while the former force diagnostics still passed. A flat
amplitude-30 source produces -0.916 m forward progress in a converged seed.
These are adversarial development inputs, not surveyed circuits.

Eight Python tests cover both optimized modes, rejection before the envelope,
API recovery advice, valid centerline fallback, real reversed intervals and both
numerical boundaries. The browser journey uses actual API responses to check a
failed import, complete project/pending-setup/cursor preservation, mobile error
layout, successful centerline retry and subsequent optimized-run failure.
`node --experimental-strip-types scripts/line-geometry-qa.mjs` captures those states
at 1600, 1280 and 390 px in ignored `artifacts/`.

The helper enforces these discrete geometry limits; it does not certify continuous
road containment, surveyed surfaces, crossing topology, bridge clearance or a
globally optimal feasible line. A valid geometry may still fail the separate force
diagnostic. The source-contact and elevation inspectors remain useful for reviewing
inputs; they do not repair or authenticate them.
