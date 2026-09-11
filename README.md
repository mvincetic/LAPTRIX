# LAPTRIX

A local browser workspace for racing-line development, approximate lap simulation,
procedural 3D circuits and synchronized telemetry. The interface follows the supplied
light engineering reference while using original LAPTRIX branding and data.

**This is a Development Physics Model, not a validated Formula 1 simulator.** The
LAPTRIX Dev Track and Formula Development 01 are synthetic. The circuit
is not Spa-Francorchamps. No commercial game geometry, audio or team assets are used.
**Red Bull Ring, Austria** is also available as an approximate GP reconstruction
from OpenStreetMap and Land Steiermark terrain data. Its source snapshots, licenses,
reproduction steps and limitations are in [the source record](data/sources/red-bull-ring/README.md).

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
- Preserved LAPTRIX Dev Track plus a separately selectable Red Bull Ring showcase.
- Track selection groups development, real and imported circuits with visible source status.
- Visible source attribution and portable licenses for the real-circuit reconstruction.
- Procedural terrain, circuit ribbon, racing line, braking segments and markers.
- Conservative synthetic terrain clearance for sparse, sloped and wide source roads.
- Original asphalt grain, edge paint, schematic curbs and grassy shoulder connections for clearer scale and motion.
- A paused workspace that stops drawing and scheduling animation frames once settled.
- Automatic redraw after the browser restores a lost graphics context.
- Bounded minimum-curvature optimization and a closed-loop speed envelope.
- Optional vehicle-aware lap-time refinement with a fixed, reported candidate budget.
- Controlled 5 m / 3 m resampling with geometry checks and comparison across grids.
- Grip, fuel mass, downforce, drag, power curve, gears, braking and gradient.
- Consistent slope-normal grip, projected lateral speed and downhill braking checks.
- Quasi-steady crest/compression tyre loads, a contact-speed bound and numerical cursor readouts.
- Recoverable rejection of unsupported optimized slopes and reversed source intervals.
- Formula and GT development profiles with inspectable parameters, sources and assumptions.
- Original metre-scale Formula contours and separate GT bodywork, with rounded tyres and synchronized wheel motion.
- Cross-vehicle references with saved vehicle snapshots and source-aligned corner deltas.
- Lap/sector times, corner events, reference comparison and local project saving.
- Readable selected-corner callouts with leader lines to authoritative event positions.
- Closed corner event windows and reference timing across start/finish.
- Synchronized Overview and Loads & elevation graph groups, time/distance inspection and ghost playback.
- A source-aligned Time Delta plot for native and imported timing references.
- Full-lap comparison JSON with input snapshots, plus flat CSV with matched timing/channels and units.
- Orbit, top, chase and vehicle-mounted onboard cameras; configurable analysis layers.
- A lower distance-follow camera and original metre-scale Formula/GT bodywork with telemetry-driven wheels.
- Original grounded guardrails, source-distance supports and reflectors, with a validated asset manifest.
- Current speed, gear, elapsed time and playback state beside the track, including fullscreen.
- Play, pause, loop and scrub directly inside the viewer; graph and fullscreen controls share one clock.
- First Play follows the current car; explicit camera choices persist, with vehicle identity, follow, restart and rate inside the viewer.
- Source-scaled camera framing and clipping, including large imports at phone widths.
- Camera-derived north direction and stable reset after orbiting.
- Original telemetry-driven engine/gearbox audio, explicitly enabled by the user.
- Custom track JSON import and full simulation JSON / SI-unit CSV export.
- Import simulation or aligned external timing references with explicit source/units checks.
- Review CSV timing columns in cancellable background work, convert explicit units and retain source/provenance declarations.
- Portable project import/export with name, setup, custom source and reference restoration.
- Bounded aero comparison with numerical eligibility, progress and deliberate result application.
- Complete study JSON exports with source inputs, candidate telemetry and solver provenance.
- Fixed source-sector gates, with legacy track files and reference comparisons preserved.
- Source geometry contact inspection with height gaps, a diagram and local report export.
- Original-source elevation, grade and sampled curvature plots with segment inspection and export, also in GPX review.
- Cancel pending calculations/imports while retaining the completed workspace and setup edits.
- Keyboard navigation for actions, viewer tools and telemetry tabs with visible focus.
- Exact time/distance cursor entry with numerical telemetry and explicit model limits.
- Optional native-reference ghost with independent vehicle styling and shared-time playback.
- Ghost names avoid timing badges and controls, with leaders attached to actual car positions.
- Bounded vehicle JSON import/export, preserved profile provenance and portable restoration.
- Project naming at every screen width, with draft cancellation and explicit local saving.
- Optional native-reference channel overlays with shared units and source-position alignment.
- Sector-focused graph inspection with shared seeking, clear range bounds and full-lap reset.
- Explicit sector playback loops with keyboard toggling and a persistent active-loop indicator.
- Native fullscreen controls with rejection recovery and reachable camera/exit actions on short screens.
- A keyboard-accessible track key that collapses in compact scenes and retains explicit display choices.

