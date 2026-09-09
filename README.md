# LAPTRIX

A local browser workspace for racing-line development, approximate lap simulation,
procedural 3D circuits and synchronized telemetry. The interface follows the supplied
light engineering reference while using original LAPTRIX branding and data.

**This is a Development Physics Model, not a validated Formula 1 simulator.** The
Ardennes Development Circuit and Formula Development 01 are synthetic. The circuit
is not Spa-Francorchamps. No commercial game geometry, audio or team assets are used.

## Start locally

Requires Node.js **22.12 or newer** and Python **3.12**. Tested on Windows with Node
22.17 and Python 3.12.7. From the repository root:

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run dev
```

On macOS/Linux, use `.venv/bin/python -m pip install -r requirements.txt` instead.
Open **http://127.0.0.1:5173**. The development command starts the frontend and the
Python API together. The API listens on **127.0.0.1:8000**; its interactive contract
is at **http://127.0.0.1:8000/docs**. Both ports are fixed and fail explicitly if busy.

The first visit runs a real optimized lap and centerline comparison. Change setup
inputs and click **Run Simulation** to recalculate. Pending changes are labelled;
the last completed result remains visible if a solve fails.

## What works

- A validated, data-driven 720-sample circuit with width and elevation.
- Procedural terrain, circuit ribbon, racing line, braking segments and markers.
- Bounded minimum-curvature optimization and a closed-loop speed envelope.
- Optional vehicle-aware lap-time refinement with a fixed, reported candidate budget.
- Controlled 5 m / 3 m resampling with geometry checks and comparison across grids.
- Grip, fuel mass, downforce, drag, power curve, gears, braking and gradient.
- Formula and GT development profiles with inspectable parameters, sources and assumptions.
- Cross-vehicle references with saved vehicle snapshots and source-aligned corner deltas.
- Lap/sector times, corner events, reference comparison and local project saving.
- Seven synchronized telemetry traces, time/distance inspection and ghost playback.
- Orbit, top and chase cameras; configurable analysis layers.
- Original telemetry-driven engine/gearbox audio, explicitly enabled by the user.
- Custom track JSON import and full simulation JSON / SI-unit CSV export.

## Checks

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
node scripts/visual-qa.mjs
node scripts/visual-qa.mjs --refinement
node scripts/visual-qa.mjs --gt
npm run study:solver
npm run study:sampling
```

`check` runs frontend and Python lint, TypeScript, unit/API tests and the production
build. Browser tests start the app when needed. Screenshots and traces go into the
ignored `artifacts/`, `test-results/` and `playwright-report/` directories.
The solver study compares five sampling resolutions and all three solver modes.
See [SOLVER_STUDY](docs/SOLVER_STUDY.md) for results and numerical limits. Select
**Lap-time refinement** in Solver mode, then run to compare against the curvature
seed under the same vehicle/setup. The default remains minimum curvature.
Advanced settings also offers **Spatial sampling**; the imported source remains
unchanged. See [SAMPLING](docs/SAMPLING.md) for the grid and reference contract.
Changing **Car profile** runs that vehicle and retains the selected reference.
Expand **Vehicle data & assumptions** to inspect model parameters and specification
anchors. Both vehicles are synthetic; see [VEHICLE_MODEL](docs/VEHICLE_MODEL.md).

`npm run build` produces `dist/`. It does not bundle Python: deployment would need
both a static frontend and a separately hosted simulation service. This MVP is
intentionally delivered as a local application with no paid services or accounts.

The current quality record and remaining scope are in [VALIDATION](docs/VALIDATION.md)
and [LIMITATIONS](docs/LIMITATIONS.md). GitHub Actions repeats the local quality and
browser gates on pushes. Work remains on `codex/autonomous-mvp`; main is untouched.

## Repository guide

| Path | Responsibility |
| --- | --- |
| `apps/web` | React dashboard, browser API boundary and 3D presentation |
| `apps/simulation` | FastAPI contracts, racing line and point-mass solver |
| `packages/track-engine` | Track frames, distances, boundaries and indexed ribbons |
| `packages/telemetry` | Shared interpolation and playback clock |
| `packages/shared` | Frontend runtime schemas and TypeScript types |
| `packages/audio-engine` | Telemetry-driven procedural sound |
| `data` | Original synthetic tracks and configurable vehicles |
| `tests` | Numerical, geometry, API and real-browser regression checks |
| `docs` | Product, architecture, decisions and development knowledge base |

Read [AGENTS.md](AGENTS.md) before substantial changes. See
[ROADMAP](docs/ROADMAP.md), [ARCHITECTURE](docs/ARCHITECTURE.md),
[LIMITATIONS](docs/LIMITATIONS.md) and [DEVELOPMENT](docs/DEVELOPMENT.md).
