# MVP validation — 2026-09-10

The scoped local MVP and selected extensions are implemented on
`codex/autonomous-mvp`. The repository began empty; no user changes were overwritten
and no main merge, force-push or repository-settings change was made.

## Quality gates

- ESLint and Ruff: pass.
- TypeScript strict typecheck: pass.
- Vitest: 152 tests pass.
- Python numerical/API tests: 136 tests pass.
- Playwright: the preceding vertical-load milestone passes all 82 development
  journeys (13.4 minutes). The corner-callout update adds two journeys and passes
  all 15 relevant browser regressions (2.5 minutes); 84 are now discovered.
  Loads & elevation adds three journeys (87 now discovered). Its relevant run
  passes 15 of 16 journeys; the remaining case hit a screenshot-only race against
  an expiring notification. After replacing that click with a hidden-state wait,
  all five graph/cursor journeys pass (1.7 minutes), completing the 18 relevant
  journeys across both runs without changing application code or timeouts.
  Both production viewer checks also pass (12.0 seconds).
  The following load-extrema update passes all five extrema/graph journeys
  (1.9 minutes), nine nearby regressions (1.7 minutes), the complete quality gate
  and both production viewer checks (11.6 seconds). The suite now discovers 89
  development journeys.
- Vite production build: pass; approximately 405 kB initial JavaScript / 123 kB
  gzip, plus a separate 958 kB viewer / 256 kB gzip.
- Initial runtime npm dependency audit: zero reported vulnerabilities; no package
  changes were made in the following viewer/geometry/workspace milestones.
- GitHub Actions passed through `7f78ce0` (run 34472973538), including vertical-load
  physics/compatibility, corner-callout placement and all 84 browser journeys. Each following
  milestone reruns CI on push. See CI.md for the evidence and scoped changes.
  The graph run `34475687433` subsequently reached its 20-minute suite budget with
  69 passed, one timed out and 17 not run. Its phone trace reached every assertion
  but included slow successful captures. `83c65ad` separates those captures into
  visual QA and splits the complete suite across two isolated runners. Functional
  assertions and individual deadlines are retained; remote validation is pending.

## Browser evidence

Load-extrema visual QA passes all 24 graph states at 1600/1280/390 px, adding the
expanded four-card disclosure to each width. Every state retains the 20-second
cursor, expected current/reference trace counts, zero overflow and no runtime
errors. The script also verifies complete project exports and zero extra solve
requests. Final 1280/390 expanded captures were opened and reviewed: four desktop
columns become two on the phone, with readable values, exact-inspection controls,
graphs and transport. The separate 1600/390 browser captures were reviewed too.
Evidence: `artifacts/load-extrema-check.log`, `load-extrema-browser.log`,
`load-extrema-regression.log`, `load-extrema-production.log`,
`load-extrema-qa-release.log`, `load-graphs-qa.json` and `load-graphs-qa-*.png`.
Two preceding standalone visual runs exceeded the 15-second image-capture limit:
one while scrolling an element into view, the other during full-page capture.
The final script verifies stable document bounds and clips the page image with a
30-second screenshot limit. Application code, functional test deadlines and action
timeouts were unchanged by these capture fixes.

The subsequent offline elevation study passes all 30 centerline cases and six new
independent geometry tests. All nine full source tracks and 30 full Laps pass the
frontend runtime schemas without changing values, setup or vehicle snapshots.
`artifacts/elevation-study.json` retains about 49 MB of complete inputs/results;
`elevation-study-final.log`, `elevation-study-tests.log`,
`elevation-study-validation.log` and `elevation-study-check.log` retain the gates.
The explanatory PNG/SVG figure was generated with Matplotlib in an isolated ignored
artifact directory and opened for layout review. Browser behavior, production assets
and solver provenance retain the preceding graph milestone's checks. No app or
production dependency changed in this offline-study milestone.

The original Loads & elevation visual QA passed 21 states: Overview, current-only loads, native
distance/time overlays, sector inspection, partial legacy references and timing-only
references at 1600/1280/390 px. Every state keeps the 20-second cursor, seven current
traces, the expected seven/five/zero reference traces, zero horizontal overflow and
no runtime errors. Complete project exports and zero additional solve requests are
checked by the script. Desktop/1280 full workspaces and phone native, sector and
legacy panels were opened and reviewed: names, scales, guides, wrapped explanations
and transport remain readable. Logs remain in `artifacts/load-graphs-qa.log`,
`load-graphs-browser-final.log` and `load-graphs-check.log`; the image/report paths
are refreshed by the subsequent 24-state run above.
The initial legacy-option assertion and expiring-notification failures remain
documented in `load-graphs-browser-focused.log` and `load-graphs-browser-regression.log`.

`scripts/visual-qa.mjs` writes current screenshots into the ignored `artifacts/`
directory. Desktop and mobile images were opened and visually reviewed. Responsive
browser tests also exercise 1280, 900 and 390 px widths with zero horizontal overflow.
The final snapshot is refreshed at 1600×1000 and 390×844. The WebGL scene, track
framing, typography, settings, corner tables, comparison, graph traces and transport
controls were inspected; no blocking runtime console errors were reported.

Browser tests cover real setup recalculation, pending-state labeling, reference
selection and restoration, play/pause/seek, corner selection, local save, view
layers/cameras, time/distance graph views, export, backend failure/retry, valid and
invalid imports, and explicit audio activation. Numerical tests include the
analytical circle, full lap seam and integration, grip/RPM/brake constraints,
line bounds, setup extremes and changing the start/finish sample.

The solver continuation adds a real lap-time refinement journey, including API
gain accounting, authoritative corner seeking, JSON diagnostics export and saved
mode/reference restoration. All seven journeys pass. Refinement screenshots were
captured at 1600, 1280, 900 and 390 px widths with no runtime console errors or
horizontal overflow. The desktop, mobile and corner-inspection images were opened
and reviewed: the solver explanation, seed gain and selected corner remain visible.
`artifacts/refinement-*.png` preserves local evidence. The five-resolution numerical
study is summarized, including its accuracy caveat, in SOLVER_STUDY.md.

