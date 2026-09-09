# Decision log

## 2026-09-09 — Compare native channels at the same source position

**Decision:** Add optional dashed native-reference traces on current-lap axes, with
shared channel scales and explicit R readouts. Merge both source-progress grids and
keep native samples separate from plot coordinates. Gear curves use steps.
**Alternative:** Overlay raw elapsed-time samples or resample only on current nodes.
**Reasoning:** Engineering channel comparison needs physical correspondence across
vehicles and lines, and a sparse current grid must not erase reference events.
**Consequences:** The existing clock and exports remain authoritative; timing-only
references cannot supply channels. Paths are memoized. Matching source declarations
do not authenticate imported telemetry. Shared-time reference ghosts retain their
separate spatial-comparison semantics. See TELEMETRY_COMPARISON.md.

## 2026-09-09 — Project naming beyond the desktop header

**Context:** The project-name field is hidden below 1,350 px, leaving smaller-screen
users without a naming control. **Decision:** Add a native dialog in the existing
actions disclosure. Keep its draft separate, preserve the existing 80-character and
blank-name contract, and apply only metadata without recalculation. Close the native
modal before restoring outside focus. **Consequences:** Cancel/Close/Escape discard
drafts, Save stays explicit, and portable names use the same field. Desktop direct
editing remains available. Browser tests compare complete exports and playback
before/after naming, and verify keyboard return, limits and save restoration.

## 2026-09-09 — Bounded inline vehicles and explicit portable provenance

**Decision:** Accept strict bounded vehicle JSON through the existing endpoint and
cache. Commit imported profiles after successful generation-checked solves. Keep
declared metadata, use deterministic local IDs for content collisions and preserve
native reference snapshots literally. **Reasoning:** User parameters should flow
through existing calculations without changing installed profiles or adding another
solver. Editable bounds must not narrow historical readers. **Consequences:** New
v3 projects explicitly choose catalog or embedded data; v1/v2 retain installed-physics
checks. Device-local saves share pure preparation. Imported parameters and sources
are labelled unverified; these bounds do not establish measured calibration.

## 2026-09-09 — Compare native ghosts at shared elapsed time

**Decision:** Render an optional grey native-reference vehicle beside the current
blue ghost. Require matching source fingerprints, preserve individual samples and
vehicle snapshots, and drive both from the existing clock's elapsed seconds.
Clamp a completed reference at its finish until current-lap playback restarts.
**Alternative:** Match normalized lap progress or synthesize a path for timing-only
references. **Reasoning:** Equal elapsed time shows the modeled spatial separation;
the latter approaches would obscure that comparison or invent unavailable data.
**Consequences:** The current lap controls duration, audio and chase camera. Native
reference imports remain declared data, not authenticated real-world trajectories.
Body geometry stays original and schematic. See GHOST_PLAYBACK.md.

## 2026-09-09 — Inspect exact positions through the existing playback clock

**Decision:** Add a Cursor Data tab with numerical channels and a native time/distance
entry form. Keep unsent draft text independent of the moving cursor; Inspect pauses
and seeks through existing telemetry interpolation. Reset drafts on axis/result
changes and allow Escape to restore the current value.
**Reasoning:** Pointer charts and a fine-step range alone make exact engineering
inspection cumbersome. **Consequences:** The view adds no solver or alternate clock,
uses explicit display units and stepped categorical fields, and labels reserved
vertical dynamics as unmodelled. Native bounds reject invalid positions without
changing playback. Readouts do not announce every playback frame as a live region.

## 2026-09-09 — Share tab navigation while retaining the viewer

