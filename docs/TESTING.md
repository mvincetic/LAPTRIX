# Testing and validation

Eight explicit-loop clock cases check boundaries, retained play/pause, rate and
multi-cycle remainder, inside/outside seeking, clearing, reset, notifications and
invalid bounds. Desktop/phone browser journeys observe two actual sector wraps,
keyboard toggling, independent plot/tab changes and full workspace preservation.
Separate `scripts/sector-loop-qa.mjs` captures four viewport sizes with GT current
data, a Formula ghost and load overlays. See PLAYBACK_LOOPS.md.

Two graphics-restoration journeys run in both development and production. Each
repeats actual context loss/restoration twice and requires visible line pixels
without an intervening user action. Canvas identity, cursor, compass, corner labels,
full project exports and pending fuel survive; no extra simulation request is made.
Subsequent playback still works. See RENDERING.md.

Two rendering journeys count actual WebGL draw calls at desktop/phone widths.
They require zero draws after a settled pause and new draws after seeking,
playback, orbiting or reset, then cover a non-looping finish and final idle state.
The camera visibility helper reads composited canvas pixels with HTML overlays
hidden, since a presented WebGL drawing buffer can be discarded while paused.
A deterministic clock test covers a finish within the 30 Hz notification interval
and confirms one final stopped notification without later idle notifications.
See RENDERING.md.

Four load-extrema tests check exact independent channels, original sample identity,
first-sample ties, preserved inputs and unavailable data. Two desktop/phone browser
journeys use actual GT telemetry with Formula overlays and pending fuel edits;
independent array extrema drive every value/seek oracle. All eight actions across
both graph axes pause, restore Full lap and match the precise plotted coordinate.
The complete project, reference and current path remain intact with no extra solves.
The graph visual script now also captures the expanded native disclosure at three
widths. See LOAD_EXTREMA.md.

The original elevation study adds six independent geometry checks for exact sine
samples, horizontal radius, analytical and chord curvature, outgoing grade, missing
inter-node height and immutable production resampling. All 30 fixed study solves
pass their numerical diagnostics. An additional local report check parses all nine
sources and 30 complete results through the frontend schemas and verifies unchanged
values, setup and vehicle snapshots. The study exports its full evidence; see
ELEVATION_SENSITIVITY.md for the distinction between source accuracy and numerical
eligibility. The following extrema quality gate passes 152 TypeScript and 136 Python tests.

Loads & elevation adds eight channel-math cases and three browser journeys.
Independent interpolation of real unequal-grid Formula/GT output checks all seven
current/reference readings on both axes, with exact-clock vertical/load readouts
after playback. Group/tab/range changes preserve complete project exports and
pending setup without simulation requests. Legacy references retain five curves,
timing-only imports retain none, and a legacy current result disables the new
group through native option semantics and keyboard behavior. Scale tests cover
fractional G, weight guides, missing data and extreme finite values. The reusable
`scripts/load-graphs-qa.mjs` now captures eight states at three widths, including
expanded extrema. See LOAD_GRAPHS.md.

Corner-callout layout tests cover coincident events at viewport edges, occupied
space, preserved anchors/order, offscreen data and insufficient room. A browser
regression first reproduces the old world-offset label overlap. The new desktop/
phone journeys use an actual GT 5 m refined lap, check separate contained controls,
verify each exact event time, and retain pending fuel and the full project through
camera/layer actions with no simulation requests. See CORNER_CALLOUTS.md.

Vertical-load coverage includes fourteen Python cases for exact circular arcs,
nonuniform straight grades, three independently differentiated smooth height waves
and a straight crest requiring the separate contact bound. Existing slope,
drivetrain and wheel-work oracles reconstruct full normal load independently and
retain their original tolerances. Fifteen TypeScript tests cover explicit model
metadata, complete/positive load arrays, matching minima, legacy preservation and
missing-endpoint interpolation. Three real-browser journeys check desktop/phone
cursor values against exported samples, reject incomplete imports without replacing
the workspace, preserve mixed-generation references through Save/portable loading,
and keep legacy-current channels explicitly unavailable. The legacy fixture is
deliberately shaped from a real API lap; it is not claimed to be a historical
solver measurement. See VERTICAL_LOAD.md for definitions and SOLVER_STUDY.md for
both vehicle profiles across all production grids.

Camera framing has independent matrix-projection tests for road vertices across
source scales, aspect ratios and overview modes, plus small/tall sources and large
translations. A real-browser large-track import checks that direct WebGL readback
contains rendered racing-line pixels after resize, reset and mode changes. Camera
actions preserve complete project exports, pending setup and playback. The visual
script captures original/large source overviews and chase; see CAMERA_FRAMING.md.