The sampling continuation adds the eighth journey, exercising a 720-node reference
against a 1,121-node solve, physical corner correspondence, local restoration and
an export that preserves the original source. Combined sampling/refinement visual
QA reports no runtime errors or horizontal overflow at 1600, 1280, 900 and 390 px.
Desktop, 1280 px, mobile and corner-inspection images were opened and reviewed;
the controls, grid diagnostics and reference results remain usable. Local evidence
is saved as `artifacts/sampling-refinement-*.png`.

The vehicle continuation adds two journeys for cross-vehicle reference persistence,
snapshot export and failed-selection recovery. All ten browser journeys pass,
alongside 64 Python and 19 TypeScript checks. GT visual QA reports no runtime errors
or horizontal overflow at 1600, 1280, 900 and 390 px. Desktop, expanded mobile vehicle
details and chase images were opened and reviewed. The provenance text is readable,
references identify the original Formula run, and the original coupe ghost follows
GT telemetry. Local evidence is saved as `artifacts/gt-*.png`.

Five additional grade/energy benchmarks pass, taking the numerical suite to 69.
The full lint, typecheck, unit/API and build gate passed again. This benchmark-only
milestone changes no application behavior; it retains the ten passing browser
journeys and reviewed vehicle UI from `226b88d`. PHYSICS_BENCHMARKS.md specifies
the independent equations, exported-control reconstruction and tolerances.

Reference import adds two browser journeys and thirteen TypeScript cases. The
existing track-import test was updated to target its accessible file-input label
after the second input was added; its focused rerun passes, as do all eleven other
journeys. The final collapsible provenance UI passed both affected import journeys
again, with lint/typecheck/build also passing. Native and timing-only imports,
wrong units/source identity, reference preservation and save/reload are covered.
`--gt --reference` visual QA reports zero runtime errors and no horizontal overflow
at 1600, 1280, 900 and 390 px. Final desktop, expanded provenance and mobile images
were opened and reviewed in `artifacts/reference-gt-*.png`. The source disclosure
is readable and does not permanently consume the corner table's vertical space.

The Time Delta milestone passes the complete 69 Python / 33 TypeScript / 13 browser
suite, lint, typecheck and build. Hand-calculated unequal-grid tests verify merged
breakpoints and cursor values. The browser checks the known imported timing ratio,
corner/chart seeking, axis switching, playback and reference replacement. Visual
QA with `--gt --reference --delta` has no runtime errors or horizontal overflow
at 1600, 1280, 900 and 390 px. Desktop, mobile and selected-corner delta screenshots
were opened and reviewed in `artifacts/delta-reference-gt-*.png`.

Portable project validation adds three TypeScript cases and two browser journeys.
The full 69 Python / 36 TypeScript / 15 browser suite passes with lint, typecheck
and build. A fresh-page custom-track GT round trip retains its name, fuel setting
and Formula reference; invalid version and failed API cases preserve prior work.
`--gt --reference --delta --project` visual QA reports zero runtime errors and
horizontal overflow at the four standard widths. Desktop/mobile actions-menu
images were opened and reviewed; the restored project name and all three import
actions remain accessible. Evidence is in `artifacts/project-delta-reference-gt-*.png`.

The aero-comparison milestone passes lint, typecheck, build and the complete 69
Python / 38 TypeScript / 18 browser suite. Its browser journeys verify five real
solver calls with fixed other inputs, fastest checked selection, deliberate
application, reference retention and save/reload. Injected service failure and
failed speed checks prevent selection; stopping aborts the active request and
prevents queued calls. The default Formula study's fastest checked candidate is
aero -5 at 71.430 seconds, approximately 0.102 seconds below the starting aero 0.
`--sweep` QA reports zero runtime errors and no horizontal overflow. Opened and
reviewed `artifacts/sweep-desktop.png` and `artifacts/sweep-mobile.png` confirm
readable signed deltas, check states, selection and footer controls at 1600 and
390 px. The narrow dialog has equal client/scroll widths of 356 px.

Study export adds source-identity verification, complete Lap round trips and
failed/stopped report checks to the existing browser journeys. All 70 Python / 38
TypeScript / 18 browser tests pass. A Python test verifies source-fingerprint
invariance to CRLF/order and sensitivity to changed source. `--sweep --gt` QA
exports an approximately 3.49 MB report and has no browser errors or overflow.
Desktop/mobile screenshots `artifacts/sweep-gt-*.png` were opened and reviewed;
the export and application controls remain visible. The GT study correctly
excludes three force-demand failures and selects aero -2 at 91.398 seconds.
Inspection traces their excess drive request to the uniform power lookup crossing
gear redlines; that finding motivated the following numerical correction.

Exact per-gear power evaluation adds seven Python regressions and passes the full
77-case numerical suite, lint, typecheck and build. All five GT aero rows now pass
with force-demand ratios within floating-point roundoff of 1.0; the best checked
row is aero -5 at 91.316 seconds. The existing 1.015 acceptance tolerance was not
changed. Formula/GT source and 3 m refinement also converge and pass force checks.
Refreshed GT study screenshots were opened and reviewed at desktop/mobile; export,
selection and application remain usable without browser errors or overflow.
One browser study exceeded its 15-second assertion while competing with a second
software-rendered browser. Its multi-request completion wait is now 30 seconds;
visual QA and the browser regression suite should run separately on this machine.
The other 17 journeys passed in that run, and all three aero journeys passed on
the isolated rerun with the corrected wait. Lint and typecheck also passed again.

