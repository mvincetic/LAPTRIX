# MVP validation — 2026-09-09

The scoped local MVP and selected extensions are implemented on
`codex/autonomous-mvp`. The repository began empty; no user changes were overwritten
and no main merge, force-push or repository-settings change was made.

## Quality gates

- ESLint and Ruff: pass.
- TypeScript strict typecheck: pass.
- Vitest: 17 tests pass.
- Python numerical/API tests: 54 tests pass.
- Playwright: eight browser journeys pass against running local services.
- Vite production build: pass; approximately 1.27 MB JavaScript / 351 kB gzip.
- Runtime npm dependency audit: zero reported vulnerabilities at this check.
- GitHub Actions passed through `cf91692`; each following milestone reruns CI on push.

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

## Scope of the evidence

These checks establish a working development application and numerical consistency,
not real-world motorsport accuracy. Track and vehicle inputs are synthetic and the
solver is approximate. Audio is original procedural synthesis, not a realistic
recording. There are upstream Python test-client and Three.js clock deprecation
warnings; they do not prevent tests or rendering, and dependency source was not
patched to suppress them. See LIMITATIONS.md for model and deployment boundaries.
