# Decision log

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