Fixed source gates pass 82 Python / 39 TypeScript / 19 browser tests, lint,
typecheck and build. Four solver/grid combinations retain v2 source positions;
legacy v1 leaves physics unchanged while retaining its old distance fractions.
Project tests preserve v1 semantics against a v2 catalog entry. The browser imports
a pre-metadata legacy reference, verifies zero deltas over matched physical
intervals, resamples to 3 m, validates gate metadata and reloads the saved project.
Visual QA with `--gt --reference --delta --sampling` reports no browser errors or
horizontal overflow. Desktop/mobile images in
`artifacts/delta-reference-gt-sampling-*.png` were opened and reviewed. The build
entry reached 1,301 kB / 360 kB gzip and now emits its size warning; separating the
viewer is the next performance task.

The optional WebMCP hook is feature-detected. Its registration, shared-cursor action
and invalid-input behavior were tested through a registry stub in Playwright.
**Native WebMCP integration was not verified** because no native supported registry
was available. Ordinary browser controls are independent of that optional API.

## Observed fixes

- Corrected an early forward/backward envelope error that collapsed speeds.
- Corrected road mesh winding so front faces point upward.
- Fixed mobile topbar overflow and automatic circuit framing.
- Preserved saved references instead of overwriting them with a new baseline.
- Scaled charts from data and aligned sector markers to the selected axis.
- Stabilized the file watcher against transient empty modules during Windows writes.
- Corrected short-desktop footer overlap and kept analysis markers out of chase view.
- Kept temperature keyboard entry intact, applying allowed-range bounds on field exit.
- Tightened optimizer convergence after an 87 ms start-location sensitivity;
  the checked rotated case now differs by less than 1 ms.
- Replaced the curvature iteration heuristic with a sparse active-set solve after
  a finer grid exhausted the old iteration budget. Distance-integrated
  regularization and nonuniform derivatives make the objective consistent across grids.
- Enforced braking capacity at the segment start after a zero-downforce test exposed
  a force-demand overshoot. Local refinement accepts only checked improvements.
- Removed map-orientation dependence from the local search after a rigid-transform
  benchmark exposed a 0.036-second discrepancy. Added controlled grids and
  source-based reference correspondence, tested across save/reload and JSON export.
- Kept slider-test expectations at the control's documented 0.01 s step while the
  canonical clock and displayed telemetry retain their original precision.

Deferred viewer loading passes the complete 86 Python / 39 TypeScript / 21 browser
suite, lint, typecheck and build. Both viewer journeys also pass against production
assets, including mobile Save/reload recovery. The production gate initially
exposed a rejected preview origin; the API now permits exact loopback port 5174
origins with tests rejecting other ports and hostname suffixes. Visual QA found
that mobile Save lost its accessible name when its text was hidden; an explicit
label fixes it, and the recovery journey now exercises that narrow layout.
The two affected development journeys and production gate pass again after this
label fix. Final QA reports no runtime errors or horizontal overflow at 1600 and
390 px, and successful recovery in both states. Loading/failure screenshots in
`artifacts/viewer-*.png` were opened and reviewed. The entry is now 352.57 kB /
107.31 kB gzip; the full viewer still downloads as a separate chunk. CI repeats
the built-asset failure checks in addition to development browser journeys.

Source geometry inspection passes 86 Python / 47 TypeScript / 22 development
browser tests, lint, typecheck and build, plus both production viewer journeys.
Eight analytical diagnostics cases cover contact semantics, source heights, rigid
transforms, seam handling, the maximum source grid and complete counts past the
detail cap. The new browser journey imports a synthetic crossing, checks the
independent 7.998 m source gap, resamples, exports the original data and restores
on mobile. Geometry QA reports no runtime errors or horizontal overflow at 1600
and 390 px. Desktop/mobile `artifacts/geometry-*.png` were opened and reviewed;
the selected pair, height gap, scope note and export action remain readable.
The contact label was shortened after visual review and tiny negative coordinates
now display as zero. Lint, typecheck and production checks pass after that polish.
The viewer-split commit's remote CI also passed, including the new production gate.

Transactional track activation passes the full 86 Python / 47 TypeScript / 26
development browser suite, lint, typecheck and build, plus both production viewer
journeys. A regression reproduced the old failed-import path before the fix.
Four new journeys now verify separate selected-lap/baseline failures, unchanged
project exports, same-ID retry, failed track selection with correct-target Retry,
and delayed older imports that cannot overwrite newer work or add catalog entries.
The overlapping-request test waits for both old requests before releasing them;
its pending-state assertion uses the stable track control rather than the run
button's changing label. Visual QA confirms the old lap remains available and
Save/reload retains the old source after failure. Opened desktop/mobile screenshots
in `artifacts/track-failure-*.png` show readable error and retry controls, no
horizontal overflow, and no runtime errors. The preceding geometry commit's
remote CI passed on the working branch.

Calculation cancellation passes the complete 86 Python / 47 TypeScript / 29
development browser suite, lint, typecheck and build, plus both production viewer
journeys. Three new tests verify actual browser abort events for normal runs and
both track/project import requests before releasing a held network gate. Complete
project exports remain unchanged, selected fuel stays pending, and repeating the
operation succeeds. Four pending/cancelled desktop/mobile screenshots in
`artifacts/calculation-*.png` were opened and reviewed. QA reports retained lap
data, no runtime errors and no overflow at 1600 and 390 px. Visual review found
narrow mobile notifications; content-based width with a viewport cap and fixed
icon sizing fixes the wrapping. Lint, build and production checks pass after that
CSS polish, and the refreshed cancelled-state images were reviewed again.