Source-profile math tests use independent ramp dimensions, seam rotation, rigid
transforms and unequal source intervals. Six curvature cases add signed inverse
radius on unequal arcs, level/constant-grade inputs, closure/reversal invariance,
the analytical alternating-height example and malformed-input rejection. Desktop/phone journeys inspect original
segments with keyboard and pointer, export all derived values, verify unchanged
workspace/playback and resample the smooth catalog source without changing any
profile path. The same journeys inspect and export GPX draft elevations before
cancelling with no calculation or active-source mutation. Visual evidence comes
from `scripts/source-profile-qa.mjs`, including both plots and selected values at
four viewport sizes. The browser independently checks all 40 fixture curvature
values, the new plot's selection and the sticky Close control. See SOURCE_PROFILES.md
for exact definitions and report versioning.

GPX conversion tests check equatorial and meridional geometry, southern-hemisphere
rotation, antimeridian continuity, unchanged elevations and full-chord extent bounds
including antipodal rejection. Signed-zero fixtures verify identical fingerprints
through JSON transport and native-reference re-import on the active southern-
hemisphere source. Six browser journeys exercise native XML parsing,
invalid/missing/ambiguous data, width/name limits, inert markup-like names, review
cancellation, either failed solve, retry, request cancellation, Save and portable
restoration. `node --experimental-strip-types scripts/gpx-qa.mjs` uses the original
TypeScript fixture to capture the review at 1600/1280/390/780 px and record errors,
dialog bounds, overflow and API request counts. Node 22.17 supports this explicit
type-stripping flag; it adds no browser or production dependency.

Channel-scale tests check signed and asymmetric zero positions against explicit
row coordinates. Real-browser comparison/range journeys verify all seven domains,
units, visible limits and text-to-guide alignment on both axes and sector ranges.
`scripts/channel-scales-qa.mjs` captures current-only, shared-reference and sector
plots at 1920/1600/1280/390 px, plus an original synthetic track with a shifted
vertical origin. The exact comparison oracle reads the SVG cursor's full precision:
the native transport range rounds its DOM value to its 0.01-second step and cannot
serve as an exact-time oracle for rapidly changing channel values.

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

North-indicator tests independently rotate world north through Three.js cameras,
then exercise actual orbit drags, stable reset and authoritative chase positions
at desktop/phone widths. Visual QA runs separately with `scripts/north-indicator-qa.mjs`.

Closed-corner tests rotate the actual source start before/at/after an apex in both
vehicles and compare every canonical event and physical interval. Independent
nonuniform-segment fixtures check time/distance sums, minimum speed, sample IDs,
bounded continuous braking and uniform-curvature cases. Contract/reference checks
cover periodic ordering, interval consistency, historical estimates and unequal
native/timing grids. Browser journeys seek numerical and scene controls at the
seam, verify a known 10% timing scale and retain pending setup with zero extra
solves. Separate visual QA uses `scripts/corner-seam-qa.mjs`; see CORNER_WINDOWS.md.

Optimized-line geometry tests use accepted sources whose converged seeds exceed
the slope bound or reverse a source interval. They independently inspect those
seeds and ensure rejection precedes speed-profile evaluation. A real API/browser
journey checks failure preservation and Centerline retry; the separate
`scripts/line-geometry-qa.mjs` records desktop and phone recovery layouts.

Signed-zero tests share a known cross-language hash, protect exact nonzero values,
and exercise verified legacy source/native-grid migration through reference and
project readers. The browser imports literal negative-zero JSON, restores both
reference formats before source serialization, then verifies Save and fresh mobile
portable import. These operations retain native data and introduce no calculation
for a reference change; see SOURCE_IDENTITY.md.

Reference-ordering browser tests hold an earlier file read or actual WebCrypto hash,
complete a newer action, and then release the older operation. They await digest
settlement and rendering frames, compare full exported projects and exact cursors,
and count simulation calls. Coverage includes malformed/valid overlaps, a rejected
asynchronous file read that directly exercises stale error handling, mobile
Set reference, a current failure with retry, and a completed vehicle calculation.

Sixteen display tests cover exact/signed zero, interpolation-sized residuals,
subnormal values, both sides of the rounding boundary and percentage precision.
Desktop/mobile browser tests compare a lap to itself, preserve a nonzero
sub-millisecond reference in exported data, distinguish percent/seconds precision,
and verify meaningful gains/losses without recalculation or cursor movement.

Storage-recovery browser tests deny only the application's local-storage write,
retaining an earlier saved baseline. They check desktop/phone Download project
recovery, complete bundle equality, pending versus completed setup, unchanged
cursor and zero simulation requests. Restoring storage then verifies actual Save
and warning clearance; successful Save must preserve unrelated reference errors.

Audio-recovery browser cases reject the first native AudioContext resume and then
permit a real retry. Desktop/phone checks retain complete project exports, pending
fuel and playback, count zero simulation calls and verify one reused audio context.
A controlled delayed retry then completes after a reference import fails; the
newer reference error and its retry action must remain available.

Passing numerical tests establishes behavior of this approximation only. No
surveyed circuit, measured car specification or recorded lap has been used to
validate real-world accuracy. Full production browser/device and accessibility
audits remain future work.
