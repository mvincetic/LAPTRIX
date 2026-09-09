# MVP validation — 2026-09-09

The scoped local MVP and selected extensions are implemented on
`codex/autonomous-mvp`. The repository began empty; no user changes were overwritten
and no main merge, force-push or repository-settings change was made.

## Quality gates

- ESLint and Ruff: pass.
- TypeScript strict typecheck: pass.
- Vitest: 77 tests pass.
- Python numerical/API tests: 96 tests pass.
- Playwright: 57 development browser journeys pass; two viewer journeys also run
  against built production assets.
- Vite production build: pass; approximately 390 kB initial JavaScript / 119 kB
  gzip, plus a separate 952 kB viewer / 254 kB gzip.
- Initial runtime npm dependency audit: zero reported vulnerabilities; no package
  changes were made in the following viewer/geometry/workspace milestones.
- GitHub Actions passed through `059e153`; each following milestone reruns CI on push.

## Browser evidence

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

## Scope of the evidence

These checks establish a working development application and numerical consistency,
not real-world motorsport accuracy. Track and vehicle inputs are synthetic and the
solver is approximate. Audio is original procedural synthesis, not a realistic
recording. There are upstream Python test-client and Three.js clock deprecation
warnings; they do not prevent tests or rendering, and dependency source was not
patched to suppress them. See LIMITATIONS.md for model and deployment boundaries.