Actions keyboard correction passes the full 86 Python / 47 TypeScript / 32
development browser suite, lint, typecheck and build, plus both production viewer
journeys. The baseline audit showed an invisible backdrop tab stop and ineffective
Escape at both widths. Three new journeys check native keyboard entry/exit,
Escape, focus after export/file-picker return and named visible controls. Final
audit results in `artifacts/keyboard-audit.json` show the first real action focused
and Escape restoring the closed disclosure trigger at 1600 and 390 px. Focused
screenshots were opened and reviewed; an inset outline fixes overlap from adjacent
buttons. Lint/build/production checks pass after the CSS polish, and refreshed
`artifacts/keyboard-actions-*.png` images were reviewed again. The audit now waits
for the viewer canvas and a brief visual settle before its screenshots. This
bounded review does not establish whole-application accessibility compliance.

The tab milestone passes 86 Python / 47 TypeScript / 34 development browser
journeys, lint, typecheck and build, plus both production viewer journeys. Two new
journeys exercise keyboard tab selection, panel relationships/focus, layer toggles,
camera/axis pressed states and retained canvas/playback at 1600 and 390 px. Visual
QA in `artifacts/tabs-qa.json` records no runtime errors or horizontal overflow.
Focused layers, chase legend, delta and sector screenshots were opened and reviewed
at both widths. The active panel's inset outline remains visible, the chase legend
appears on focus, and numerical content remains readable on mobile.

Cursor Data passes the 86 Python / 47 TypeScript / 36 development browser gates,
lint, typecheck and build, plus both production viewer journeys. New tests compare
actual exported samples at an intermediate position, including UI units and a
gear transition. They cover precise entry, unchanged playback on invalid input,
Escape, the finish endpoint, corner/delta synchronization and reset after axis or
result changes. After the final scroll-container correction, all four cursor/tab
journeys and frontend gates pass again. Focused PageDown reaches the complete
desktop readout and model note. Refreshed `artifacts/cursor-*.png` images at 1600,
1280 and 390 px were opened and reviewed; the QA report records no runtime errors
or horizontal overflow and the same 2500.125 m cursor at every width.

Native-reference ghosts pass the full 86 Python / 51 TypeScript / 38 development
browser gates, lint, typecheck and build, plus both production viewer journeys.
Four pose/eligibility tests cover elapsed-time interpolation, finish holding,
loop restart and rigid transforms. Two new browser journeys verify actual projected
reference positions remain fixed after finishing while the current vehicle moves,
independent visibility and timing-only replacement at 1600/390 px. The final QA
report records no runtime errors or horizontal overflow at 1600/1280/390 px.
Controls, orbit/top, finish and chase screenshots were opened and reviewed. Chase
review found labels too high above the cars; lowering their anchors makes their
association clear. Ghost journeys and frontend/production gates pass after that
adjustment, and the refreshed chase/mobile/1280 images were reviewed again.

The first full ghost run exposed a cursor-entry race: ongoing playback could change
the input between focus/selection and typing, producing an appended number. Focus
now captures the draft before editing, and Escape captures the current value again.
Both cursor regressions explicitly wait for playback to advance while the focused
value remains fixed. The subsequent full 38-journey browser run passes. Original
failure and corrected-run logs remain in local `artifacts/ghost-e2e*.log`.

Bounded vehicle profiles pass the complete 96 Python / 59 TypeScript / 45
development-browser gates, lint, typecheck and build, plus both production viewer
journeys. Inline API requests preserve full inputs and cache separation without
changing the server catalog. Tests cover v1/v2/v3 project rules, strict nested
validation, collision reuse and pure local save preparation. Seven browser journeys
cover template export, native reference preservation, reruns, track baselines,
aero studies, save/reload, fresh portable restoration, either failed project solve,
cancellation, superseded imports and maximum-length metadata.

Profile actions, details, comparisons and error screenshots at 1600/1280/390 px
were opened and reviewed. Long unbroken names/descriptions initially clipped inside
panels; explicit wrapping and a regression now protect details, lap/reference labels,
ghost tools and aero context. Refreshed images were reviewed, including the complete
mobile details panel after dismissing its temporary notice. Final
`artifacts/vehicle-profiles-qa.json` records zero runtime errors, exact viewport
widths and matching content/scroll widths for the inspected panels. The initial
browser run was interrupted by a watched-source edit during refinement; the clean
source-frozen rerun passes all 45 journeys. Logs remain in local
`artifacts/vehicle-profile-*.log`.

Project naming passes the complete 96 Python / 59 TypeScript / 47 development
browser gates, lint, typecheck and build, plus both production viewer journeys.
Two new journeys compare full exported projects and the current cursor, assert no
simulation requests, exercise Escape/Cancel/Close and name limits, and restore a
saved Unicode name at desktop/phone widths. Initial tests caught outside focus
being attempted while the modal still blocked background controls. Closing the
native dialog before the callback fixes every dismissal and submission path.
Action, modal and applied-state captures are in `artifacts/project-name-*.png`;
the four modal screenshots at 1600×1000, 1280×900, 390×844 and 780×390 were opened
and reviewed. The QA report shows no runtime errors or horizontal overflow, with
the complete dialog inside every viewport. Logs are in `artifacts/project-name-*.log`.

Native channel comparison uses independent unequal-grid checks and real Formula/GT
browser readouts. The complete 96 Python / 66 TypeScript / 49 development-browser
suite passes, along with lint, typecheck, build and both production viewer journeys.
Gate logs are retained as `artifacts/telemetry-comparison-*.log`.
Visual QA captures workspace, time/distance overlays and timing-only
unavailability at 1600/1280/390 px. Initial mobile images exposed horizontally scaled
SVG tick text; ticks and sector labels now use ordinary layout text. Refreshed
desktop, compact-desktop and mobile images were opened and reviewed, with readable
axis values, dashed reference curves, stepped gears and R cursor values. The final
`artifacts/telemetry-comparison-qa.json` records zero runtime errors, exact document
widths and an unchanged 20-second cursor at each viewport. Both native grids retain
their closing samples (721 reference / 1,122 current telemetry rows).

