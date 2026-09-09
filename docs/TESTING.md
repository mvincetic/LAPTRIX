# Testing and validation

Sector viewport tests use unequal time/distance gates to verify mapped bounds,
pointer fractions and outside-cursor positions. Browser journeys retain complete
current/reference paths while zooming, inspect their actual projected cursor,
compare timing-only deltas and preserve reference choice, pending setup and failed
results. Successful calculations reset the range. Sector Analysis verifies exact
gate seeking and focus on the graph tab. A regression exposed the footer covering
desktop playback when a fixed-height workspace overflowed; content-based center
sizing now keeps the transport reachable while side columns remain scrollable.
`scripts/plot-range-qa.mjs` captures final range controls and plots at three widths.

Native channel comparison tests use hand-calculated unequal grids, including a
reference-only speed peak. They check merged knots, native sample/current-axis
separation, boundary interpolation, discrete gear, units, shared ranges and input
immutability. Browser journeys independently calculate seven reference readouts
from real Formula/GT results on source/5 m grids at desktop/mobile widths. Both
axes, keyboard activation, playback, tab changes and timing-only replacement retain
the current cursor without simulation requests. `scripts/telemetry-comparison-qa.mjs`
captures time/distance overlays and unavailable states at 1600/1280/390 px.

Ghost tests independently check sampled position, yaw/grade, unequal lap durations,
finish holding, shared-clock restart, rigid transforms and native source eligibility.
Browser journeys switch to a GT current lap with a Formula reference and compare
actual projected label positions: the reference remains fixed at the finish while
the current vehicle advances. They exercise independent visibility, keyboard toggle
activation and timing-only replacement at 1600/390 px. The reference ghost QA script
captures controls, orbit/top/chase framing, finished-reference and unavailable states.

Cursor inspection journeys use real exported solver samples and independently
interpolate between two nodes around a gear change. They verify continuous channel
values, UI unit conversions and stepped gear selection, then exercise exact time
entry during playback, invalid inputs, Escape, the closing endpoint, chart/corner
synchronization and draft reset after axis/result changes at 1600/390 px. The
regression also waits for the clock to advance after field focus and verifies the
captured input stays fixed before typing, protecting selection from playback updates.
The visual QA script `scripts/cursor-qa.mjs` captures the workspace and numerical panel at
1600, 1280 and 390 px and records the shared cursor, runtime errors and overflow.

Tab journeys at 1600/390 px check roving focus, arrow wrapping, Home/End, reciprocal
tab/panel relationships and hidden inactive panels. They operate layers and camera
buttons by keyboard, check axis pressed state, and retain both the canvas element
and the shared playback position across view changes. `scripts/tabs-qa.mjs` captures
focused layer, chase-legend, delta and sector layouts for visual inspection.

Keyboard journeys cover actions disclosure activation with Enter/Space, forward
and backward Tab exits, Escape, downloads and empty file-picker return at desktop
and mobile widths. A separate check looks for unnamed visible controls on the default
screen. The repeatable keyboard audit records first focus and Escape outcome and
captures focused-action screenshots. See ACCESSIBILITY.md for its limited scope.

Cancellation journeys hold real browser requests and verify requestfailed events
arrive from Cancel before the test releases its network gate. Normal runs and
both track/project import requests are covered. Complete project exports remain
identical, edited fuel remains pending, and a subsequent run/import succeeds.
Cancel is exercised at 390 px width. `scripts/cancellation-qa.mjs` captures pending
and cancelled states at desktop/mobile widths and checks retained lap data.

Track activation journeys inject separate selected-lap and baseline failures,
compare complete exported projects before/after, and retry the same source ID.
A failed selector change keeps its prior source and Retry activates the intended
track with a matching reference. Another journey holds both older import requests
until a newer import completes, then verifies stale responses cannot add a source
or replace the completed project. `scripts/track-failure-qa.mjs` captures retained
workspace/error layouts and verifies Save/reload after a failed import.

Track diagnostics use analytical closed polylines to check crossing/touch/overlap
semantics, seam handling and source-height interpolation, including an overlap
whose minimum gap lies inside the interval. Rotation/translation preserve gaps;
ordinary joins, parallel lanes and the development circuit produce no contacts.
The maximum source grid and capped-detail stress case exercise complete counts.
A real browser imports an original elevated crossing fixture, resamples the lap,
exports original source diagnostics, and saves/restores at mobile width. See
TRACK_DIAGNOSTICS.md for scope and `scripts/geometry-qa.mjs` for visual inspection.

Viewer-loading journeys delay and abort the real module request while calculating
laps, changing setup and using telemetry. Recovery explicitly saves and reloads,
then checks the restored name, setup and lap. `npm run test:production` rebuilds and
repeats these journeys against hashed assets on loopback preview port 5174; CI runs
both development and production browser gates. API tests accept exact preview
origins and reject other ports and hostname suffixes. `scripts/viewer-load-qa.mjs`
captures both placeholder states at desktop/mobile widths and checks recovery.

Portable-project tests verify v1/v2/v3 bundles, names, installed vehicle physics,
reference identity, source-ID collisions and repeated imports without mutation.
Browser coverage opens a custom-track GT study with a Formula reference on a fresh
page, then saves/reloads it. Separate invalid-file and unavailable-API cases retain
the previous project/lap and exercise the import-specific retry action.
Embedded-profile tests reject missing declarations, unknown nested fields and
out-of-bounds inputs before archival defaults apply. Pure local preparation checks
combined source/vehicle collisions, repeat imports and save fallback rules. API
tests prove inline physics and cache separation without server-catalog writes.
Browser journeys exercise template export, collision renaming, literal references,
reruns, save/reload and fresh portable restoration. Every track baseline, aero row
and project solve is checked for its inline profile. Invalid files, API failures,
cancellation, superseded imports and either failing embedded-project solve retain
the workspace and avoid registering partial entries. `vehicle-profiles-qa.mjs`
captures actions, details, comparison and errors at 1600/1280/390 px in isolation.
Maximum-length unbroken metadata also exercises panel widths. A regression checks
details, lap/reference labels, ghost controls and aero context at all three widths;
the visual report records both document and panel overflow measurements.

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
Keep application source unchanged during browser gates. A watched-module edit can
trigger a Vite reload and invalidate an otherwise valid response/interaction; rerun
the affected gate with source fixed rather than weakening its assertions.
Project naming compares complete exported bundles before/after edits at desktop
and phone widths, including pending setup, references and an exact playback position.
It asserts zero simulation requests, all native dismissal paths and outside focus,
the existing name limit, Unicode/blank names and Save/reload restoration. Visual QA
in `scripts/project-name-qa.mjs` also covers 1280 px and a short landscape viewport.
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
