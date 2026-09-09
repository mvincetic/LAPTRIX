# MVP validation — 2026-09-09

The scoped local MVP and selected extensions are implemented on
`codex/autonomous-mvp`. The repository began empty; no user changes were overwritten
and no main merge, force-push or repository-settings change was made.

## Quality gates

- ESLint and Ruff: pass.
- TypeScript strict typecheck: pass.
- Vitest: 47 tests pass.
- Python numerical/API tests: 86 tests pass.
- Playwright: 34 development browser journeys pass; two viewer journeys also run
  against built production assets.
- Vite production build: pass; approximately 361 kB initial JavaScript / 110 kB
  gzip, plus a separate 950 kB viewer / 253 kB gzip.
- Initial runtime npm dependency audit: zero reported vulnerabilities; no package
  changes were made in the following viewer/geometry/workspace milestones.
- GitHub Actions passed through `0f7446e`; each following milestone reruns CI on push.

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

## Scope of the evidence

These checks establish a working development application and numerical consistency,
not real-world motorsport accuracy. Track and vehicle inputs are synthetic and the
solver is approximate. Audio is original procedural synthesis, not a realistic
recording. There are upstream Python test-client and Three.js clock deprecation
warnings; they do not prevent tests or rendering, and dependency source was not
patched to suppress them. See LIMITATIONS.md for model and deployment boundaries.