Sector inspection passes the complete 96 Python / 69 TypeScript / 51 development-
browser suite, lint, typecheck, build and both production viewer journeys. Gate logs
are retained as `artifacts/plot-range-*.log`. Visual QA covers current/native curves
on different grids and includes
timing-only delta, selected-range axes and outside-cursor states at 1600/1280/390 px.
Desktop and compact-desktop workspace images, desktop zoomed channels/delta, and
mobile channel/outside/delta captures were opened and reviewed. The final
`artifacts/plot-range-qa.json` reports no runtime errors or horizontal overflow,
with consistent range bounds and unchanged cursor after full-lap reset.
An initial browser regression found the fixed-height desktop grid let the footer
cover playback. Content-based center sizing with constrained side columns fixes
the interaction, and refreshed workspace images show the complete transport above
the footer. Evidence remains in `artifacts/plot-range-footer-before.png` and
`artifacts/plot-range-footer-failure.log`.

Channel scale limits and zero guides pass all 96 Python / 70 TypeScript tests,
51 development browser journeys, lint, typecheck, build and both production viewer
journeys. Independent row-coordinate checks and actual browser geometry verify
signed-zero alignment on full-lap/sector views and both horizontal axes. An initial
comparison assertion used the transport input's rounded value during a rapid channel
transition; the oracle now uses the plotted cursor's full-precision time.
Current-only, native-reference and sector captures at 1920/1600/1280/390 px, including
a shifted-elevation synthetic source, are in `artifacts/channel-scales-*.png`.
Desktop workspace, signed-elevation, compact-desktop and mobile channel captures
were opened and reviewed. The final QA report records zero runtime/console errors,
exact document widths, positive footer gaps and zero-label alignment errors below
0.1 px. A full-page screenshot initially timed out at 30 seconds; a 60-second capture
timeout completed the final review. Gate logs are `artifacts/channel-scales-*.log`.

Reviewed GPX import passes lint, typecheck, build, all 77 TypeScript / 96 Python
tests, 57 development browser journeys and both production viewer journeys.
Seven geographic tests cover independent ellipsoid dimensions, orientation,
antimeridian handling, extent rejection and JSON-stable source identity. A new
regression exposed signed zero changing the binary source fingerprint after JSON
serialization; geographic output now normalizes zero before becoming track data.
The six import journeys cover malformed/unsupported sources, assumption review,
either failed solve, retry, cancellation, desktop/mobile activation, native-reference
re-import before Save, local restoration and portable projects. Reference-import
expectations explicitly retain the existing filename metadata. Final gate logs are
`artifacts/gpx-check-final.log`, `gpx-e2e-final.log` and `gpx-production-final.log`.

GPX visual QA covers empty, error, reviewed and applied states at 1600×1000,
1280×900, 390×844 and 780×390. Initial review found a native file input displaying
"No file chosen" beside a loaded draft; an explicit chooser with retained filename
fixes that inconsistency. Refreshed desktop, phone and landscape dialog captures
were opened and reviewed. `artifacts/gpx-qa.json` records bounded dialog geometry,
exact document widths, zero runtime errors, no simulation requests during review
and exactly two after Apply. The following signed-zero normalization changes no
visible geometry; final browser gates reran on that exact source revision.

Source-profile inspection passes all 82 TypeScript / 96 Python tests, lint,
typecheck, build, 59 development browser journeys and both production viewer
journeys. Five independent geometry tests cover exact ramp dimensions, closing
elevation changes, start rotation, rigid transforms, direction reversal and
unequal-length segment lookup. Desktop/phone journeys verify keyboard/pointer
inspection, every exported source segment, source fingerprints, unchanged project
data/playback, selection retention on modal closure, reset on source replacement,
and stable original profiles after a 5 m solve. GPX draft profiles inspect/export
before activation with zero calculation requests. Initial integration failures
identified a changing slider accessible name and a mistaken test field name;
the control now has a stable name and the oracle uses `alignment.trackFingerprint`.

Visual review first found cramped inline plots in the 1280 px sidebar. The settings
launcher now opens a bounded native dialog while GPX keeps an optional embedded
view. Refreshed desktop, phone, short-landscape and GPX captures were opened and
reviewed. `artifacts/source-profile-qa.json` reports zero runtime errors, exact
document widths, bounded modal geometry and an unchanged 10-second cursor at
1600×1000, 1280×900, 390×844 and 780×390. The narrow original is retained as
`artifacts/source-profile-sidebar-before.png`. Final gate logs are
`source-profile-check-final.log`, `source-profile-e2e-final.log` and
`source-profile-production-final.log` in `artifacts/`.

Source-scaled camera framing passes lint, typecheck, build, all 87 TypeScript /
96 Python tests, 60 development browser journeys and both production viewer
journeys. The development suite completed before the overnight interruption; the
remaining production checks passed after restarting the local services on September
10. The initial workspace bundle remains 398.17 kB / 120.86 kB gzip; the camera helper
is part of the separate 952.42 kB / 254.34 kB gzip viewer.

An independently validated 28,022.824 m synthetic fixture reproduced a blank phone
view: all source points lay beyond the old far plane at aspect 0.85, and actual
390 px WebGL readback contained zero blue line pixels with no GL error. Source-
scaled clipping and reachable zoom bounds fix it. Five matrix-projection tests
check source/road edges across scales, proportions, small/tall sources, translation
and maximum zoom. The browser regression verifies rendered pixels through resize,
overview/chase changes and reset, while preserving the complete exported project,
pending setup and current cursor.

Original/large source orbit, top and chase captures at 1600/1280/390 px were opened
and reviewed, including the previously blank phone view. The final
`artifacts/camera-framing-qa.json` records zero runtime/GL errors, exact document
widths and an unchanged 20-second cursor. The large phone overview contains 2,281
blue pixels in orbit and 2,752 in top view. These are coarse visibility checks,
not exact raster snapshots. Before images remain in `artifacts/camera-before-*.png`;
final evidence and gate logs use `artifacts/camera-framing-*`.