## Checks

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:production
node scripts/visual-qa.mjs
node scripts/visual-qa.mjs --refinement
node scripts/visual-qa.mjs --gt
node scripts/visual-qa.mjs --gt --reference
node scripts/visual-qa.mjs --gt --reference --delta
node scripts/visual-qa.mjs --gt --reference --delta --project
node scripts/visual-qa.mjs --sweep
node scripts/viewer-load-qa.mjs
node scripts/geometry-qa.mjs
node scripts/track-failure-qa.mjs
node scripts/cancellation-qa.mjs
node scripts/keyboard-audit.mjs
node scripts/tabs-qa.mjs
node scripts/cursor-qa.mjs
node scripts/reference-ghost-qa.mjs
node scripts/ghost-labels-qa.mjs
node scripts/comparison-export-qa.mjs
node scripts/vehicle-profiles-qa.mjs
node scripts/project-name-qa.mjs
node scripts/telemetry-comparison-qa.mjs
node scripts/load-graphs-qa.mjs
node scripts/plot-range-qa.mjs
npm run study:solver
npm run study:sampling
npm run study:sampling -- --vehicle gt-development --output artifacts/gt-sampling-study.json
node scripts/python.mjs scripts/elevation_study.py
```

`check` runs frontend and Python lint, TypeScript, unit/API tests and the production
build. Browser tests start the app when needed. Screenshots and traces go into the
ignored `artifacts/`, `test-results/` and `playwright-report/` directories.
`test:production` rebuilds the frontend and checks delayed/failed viewer downloads
against its hashed assets on local preview port 5174. Simulation and telemetry
remain usable before 3D loads; Save then reload recovers a failed module download.
The same production gate also checks repeated graphics-context restoration while
paused, preserving the existing scene and workspace.
It also exercises the separately built CSV worker with a near-5-MB import,
pending-conversion cancellation and worker module failure/retry.
The solver study compares five sampling resolutions and all three solver modes.
See [SOLVER_STUDY](docs/SOLVER_STUDY.md) for results and numerical limits. Select
**Lap-time refinement** in Solver mode, then run to compare against the curvature
seed under the same vehicle/setup. The default remains minimum curvature.
Advanced settings also offers **Spatial sampling**; the imported source remains
unchanged. See [SAMPLING](docs/SAMPLING.md) for the grid and reference contract.
The original analytic [elevation-sensitivity study](docs/ELEVATION_SENSITIVITY.md)
quantifies how missing source detail can change tyre loads and lap time even when
all numerical checks pass. Its report retains full inputs and all 30 solved laps.
Changing **Car profile** runs that vehicle and retains the selected reference.
Expand **Vehicle data & assumptions** to inspect model parameters and specification
anchors. Both bundled vehicles are synthetic; see [VEHICLE_MODEL](docs/VEHICLE_MODEL.md).
Use **Export vehicle JSON** as an editable template and **Import vehicle JSON** to
calculate user-supplied inputs. Parameters and declared sources remain unverified,
visible and saved with the project. See [VEHICLE_PROFILES](docs/VEHICLE_PROFILES.md).
**Import track GPX** opens a review of one closed GPX 1.1 circuit with supplied
elevations. Inspect the geometry and assumed half-widths before calculating; Save
and portable projects retain its converted source. See [GPX_IMPORT](docs/GPX_IMPORT.md).
In **Track geometry → Source profiles**, inspect the original elevation, grade
and sampled curvature without moving lap playback. The same inspector appears in
GPX review; see [SOURCE_PROFILES](docs/SOURCE_PROFILES.md) for units and sampling limits.
**Import timing CSV** reviews aligned time/progress columns, explicit units and
provenance before applying. **Import reference JSON** accepts LAPTRIX exports or the timing-only external
format. **Export timing reference** provides a working format example. See
[REFERENCE_IMPORT](docs/REFERENCE_IMPORT.md) for units, alignment and provenance.
Source hashes survive signed-zero JSON round trips; older hashes require verified
migration. See [SOURCE_IDENTITY](docs/SOURCE_IDENTITY.md).
Select **Time Delta** under Telemetry graphs to inspect where the current lap gains
or loses time. Negative values are faster; positive values are slower. Clicking,
dragging, corner selection and playback all use the existing shared cursor.
Corner events can cross start/finish. Their buttons use canonical lap distances,
and reference deltas compare the full closed interval. Historical estimates stay
literal; see [CORNER_WINDOWS](docs/CORNER_WINDOWS.md).
**Cursor Data** exposes numerical channels at that same position. Enter a time in
seconds or distance in metres and press **Inspect** to pause and seek exactly.
Escape discards an unsent entry; switching axis or calculating a new lap resets it.
New laps expose signed road-normal acceleration and total tyre load separately,
with explicit legacy-file semantics. See [VERTICAL_LOAD](docs/VERTICAL_LOAD.md)
for the quasi-steady model, contact bound and independent benchmarks.
In **Lap Graphs**, choose **Graph channels → Loads & elevation** to inspect speed,
longitudinal/lateral/vertical G, total tyre load, gradient and elevation over the lap.
The original seven channels remain under **Overview**. Older references retain
their available curves with explicit missing load channels. See [LOAD_GRAPHS](docs/LOAD_GRAPHS.md).
Expand **Current-lap extrema** in that graph to jump to minimum/maximum load and
vertical G. Inspect pauses at the exact sample and restores the full-lap view;
see [LOAD_EXTREMA](docs/LOAD_EXTREMA.md).
Enable **Reference traces** in **Lap Graphs** to compare native reference channels at
the same source position. Grey dashed curves and R readings share the current lap's
axes and channel scales. Timing-only files keep this control disabled. See
[TELEMETRY_COMPARISON](docs/TELEMETRY_COMPARISON.md). The **Scale** column shows each
row's display limits, separate from its live readings; signed channels have a zero
guide. Sector inspection keeps these full-lap scales.
Use **Plot range** to inspect one sector in either graph view. **Inspect start**
pauses at its first gate; **Full lap** resets the view. Playback still follows the
whole lap until **Loop sector** is explicitly enabled. Its pressed state and the
playback strip identify the repeated interval. **Full-lap loop**, toggling the
sector off or seeking outside restores full-lap looping. See
[PLOT_INSPECTION](docs/PLOT_INSPECTION.md) and [PLAYBACK_LOOPS](docs/PLAYBACK_LOOPS.md).
Use **Custom window** to enter exact start/end seconds for closer inspection.
Applying preserves playback; both graph axes show the same lap positions, and
**Loop window** explicitly repeats that interval. See [custom windows](docs/CUSTOM_WINDOWS.md).
In **Time Delta**, **Export full-lap JSON** downloads matched comparison samples
and both completed inputs, including when inspecting one sector. Timing-only
references keep timing-only rows. See [comparison exports](docs/COMPARISON_EXPORT.md).
In **Ghost Car**, enable **Show reference ghost** to compare a native lap in 3D.
Both vehicles use elapsed seconds from the same start. The current lap sets playback
duration, and a finished reference holds the line. Timing-only files keep this
option disabled; see [GHOST_PLAYBACK](docs/GHOST_PLAYBACK.md).
**Export project** and **Import project JSON** move the whole setup and reference
between workspaces. Import recalculates with its catalog or embedded vehicle and retains the
prior workspace if validation or calculation fails. See [PROJECT_FILES](docs/PROJECT_FILES.md).
Use **Additional actions → Rename project** when the desktop name field is hidden,
or to edit a name as a draft. Rename applies it; Escape, Cancel or Close discards the
draft. Use Save explicitly to keep the name on this device.

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
| `data` | Original development track, licensed real-circuit reconstruction/source records and configurable vehicles |
| `tests` | Numerical, geometry, API and real-browser regression checks |
| `docs` | Product, architecture, decisions and development knowledge base |

Read [AGENTS.md](AGENTS.md) before substantial changes. See
[ROADMAP](docs/ROADMAP.md), [ARCHITECTURE](docs/ARCHITECTURE.md),
[LIMITATIONS](docs/LIMITATIONS.md) and [DEVELOPMENT](docs/DEVELOPMENT.md).
