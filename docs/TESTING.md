# Testing and validation

Portable-project tests verify v1/v2 bundles, names, installed vehicle physics,
reference identity, source-ID collisions and repeated imports without mutation.
Browser coverage opens a custom-track GT study with a Formula reference on a fresh
page, then saves/reloads it. Separate invalid-file and unavailable-API cases retain
the previous project/lap and exercise the import-specific retry action.

Delta-plot tests use hand-calculated unequal grids to verify retained breakpoints,
positive/negative deltas, boundary clamps and cursor interpolation. A real browser
journey imports a known timing relationship, checks corner/chart seeking, switches
axes, plays/pauses the same clock, replaces the reference and checks mobile width.

Reference tests reject wrong units, missing provenance, incomplete intervals,
nonmonotonic time/progress, mismatched source geometry and malformed native exports.
A hand-calculated example checks physical sector-gate interpolation with unequal
grids. Browser journeys import native and timing-only files, verify deltas, save
and restore, switch vehicles, and reject invalid files without losing the current
lap/reference. File inputs are located by their distinct accessible labels.

Independent grade/energy checks use long constant-grade arcs with separately
root-solved steady speeds, plus exported actuator work over a closed elevation lap.
Both uphill/downhill signs and both production vehicles are covered. Their limits
and tolerances are documented in PHYSICS_BENCHMARKS.md.

Vehicle coverage includes two catalog profiles, drivetrain contract rejection,
gear-boundary RPM/power constraints, GT specification arithmetic, numerical force
checks and bounded refinement. Browser tests retain a Formula reference while
simulating GT, verify corner correspondence and snapshot export, restore the saved
comparison, switch back, and exercise a failed vehicle change followed by retry.

Numerical regression tests live in `tests/python`. They cover track validation,
local frame orthogonality, full-loop distance, racing-line bounds and objective
reduction, strict telemetry ordering, closing endpoint, sector partitioning, lap
integration, the friction circle, braking/RPM/actuator bounds, mass/compound/track
state response, corner indices, an analytical flat circle, drivetrain power,
custom track API requests, invalid requests and cross-origin rejection.
The sparse quadratic is checked against an exhaustive small coupled-bound oracle,
its spatial objective on a nonuniform grid, and an explicit iteration-limit case.
Refinement tests cover seed improvement/retention, deterministic replay, rotated
start index, changed vehicle/setup, integrated telemetry and 720/1,440/2,000-point
seed convergence. Grid-study results are documented in SOLVER_STUDY.md.

Vitest covers frontend geometry winding and closure, schema failure cases,
time/distance interpolation, stepped gear fields, boundary clamping, time display
rounding and shared playback controls. These are invariant-focused checks rather
than implementation snapshots.

Playwright runs real services and a WebGL Chromium context. It exercises setup
changes, explicit simulation, reference comparison, play/pause/seek, corner
inspection, save/restore, layers, camera modes, graph tabs, SI CSV export,
responsive widths and recoverable backend errors. Failures retain traces/screenshots.
The lap-time journey runs the real solver, verifies gain accounting and force
diagnostics, seeks its actual corner sample, checks exported JSON and restores
the saved mode and reference.
An additional browser journey changes grid spacing, retains a source-resolution
reference, verifies corner deltas, reloads the saved project and exports the
original track alongside the effective grid. Python checks resampling bounds,
narrow widths, caps, interpolation rejection, analytical aero/grip and terminal
power balance. TypeScript checks fingerprints, legacy migration and interpolation
between unequal sample arrays; rigid map transforms preserve the searched lap.

Visual QA uses actual browser screenshots, reviewed by an agent, at desktop and
mobile sizes.
Run visual QA separately from the browser regression suite on machines using
software WebGL. Simultaneous renderers can consume enough CPU to delay ordinary
API/UI assertions. Aero-study completion waits allow 30 seconds for five sequential
requests; other interaction assertions retain their ordinary timeout.

The initial pass found mobile topbar overflow and camera framing;
those became explicit responsive checks. The first physics pass found a bad
speed-envelope update that collapsed speeds toward 1 m/s; the plausible-lap and
analytical-circle tests protect against its recurrence.

Passing numerical tests establishes behavior of this approximation only. No
surveyed circuit, measured car specification or recorded lap has been used to
validate real-world accuracy. Full production browser/device and accessibility
audits remain future work.