The camera-derived north indicator passes all lint/typecheck/build gates, 92
TypeScript and 96 Python tests, all 62 development browser journeys (11.2 minutes)
and both production viewer journeys. The initial bundle stays at 398.17 kB /
120.86 kB gzip; the viewer is 953.50 kB / 254.82 kB gzip.

Independent quaternion/vector checks cover orbit, pitch, roll, sign equivalence
and undefined north projection. Real desktop/phone drags initially reproduced
reset errors of 71.44° and 29.68° from residual damping. Draining that motion before
the fit makes both regression journeys pass, including two independently computed
chase headings, complete project equality, pending fuel and zero simulation calls.
Visual QA at 1600/1280/390 px records zero runtime errors and exact document widths.
Desktop rotated, phone reset/chase and 1280 px chase screenshots were opened and
reviewed. The arrow is legible and follows the changed view; playback remains at
20 seconds until explicitly seeking 40. Evidence is `artifacts/north-*.png` and
`north-indicator-qa.json`; gate logs use `north-indicator-*`. The initial failing
reset evidence remains in `north-reset-before.log` and `north-reset-before-390.png`.

Slope-force verification adds six original circular-ramp cases and a seventh
adversarial low-speed case. The former independently solve steady uphill/downhill
force bounds, project horizontal lateral acceleration and reconstruct integrated
wheel demand at every node. Four graded cases fail before correction, while the
flat cases pass. At slope sine 0.29, the prior lateral error is 9.1822% and the
zero-downforce ramp reports demand ratio 1.148551 despite convergence. The corrected
case reports approximately 1.0 and meets its independent speed/force tolerances.

The additional accepted star fixture exposed a reversed braking bracket when its
0.776 m/s lateral cap lay below the propagation floor. The final bracket preserves
that cap and finite telemetry while retaining the fixture's failed force diagnostic.
All 103 Python and 92 TypeScript tests pass, along with lint, typecheck and build.
The live API's source fingerprint matches the final implementation recorded in
SOLVER_STUDY.md; it returns the corrected default Formula lap of 71.513686 s.

The source/5 m/3 m study was repeated through the production solver after the
bracket correction. All nine cases converge with demand ratios at approximately
1.0 and retain source identity; current numbers and model limits are documented
in SOLVER_STUDY.md and PHYSICS_BENCHMARKS.md. GT/refinement visual QA at desktop,
1280, 900 and phone widths records zero runtime errors and no horizontal overflow.
Desktop and full phone screenshots were opened and reviewed; the 1:31.322 result,
Formula reference, updated lateral trace and playback controls remain readable.
Local evidence includes `slope-live-api.json`, `slope-check-final.log`,
`slope-sampling-study-final.log`, `slope-visual.log` and `gt-refinement-*.png` in
`artifacts/`. No external track or vehicle data was introduced.
The final source, including the low-speed bracket regression, also passes all
62 development browser journeys (11.8 minutes) and both production viewer journeys.
Those final gate logs are `slope-e2e-final.log` and `slope-production-final.log`.

Initial optimized-line geometry checks pass all 111 Python and 92 TypeScript tests,
lint, typecheck and build, all 63 development browser journeys (11.3 minutes), and
both production viewer journeys. The actual API regression rejects an unsupported
optimized slope before envelope evaluation and permits its valid centerline source.
The browser checks complete project equality after import/run failures, pending
fuel and cursor preservation, and successful retry with the same source ID.

Visual QA at 1600/1280/390 px records exact document widths, no page exceptions,
and only the two deliberately induced HTTP 422 console errors at each width.
Desktop centerline recovery and desktop/phone error screenshots were opened and
reviewed. Phone error text now occupies a full row above its recovery actions.
Evidence is `artifacts/line-geometry-qa.json`, `line-geometry-*.png`,
`line-geometry-check-final2.log`, `line-geometry-e2e-final.log` and
`line-geometry-production-final.log`. See LINE_GEOMETRY.md for adversarial fixture
measurements and the discrete guard's limits. The previous slope-force milestone
also passed remote CI run 34444918563 on the working branch.

Signed-zero source identity passes all 101 TypeScript and 116 Python tests, lint,
typecheck and build. Seven new TypeScript cases and all five new Python cases
failed before correction; all fourteen now pass. The live API reproduction now
has the same source hash before serialization, after serialization and in its lap,
and restores the reference. Positive-zero identities remain unchanged; exact
subnormal coordinate changes still have different hashes. See SOURCE_IDENTITY.md.

The 64-journey browser run completed with 63 passes (12.2 minutes). One GPX journey
could not start because Chromium failed to download `App.tsx` with
`net::ERR_NO_BUFFER_SPACE`, leaving a blank page before any application action.
Its trace is preserved in `artifacts/signed-zero-gpx-transport-failure`. The affected
journey passed unchanged in a fresh worker (9.3 seconds); timeouts and assertions
were not relaxed. Both production viewer journeys passed (11.6 seconds). Logs are
`signed-zero-e2e-final.log`, `signed-zero-gpx-rerun.log` and
`signed-zero-production.log`. The initial full-run transport failure remains part
of this record, rather than being represented as a clean single invocation.

Separate signed-zero visual QA imports its native lap, Saves/restores, and captures
1600/1280/390 px states. No page/console errors or horizontal overflow were recorded;
all views retain the 20-second cursor, the 1:11.514 lap and imported native reference.
Reference import makes no simulation request. Desktop and full phone screenshots
were opened and reviewed. Evidence is `artifacts/signed-zero-qa.json`,
`signed-zero-restored-*.png`, `signed-zero-visual.log` and `signed-zero-check.log`.
The live solver fingerprint matches the checked source. The preceding geometry
milestone passed remote CI run 34446690815 on the working branch.