**Decision:** Use one roving-tab implementation with immediate activation on focus,
stable tab/panel relationships and hidden inactive panels. Put viewer tools before
the canvas in document order, retaining the same canvas across tab changes.
**Reasoning:** The [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
fits locally available content; recreating the scene would reset useful state and
add unnecessary work. **Consequences:** Arrow keys/Home/End select views, Tab enters
the active panel or adjacent controls, and explicit focus outlines expose location.
Camera and axis buttons report pressed state. Telemetry mounts only its selected
plot and continues using the existing clock. No new UI dependency is introduced.

## 2026-09-09 — Keep actions as a native-button disclosure

**Decision:** Retain native Tab navigation, remove the pointer backdrop from tab
order, close on focus leaving, and restore trigger focus on Escape or activation.
Expose the visible action group through the disclosure trigger's controls relation.
**Alternative:** Add ARIA menu roles and an additional arrow-key menu implementation.
**Reasoning:** The existing list consists of ordinary actions; the
[W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) fits
its show/hide behavior. **Consequences:** Keyboard users reach real actions first,
can leave in either direction, and retain predictable focus after exports and file
pickers. This bounded correction is not a whole-application accessibility claim.

## 2026-09-09 — Cancel browser calculations while retaining completed work

**Decision:** Share a request controller across a run/import's selected lap and
baseline. Use the primary action for Cancel while pending, invalidate its
generation before aborting, and retain current data and pending setup edits.
**Alternative:** Keep controls locked until timeout or add backend jobs solely for
UI cancellation. **Reasoning:** Existing fetch signals and transactional activation
can release the workspace immediately without another service or alternate data
path. **Consequences:** Playback stays paused and later results are ignored. The
server may finish already executing work; cancellation does not claim to stop it.

## 2026-09-09 — Activate track changes after successful calculation

**Decision:** Commit an imported source, current lap and new reference together
after both calculations succeed. Retain the prior source while selecting another
loaded track, and remember the failed target and baseline requirement for Retry.
Reserve request generations before file reading and ignore superseded results.
**Alternative:** Clear the prior lap and catalog the import before awaiting the
general run helper. **Reasoning:** That helper handled errors internally, so the
import path could lose the workspace and report success after a failed request.
**Consequences:** Failed imports do not consume an ID or change exported project
contents. Playback pauses during loading; existing results remain inspectable.

## 2026-09-09 — Inspect source contacts without changing track acceptance

**Decision:** Report closed-centerline x/z crossing, touch and overlap pairs,
interpolated source height gaps, a selectable diagram and a source-complete local
report. Scan every pair up to the existing 2,000-point contract, but retain at most
100 details with explicit omitted counts. **Alternative:** Reject all projected
crossings or infer valid bridge clearance from positive height separation.
**Reasoning:** A crossing can represent vertically separated source paths; road
surfaces and vehicle clearance require information this model does not have.
**Consequences:** Source inspection is independent of resampling and physics,
pair counts need not equal unique locations, and neither a positive gap nor zero
contacts certifies a physically valid circuit. See TRACK_DIAGNOSTICS.md.

## 2026-09-09 — Load the WebGL viewer independently

**Decision:** Dynamically import the viewer, retain a loading/error panel, and
keep settings, simulation and telemetry functional before 3D loads. Test built
assets as well as development modules. **Alternative:** Raising the bundle-warning
threshold or blocking the workspace on the viewer. **Reasoning:** The entry had
grown above 1.3 MB and Three.js was its largest dependency. **Consequences:** The
entry is about 353 kB, the complete viewer still downloads separately, and an
explicit Save then page reload recovers from cached module-fetch failures.

## 2026-09-09 — Version fixed source timing gates

**Decision:** Track v2 places sector fractions on original source-centerline
progress. Continue reading v1 with racing-line-distance fractions. Return explicit
basis and actual source intervals in new laps, with optional fields for old readers.
**Alternative:** Silently redefining existing v1 files or retaining moving gates
when racing-line length changes. **Reasoning:** Comparison needs consistent track
locations, while portable files must preserve their documented meaning.
**Consequences:** The bundled track/generator use v2. Physical correspondence
fingerprints remain compatible across versions, native references retain literal
times, and project import considers version as well as geometry before reuse.

## 2026-09-09 — Exact per-gear power inside the speed envelope

**Decision:** Replace the uniform maximum-power lookup with scalar evaluation of
each gear's piecewise-linear RPM curve, using precomputed slopes and interval
search. **Alternative:** Increasing the lookup resolution or loosening demand
tolerance. **Reasoning:** The GT aero study exposed up to 3.34% excess drive
demand where the lookup bridged a redline drop. A denser grid still smooths a
discontinuity. **Consequences:** The sweep and exported drivetrain now agree at
knots, redline sides and gear crossings; existing 1.015 force tolerance is unchanged.
Lap results may move slightly in either direction because the old approximation
could both overstate and understate available power. Provenance includes the new
drivetrain module, and recorded older references retain their original values.

## 2026-09-09 — Archive study evidence and solver identity

**Decision:** Export a versioned local study record with source inputs, full Lap
outputs, errors and unfinished rows. Include a source fingerprint and numerical
runtime versions in each newly calculated Lap. **Alternative:** Saving only the
winning time or relying on the development model's display name as its version.
**Reasoning:** A comparison needs inspectable evidence and implementation identity
to remain interpretable after parameters or solver code change. **Consequences:**
Reports are larger than summaries, legacy outputs have unknown provenance, and
request timestamps do not imply fresh computation when the API cache is used.
The hash records source identity rather than a promise of cross-platform equality.

## 2026-09-09 — Bounded aero study with deliberate activation

**Decision:** Compare five or six aero values sequentially using the selected
solver and fixed remaining inputs. Require affirmative convergence and force
checks before selection, then apply the exact chosen Lap only on user action.
**Alternatives:** Changing the workspace after every run or labelling a small
candidate search globally optimal. **Reasoning:** A useful setup comparison must
preserve the working lap and expose its evidence. **Consequences:** Runs are
temporary until applied, references remain unchanged, and Stop cancels queued
work plus the active browser request. An already executing server solve may finish.

## 2026-09-09 — Transactional portable project activation

**Decision:** Export names in v2 bundles, read v1/v2, validate installed vehicle
physics and source alignment, then recalculate before activating imported state.
**Alternatives:** Partially replacing the workspace before the API succeeds, or
silently running different parameters than those in the exported vehicle.
**Reasoning:** Portable setup restoration must preserve prior work on failure and
keep active telemetry sourced from the current solver. **Consequences:** Imports
require the local API and matching installed physics. Old reference values remain
literal. Colliding track IDs are isolated locally and repeat imports reuse them.
The existing explicit device-local Save behavior remains unchanged.

## 2026-09-09 — Source-aligned delta trace

**Decision:** Add a dedicated Time Delta view that merges both timing grids before
plotting and interpolates the live cursor against the reference's source progress.
**Alternative:** Plot only at simulation samples or introduce a separate playback
clock. **Reasoning:** Fine reference events must survive and seeking must stay
synchronized with the ghost and telemetry. **Consequence:** Prepared comparison
axes and paths are memoized. The existing seven physical channels remain separate
from comparison values, and mismatched source alignment produces an empty state.

## 2026-09-09 — Separate external timing reference contract

**Decision:** Accept native Lap exports and a separate timing-only format with
explicit units, provenance, source identity and complete paired time/progress.
Use common interpolation for sector/corner comparisons; preserve simulation
telemetry as the only ghost/graph/audio input.
**Alternatives:** Fabricating missing measured channels to satisfy the Lap schema,
or silently treating normalized logger distance as source-track correspondence.
**Reasoning:** A timing file can support useful comparison without asserting
unavailable vehicle physics, controls or geometry. Source identity and alignment
accuracy are separate claims; the file declares the latter.
**Consequences:** Imported files are browser-local and capped at 5 MB. Reference
sectors now use the current lap's source gates rather than raw reference-sector
indices. Native imports retain snapshots and an imported filename. GPS map matching,
generic CSV conversion and measured channel overlays remain unimplemented.

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
