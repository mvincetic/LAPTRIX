# Decision log

## 2026-09-09 — Documented GT profile and persistent vehicle references

**Decision:** Add a synthetic GT profile with selected published numerical anchors
and explicit estimates, retain vehicle snapshots in results, and preserve the
selected reference across profile changes. Both profiles use the same solver.
**Alternatives:** Presenting an uncalibrated model as a real vehicle, or replacing
the reference automatically when changing cars.
**Reasoning:** A second drivetrain/grip regime expands model checks and makes the
vehicle selector useful. Visible provenance separates sourced facts from estimates.
**Consequences:** Drivetrain validation now requires descending gears, an idle-to-
redline curve and consistent peak power. Legacy snapshots remain optional. GT
rendering is original schematic geometry; fixed aero and point-mass limits remain.

## 2026-09-09 — Local React/Vite + Python vertical slice

**Context:** Empty repository; the requested deliverable includes a locally runnable
Python backend, interactive 3D and a compact engineering dashboard.
**Decision:** React/TypeScript/Vite, React Three Fiber/Three.js and FastAPI/NumPy/SciPy.
**Alternatives:** A hosted worker application or a browser-only solver.
**Reasoning:** The selected stack matches the product's numerical needs and the
preferred stack in the brief. A hosted starter adds infrastructure without hosting
the requested Python solver. The explicit local development requirements govern
the workflow; no Sites deployment or hosting manifest is created.
**Consequence:** Production deployment requires a separate API service. One root
lockfile and one Python requirements file keep local installation reproducible.

## 2026-09-09 — Original synthetic circuit

**Context:** No appropriately sourced, verified Spa elevation survey was supplied.
**Decision:** Author an original Ardennes-inspired development loop, generated from
periodic control points and synthetic elevation, then check in its final samples.
**Alternatives:** Reuse uncertain real-world map/game assets.
**Reasoning:** Original geometry is reproducible and honest about accuracy.
**Consequence:** The UI labels it synthetic and never calls it Spa. Track length is
derived, not copied from a real-world circuit specification.

## 2026-09-09 — Bounded curvature solver before external dynamics integration

**Context:** A genuine racing line is required, but a full optimal-control solver
would bring substantial native dependencies and model calibration work.
**Decision:** An independently implemented small-offset curvature objective solved
with SciPy L-BFGS-B, followed by a point-mass forward/backward speed envelope.
**Alternatives:** TUMFTM's LGPL-3.0 pipeline; MIT Fastest-lap's C++/Ipopt stack.
**Reasoning:** A small tested baseline is inspectable and replaceable. No external
optimizer code, datasets or assets are copied. Evaluation is in DATA_SOURCES.md.
**Consequence:** This is not a global minimum-time solution or validated tyre model.
The method and convergence state are part of the returned result.

## 2026-09-09 — Sparse curvature solve and bounded lap-time refinement

**Context:** A resolution study found the 1,440-point L-BFGS-B solve exhausted its
5,000-iteration budget; the old per-sample regularizer also changed strength with
resolution. Curvature alone does not optimize lap time for a chosen vehicle.
**Decision:** Express the existing small-offset objective as a sparse quadratic,
use nonuniform spatial derivatives and distance-integrated regularization, and
solve with an original feasible active-set method. Add an opt-in 78-candidate
local search scored through the existing vehicle/setup envelope.
**Alternatives:** Further increasing L-BFGS iterations, introducing a QP dependency,
or replacing the whole model with an external optimal-control stack.
**Reasoning:** The seed problem is already quadratic; sparse linear solves use the
installed SciPy and make its residual directly checkable. A bounded search provides
measurable vehicle-aware improvement while preserving the canonical telemetry API.
The [SciPy sparse-solve contract](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.spsolve.html)
was checked; no external optimizer implementation was copied.
**Consequences:** Numerical lap times change slightly. The default remains curvature
mode. Candidate gains are model results, not accuracy claims, and fine-grid
differences remain larger than some gains. Start-node braking checks now prevent
an overestimate exposed by a zero-downforce vehicle test. See SOLVER_STUDY.md.

## 2026-09-09 — Controlled grids and source-based comparison

**Context:** Numerical grid sensitivity remained larger than some search gains,
and corner comparison assumed equal source sample indices. A rigid-transform
benchmark also exposed a 0.036-second search dependence on map orientation.
**Decision:** Add explicit source/5 m/3 m sampling, cap at 2,000 points, preserve the
source and return the effective grid. Reject excessive cubic displacement, retain
narrow width features conservatively, and compare reference corner windows through
source progress protected by a cross-language geometry fingerprint. Anchor search
windows at the point farthest from the arc-weighted horizontal centroid.
**Alternatives:** Silent default densification, comparing array indices after
resampling, or treating added samples as added survey accuracy.
**Reasoning:** Grid choice and its limitations should be inspectable. Physical
correspondence must survive resolution changes, and coordinate orientation must
not change the modeled performance of the same track.
**Consequences:** The default remains source sampling. Older references need a
position check before alignment migration. The search anchor changes refinement
gains; the rigid-transform benchmark now passes. Sector-fraction semantics remain
v1. See SAMPLING.md and the current sampling table in SOLVER_STUDY.md.

## 2026-09-09 — Shared telemetry and one playback clock

**Decision:** Metres/seconds are canonical; samples include a closing endpoint.
Playback interpolates continuous fields and steps gears/corner IDs. All displays
use the same clock. **Alternatives:** Independent car animations or chart clocks.
**Reasoning:** Seeking and playback rate must preserve cross-system alignment.
**Consequence:** A browser frame delay pauses progress rather than skipping through
a large chunk of lap. Synthesis may have normal short audio parameter smoothing.

## 2026-09-09 — Original dashboard and direct SVG telemetry

**Decision:** Compact light panels, blue controls, red braking and green improvement;
charts use memoized SVG paths and a shared cursor. **Alternatives:** Large chart or
component-system dependencies. **Reasoning:** Seven fixed channels and standard
semantic controls are small enough to implement directly. **Consequence:** Native
inputs provide keyboard support; complex future chart interactions may justify a
library. Fonts are bundled locally; no runtime Google Fonts request is required.

## 2026-09-09 — Milestone sequencing

**Decision:** Combine foundation, track, solver and first dashboard into a tested
vertical slice, then commit sound/interaction refinement and stabilization.
**Reasoning:** The first meaningful visual preview should consume actual telemetry;
isolated placeholder milestones would not prove the requested user journey.
**Consequence:** Commit boundaries group related original roadmap milestones.