Reference-file ordering passes lint, typecheck, build, all 101 TypeScript and 116
Python tests. Controlled reads first reproduced two failures: an older valid file
replaced the latest reference, and older malformed JSON published an obsolete error.
Both pass after separate reference and calculation generation checks.

The full 70-journey development suite passes in one clean invocation (12.9 minutes).
Final review then added one asynchronous read-rejection case to exercise the catch
guard directly. The final seven-case ordering file passes (59.4 seconds) with the
application code unchanged, bringing discovered browser coverage to 71 journeys.
The cases cover delayed reads/hashes, mobile Set reference, current failure/retry
and a completed vehicle calculation. They compare complete project exports, retain
pending setup/cursors and verify zero simulation calls for reference-only actions.

Desktop latest-reference and phone Set reference screenshots were opened and
reviewed after delayed work completed. The selected references, pending 80 kg fuel,
20-second cursor and appropriate notices remain visible, with no phone overflow.
Evidence is `artifacts/reference-ordering-before.log`, `reference-ordering-results`,
`reference-ordering-check.log`, `reference-ordering-e2e-final.log`,
`reference-ordering-seven-final.log` and `reference-ordering-*.png`.
The preceding signed-zero milestone passed remote CI run 34448405332.
Both production viewer journeys pass (14.0 seconds), recorded in
`artifacts/reference-ordering-production.log`. Final test-helper edits also pass
lint and typecheck; the application source stayed fixed through these gates.

Comparison display precision passes lint, typecheck, build, all 117 TypeScript and
116 Python tests. Six original formatting assertions fail before correction; the
final 16-case suite covers signed/exact zero, tiny residuals, subnormal values,
millisecond and percentage rounding boundaries, and missing comparison values.

Eleven relevant browser journeys pass (2.0 minutes): new desktop/mobile display
checks, time-delta synchronization, reference import, aero workflows, resampling
and cross-vehicle comparisons. The new cases retain exact exported reference data
for a positive 0.4 ms difference, show a 2 ms loss independently of its rounded-zero
percentage, and preserve meaningful faster/slower directions without recalculation
or cursor movement. They do not round simulation or comparison data.

Visual review removed a potentially ambiguous dash from zero lap badges. The final
desktop/mobile recheck passes (30.7 seconds), additionally verifying neutral trace
strokes, absence of directional zero-badge icons and document widths. Final neutral
desktop/phone screenshots and the meaningful phone gain state were opened and
reviewed. Notification overlays are dismissed for clear inspection. Both production
viewer journeys pass (11.8 seconds); final UI edits also pass lint and typecheck.
This presentation change used targeted browser coverage rather than another full
suite invocation. Evidence: `artifacts/delta-display-check.log`,
`delta-display-browser.log`, `delta-display-final-ui.log`,
`delta-display-production.log` and `delta-display-*.png`.

Device-storage recovery passes lint, typecheck, build, all 117 TypeScript and 116
Python tests. Two controlled failures first reproduced inherited simulation/import
retry actions after a rejected local Save. Three final browser cases now cover
desktop/phone Download project, a later successful Save, and successful Save while
an unrelated reference error is active.

The 21 relevant browser journeys pass in one invocation (4.3 minutes), including
portable projects, project names, embedded vehicle profiles and reference ordering.
Recovery downloads equal the full menu export, including pending fuel distinct
from the completed lap. The previous device save, reference, playback cursor and
completed results remain unchanged, with zero simulation requests. A download
retains the storage warning; a successful Save clears only that warning.

Desktop and full phone error screenshots were opened and reviewed. The full error
and explicit Download project action are readable, with no horizontal overflow.
Both production viewer journeys pass (11.3 seconds). This change used targeted
browser coverage; the suite now discovers 76 journeys. Evidence is
`artifacts/storage-recovery-before.log`, `storage-recovery-results`,
`storage-recovery-check-final.log`, `storage-recovery-browser.log`,
`storage-recovery-production.log` and `storage-recovery-error-*.png`.
The preceding reference-ordering milestone passed remote CI run 34450301662.

Typed workspace errors and audio recovery pass lint, typecheck, build, all 117
TypeScript and 116 Python tests. Two controlled native AudioContext resume failures
first reproduced inherited simulation/download actions. The final three new browser
cases verify explicit audio retry, reuse of one native context, complete project
equality, pending fuel, unchanged playback and zero simulation requests. A delayed
successful retry retains a newer reference error and its import action. All nine
focused audio/import/storage journeys pass (1.1 minutes).

Desktop and full phone audio-error screenshots were opened and reviewed. The
message and Enable audio again action remain readable without horizontal overflow.
The first full browser invocation was interrupted after 38 passing journeys, with
no assertion failure in its log. The process handle, local servers and browser
runner were subsequently confirmed absent before restarting; its incomplete log
is retained as `artifacts/audio-recovery-e2e-interrupted.log`.
The fresh full invocation passes all 79 development browser journeys (13.3 minutes),
recorded in `artifacts/audio-recovery-e2e-final.log`. Both production viewer journeys
also pass (17.5 seconds), recorded in `artifacts/audio-recovery-production.log`.
The application source stayed fixed throughout these final gates.

Evidence also includes `artifacts/audio-recovery-before.log`,
`audio-recovery-before-results`, `audio-recovery-focused.log`,
`audio-recovery-check.log` and `audio-recovery-error-*.png`. The preceding comparison
display and storage milestones passed remote CI runs 34451075247 and 34452191325.

## Vertical-load continuation

The quasi-steady crest/compression milestone passes lint, typecheck, production
build, all 132 TypeScript tests and all 130 Python numerical/API tests. Fourteen new
analytical cases check signed curvature, straight grades, continuous height-wave
oracles on three grids and a straight crest requiring its own contact-speed bound.
Existing slope, drivetrain and wheel-work tests retain their tolerances after
independently reconstructing total normal load and its rolling loss. Initial old-
equation failures remain recorded rather than being described as a passing baseline.

Both vehicle studies cover source/5 m/3 m grids and all three solver modes: 18 runs
converge, retain positive contact load and pass force checks. SOLVER_STUDY.md gives
the actual lap times, grid differences and concurrent-runtime caveat. The restarted
API's solver fingerprint matches both reports, and its default Formula lap is
72.02375644930231 s with minimum contact load 1.0972615305452413 times weight.

Five focused cursor/compatibility browser journeys pass in 54.0 seconds. New
desktop/phone checks use actual exported samples as independent interpolation
oracles, preserve the complete workspace after an incomplete-load import, and
restore new current data with an unchanged legacy-shaped reference through Save
and portable loading. A separate routed legacy-current fixture keeps Vertical
dynamics / Not modelled and omits the new load row. Fixtures are explicitly shaped
test data, not measurements produced by an old solver.

Desktop and full phone cursor screenshots were opened and reviewed: Vertical G,
Normal tyre load, units and the physical interpretation note are readable, without
horizontal overflow. The desktop numerical panel remains internally scrollable.
The first full browser invocation was interrupted after five passing journeys.
Its handle, browser runner and both local servers were confirmed absent before
restart; `artifacts/vertical-load-e2e-interrupted.log` preserves that incomplete run.
The fresh full gate passes all 82 journeys in 13.4 minutes, recorded in
`artifacts/vertical-load-e2e-final.log`. Both production viewer journeys pass in
10.9 seconds, recorded in `artifacts/vertical-load-production.log`. Application
source stayed fixed throughout both final gates.

The final cursor QA additionally checks 1600/1280/390 px, including keyboard
scrolling to the interpretation note, with exact document widths and no runtime
errors. The 1280 px panel, its scrolled state and phone panel were opened and
reviewed. GT + 5 m sampling + lap-time refinement was visually exercised at
1600/1280/900/390 px; the desktop, full phone and selected-corner images were opened.
The displayed 91.445 s result and 0.072 s seed gain agree with the numerical study.
That review identified overlapping selected-corner event callouts in the scene;
the labelled numerical controls remained usable. The following callout milestone
addresses the observed issue.

A real-browser export check compares every numeric field of all 721 CSV rows with
the JSON samples: all 19 channels agree exactly, including vertical acceleration
and normal load, with zero extra simulation requests. Additional evidence is
`artifacts/vertical-load-cursor-qa.log`, `vertical-load-gt-visual.log`,
`vertical-load-export-qa.log`, `cursor-panel-*.png`, `cursor-scrolled-*.png` and
`gt-sampling-refinement-*.png`.

Evidence: `artifacts/vertical-load-check-final.log`,
`vertical-load-browser-focused.log`, `vertical-load-existing-oracles.log`,
`vertical-load-oracles-final.log`, `vertical-load-formula-sampling.json`,
`vertical-load-gt-sampling.json` and `vertical-load-cursor-*.png`.
The preceding workspace-error milestone passed remote CI run 34461731682.

## Corner-callout continuation

The original GT 5 m refined-lap overlap is reproduced by a desktop browser
regression in `artifacts/corner-callouts-before.log`, with its screenshot/trace in
`artifacts/corner-callouts-before-results`. The corrected layout passes all eight
new geometry cases and the complete 140-test TypeScript / 130-test Python suites,
lint, strict typecheck and build in `artifacts/corner-callouts-check-release.log`.

Both new browser journeys pass first in 25.3 seconds. Expanded final checks verify
that leader anchors move after top/orbit camera changes, labels remain contained
and separate, reset works, chase suppresses the group, and returning/re-enabling
sector labels preserves a usable layout. Every event button seeks its exact
exported sample time. The complete exported project and pending 21 kg fuel remain
unchanged with zero new simulation requests. All 15 relevant browser journeys pass
in 2.5 minutes, including camera framing, north/reset, dashboard, cursor, keyboard
tabs and viewer loading. This interface change uses targeted browser coverage.
Evidence is `artifacts/corner-callouts-browser-final.log`.

The new desktop/full-phone selected-corner screenshots were opened and reviewed.
The labels are separate, and leader lines connect them to distinct points on the
track. On the phone, limited space can place the group farther from its anchors;
the numerical controls remain in the analysis panel. CORNER_CALLOUTS.md documents
the placement heuristic and crowded/offscreen limits.

The wider QA initially found event groups covering other scene labels in some
phone views, despite mutual separation. The refined layout searches free vertical
gaps at up to 64 horizontal positions; an additional geometry regression requires
displacement on both axes. Final QA inspects all six GT corners in orbit/top views
at 1600/1280/390 px: all 36 states retain contained, separate event buttons with zero
overlap against the inspected labels/controls, zero horizontal overflow and no
runtime errors. Final phone orbit/top and 1280 px top-view screenshots were opened
and reviewed. The earlier evidence is retained in `corner-callouts-qa-before.json`
and `corner-callouts-obstacle-before.png`; final records are
`artifacts/corner-callouts-qa.json`, `corner-callouts-qa-final.log` and
`corner-callouts-scene-*.png`.

The final desktop/phone interaction journeys pass again in 30.6 seconds and both
production viewer journeys in 10.4 seconds. Evidence is
`artifacts/corner-callouts-browser-release.log` and
`corner-callouts-production-release.log`. No physics, source data or project-format
change is part of this interface milestone. Vertical-load commit `15e1255` also
passed remote CI run 34470528022.

## Scope of the evidence

These checks establish a working development application and numerical consistency,
not real-world motorsport accuracy. Track and vehicle inputs are synthetic and the
solver is approximate. Audio is original procedural synthesis, not a realistic
recording. There are upstream Python test-client and Three.js clock deprecation
warnings; they do not prevent tests or rendering, and dependency source was not
patched to suppress them. See LIMITATIONS.md for model and deployment boundaries.
