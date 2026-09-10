# Architecture

The project is a small source monorepo with one npm dependency graph and a pinned
Python environment. It deliberately avoids a workspace orchestrator: there are two
processes and four small shared packages, with no independent package releases.

```text
data/tracks + data/vehicles
         │
         ▼
FastAPI → validation → bounded line optimization → speed envelope → telemetry
  ▲                                                               │
  │               Vite /api development proxy                      ▼
React setup ──────────────────────────────────────────────── validated Lap
                                                             │  │  │  │
                      procedural Three.js viewer ◀────────────┘  │  │  │
                      corner/sector analysis ◀───────────────────┘  │  │
                      shared PlaybackClock + interpolation ◀───────┘  │
                          │              │                            │
                          ▼              ▼                            ▼
                       ghost          charts                      audio
```

Track geometry is data-driven and generated procedurally. `normalizeTrack` derives
closed-loop distance, tangents, horizontal lateral normals and boundaries;
`ribbonGeometry` emits indexed, top-facing triangles. Three.js constructs and
disposes GPU geometries when data changes, never on every playback frame. Terrain
and synthetic tree placements are original contextual geometry, not surveyed data.
The Fiber canvas renders on demand when paused. A subscription to the existing
clock requests frames after actions; active playback continues the existing Fiber
frame loop. Controls invalidate during orbit/damping and fitting explicitly wakes
the scene. Pose updates precede HTML projection, and callout portal attachment
requests layout. See RENDERING.md for ordering and idle-work checks.
The same rendering bridge requests a frame after the browser restores the WebGL
context and removes its event listener on unmount. Existing scene objects, camera,
project data and playback are retained; both development and production test this.
`track-engine/vertical-profile.ts` derives signed three-point source curvature from
the original profile's closed chords, independently of Lap playback and resampling.
SourceProfile memoizes it with the existing geometry profile, shares source-segment
selection across all three plots and exports raw 1/m values in profile report v2.
See SOURCE_PROFILES.md for nodal semantics, display units and sampling limits.
`camera-framing.ts` fits original source/road edges in camera coordinates using the
canvas aspect ratio. It derives reachable orbit limits and source-scaled clipping
planes, including bounded terrain context. CameraRig applies the fit and projection
matrix after source/mode/size changes or reset; chase still consumes the shared
telemetry clock. The helper remains inside the deferred viewer dependency graph.
See CAMERA_FRAMING.md for bounds and independent projection checks.
Selected-corner callouts project exact event samples within the existing viewer
frame loop. A bounded CSS-pixel layout keeps buttons separate and connects them to
their anchors with SVG leaders, considering visible UI rectangles. Camera/data/
viewport/layer changes invalidate cached placement; stable frames do not rebuild it.
Native buttons seek the existing clock, and the component remains deferred with
the viewer. See CORNER_CALLOUTS.md for limits and regression evidence.
CameraRig clears residual orbit damping before fitting. The north indicator
projects `-z` through the actual camera quaternion after its existing frame update;
only changed arrow angles and accessible direction labels write to the DOM.
`packages/track-engine/diagnostics.ts` separately inspects original centerline
segments for projected contacts and interpolated height gaps. The settings panel
memoizes the complete bounded scan on source points and caps retained details at
100 pairs. Its diagram/export are source inspection tools; they do not modify
geometry, certify surfaces or feed an alternative trajectory into the solver.
`packages/track-engine/profile.ts` derives closed source chords, cumulative 3D
distance, elevation totals and conventional rise/horizontal-run grade in O(n).
`SourceProfile` memoizes those values and SVG paths on source points. A settings
dialog and optional GPX preview disclosure share its plots and data. The settings
dialog keeps its inspector mounted so selection survives closure. Local segment
selection has no clock or API dependency; export reuses the source fingerprint and
download helper. Resampling a lap does not replace the original source array.

Source fingerprints canonicalize exact zero in the shared TypeScript encoder and
Python sampler, preserving all other float64 bits. `restoreReference` migrates
historical signed-zero hashes only from verified source bytes or a matching native
source grid; project and Save readers share that boundary. See SOURCE_IDENTITY.md.
Reference-file activation separately checks its own request counter and the
calculation generation after file reading and hash verification, including errors.
New imports and explicit Set reference invalidate older reference work; calculation
changes and unmount invalidate it through the shared generation. Superseded work
returns without changing data or feedback, while current failures retain retry.
The menu and failed-Save recovery share one portable project writer. A storage
failure sets an explicit download action and clears stale success feedback. A
successful Save clears only a current storage warning, retaining unrelated retries.
Workspace errors store their message and recovery action in one typed value.
Every failure must choose its action; clearing an error removes both. Audio-start
failure retries the existing audio engine, and asynchronous success uses the
current error state to clear only an audio warning, preserving newer failures.

Simulation telemetry is authoritative. The renderer draws solved positions and
braking values. A single external playback clock exposes time, play/pause, rate and
loop state; binary-search interpolation supplies ghost, plots and sound. React's
high-level setup state does not rerender at playback frequency. The chart component
subscribes to the clock, while the ghost reads it within the Three.js render loop.

The backend validates all input with Pydantic. Zod validates catalog and simulation
responses before they enter the UI. The API runs synchronous simulation functions
in FastAPI's worker pool. A bounded 24-entry in-process cache avoids re-solving
identical track/vehicle/setup requests. A generation counter prevents old responses
from replacing a newer selected run. A failed run preserves the last completed lap.
Track selection also retains its current source/reference until both the selected
lap and new baseline succeed. A failed run retains its intended track and baseline
requirement for Retry. Track-file imports reserve a request generation before file
reading and calculate both laps before adding a source to the local catalog; stale
completions cannot add tracks or show success. This mirrors portable-project
activation and prevents partial workspaces when either solve fails.
The shared calculation lifecycle creates one AbortController for each ordinary
run or track/project import; both selected-lap and baseline requests receive its
signal. Cancel invalidates the request generation before aborting and re-enables
controls without replacing completed workspace data. File preparation checks its
generation before sending requests. Unmount aborts the current calculation too.
Cancellation closes browser requests; the synchronous server worker may finish.
Additional actions remains a disclosure of native buttons. Its wrapper closes on
focus leaving, Escape restores the trigger, and action activation restores focus
before any new native modal takes over. The pointer backdrop is not a tab stop.
Accessible group/trigger relationships do not introduce a separate keyboard menu
implementation. Scope and remaining review are documented in ACCESSIBILITY.md.
Viewer and telemetry use a shared `TabList` with stable component IDs and matching
panel attributes. Active tabs are the strip's only tab stop; focus activates local
content immediately. Viewer tools are separate mounted panels before the shared
canvas in document order, so selecting a tab does not recreate the WebGL context.
Telemetry panel shells retain their relationships while mounting only the selected
plot. Their shared axis state and playback clock remain outside that selection.
`CursorInspector` receives the same interpolated sample as the channel graphs.
Distance entry uses the existing distance-to-time interpolation and seeks the one
clock after pausing it. Local draft text is separate from playback, invalidated by
axis/result changes, and never changes saved setup or simulation output. Numerical
readouts use a semantic description list without a high-frequency live region.

`apps/simulation/numerics.py` builds a sparse, distance-weighted curvature quadratic
and solves its box constraints. `solver.py` owns geometry, the speed envelope,
optional local lap-time refinement and result assembly. Refinement repeatedly calls
the same vehicle/setup speed envelope; accepted positions and the matching profile
are returned together. No renderer or UI computes an independent optimized path.
The envelope resolves slope-normal weight and horizontal lateral velocity from
the same outgoing chord grade. Its signed lateral acceleration feeds both sampled
telemetry and corner summaries. Backward braking retains signed net deceleration,
including gravity-driven acceleration; convergence and force feasibility remain
separate diagnostics. See SIMULATION_MODEL.md for the bounded approximation.
Signed vertical curvature comes from adjacent horizontal-distance/elevation chords.
The same envelope uses total normal load for grip, rolling loss and crest contact
limits, exporting `verticalG`, `normalLoadG`, its minimum and a `verticalDynamics`
version marker. Shared validation enforces complete declared channels and preserves
legacy references without invented data. CursorInspector consumes the existing
interpolation/clock; optional load interpolation requires both endpoints. See
VERTICAL_LOAD.md for the physical and compatibility contracts.
The offline `scripts/elevation_study.py` separately generates original analytic
sources and runs the existing centerline solver across source/5 m/3 m grids.
It retains inputs, full results and provenance while comparing geometry against
independent continuous derivatives. It does not participate in application state
or change the solver; see ELEVATION_SENSITIVITY.md.
`line_geometry_error` applies the same finite-coordinate, source-progress and slope
checks before the initial optimized envelope and within refinement. Invalid seeds
raise an API 422; invalid candidates increment the existing rejected count. A
validated centerline remains directly solvable. No fallback mode or source mutation
is implicit; the existing transaction preserves the workspace. See LINE_GEOMETRY.md.
Numerical demand diagnostics and refinement accounting cross the existing Lap API.
Before that solve, `sampling.py` prepares a checked source or uniform grid and
source-progress alignment. The Lap response carries effective points for rendering;
the project retains the original imported track. Reference restoration verifies
source geometry independently of the selected solver resolution.

Every new Lap also contains its validated vehicle snapshot, including provenance
and model assumptions. Reference selection survives a vehicle change on the same
source track. Result names and ghost body style come from the completed Lap, so a
failed profile change cannot relabel old telemetry. Legacy references without a
snapshot fall back to the catalog name or their stored vehicle ID.

Device-local project state lives in versioned browser storage, with explicit Save.
Telemetry exports remain on the user's device. Imports use the same validated
custom-track contract. Reference files are read and validated locally as native
Lap or timing-only Reference data; they never pass through the simulation API.
Common comparison functions interpolate their time arrays against source progress.
Neither imported references nor metadata drive the canonical playback clock.
`TelemetryGhost` now renders either the current or eligible native reference Lap.
Both call the pure `ghostPose` helper with the same elapsed clock time; each uses
its own samples and vehicle snapshot. Source fingerprint matching gates native
reference availability, while timing-only references remain analytical data. The
pose helper clamps at a lap's finish and keeps the same seam-aware orientation as
time advances beyond it. Viewer preferences add no stored lap or second clock.
There is no account system or database.
`gpx.ts` reads a bounded geometry subset through native `DOMParser`; `geographic.ts`
converts WGS84 surface coordinates into a local east/north frame while retaining
supplied elevation separately. Canonical JSON zeros keep its local fingerprints
consistent with server results. `GpxImportDialog` holds file/assumption drafts and
performs no simulation during review. Its lifecycle and read generation ignore
late file completions. Applying closes the modal before returning focus, then
shares the existing track schema, normalization and generation-checked pair solve
with JSON import. A failed GPX calculation can reopen the submitted draft. The
converted Track uses existing catalog, API, Save and portable-project contracts;
raw GPX metadata is not another source of runtime geometry.
`prepareTelemetryComparison` uses the same native-reference eligibility boundary,
merges source-progress knots and separates current-lap plot coordinates from each
interpolated native sample. `telemetryPlot.ts` owns channel units, combined ranges
and stepped gear paths. React memoizes alignment, samples, ranges and SVG paths;
clock updates interpolate cursor readings without rebuilding full paths. The view
retains the same canonical Lap and clock. See TELEMETRY_COMPARISON.md.
That helper also defines the Overview and Loads & elevation channel groups.
Per-channel reference eligibility requires finite converted values and, for
vertical/load channels, declared vertical-model metadata. Only eligible reference
values contribute to each shared range. Missing values break paths instead of
creating zero samples. Group preference lives in Telemetry, outside individual tab
contents, and falls back to Overview for an undeclared current lap. It adds no
serialized data, API request or playback subscription. See LOAD_GRAPHS.md.
`loadExtrema.ts` scans declared current telemetry and retains exact sample objects,
with first-sample tie handling. The optional LoadExtrema disclosure memoizes that
scan on Lap identity. Its parent pauses/seeks the existing clock and clears only
the sector view selection. Reference overlays never feed its extrema, and missing
declared channels yield no controls. See LOAD_EXTREMA.md.
`ChannelPlot` owns channel presentation while `Telemetry` retains view state and
playback controls. `ChannelScales` renders ordinary HTML scale text; a shared CSS
height maps its rows to the SVG coordinates at each breakpoint. `channelFraction`
provides the same finite-range normalization for paths and zero guides. Graphs can
grow with wrapped captions without shrinking the SVG or shifting its scale labels.
`plotViewport` derives current-sector bounds and maps local pointer fractions into
full-lap coordinates. Both SVG plots retain canonical paths and use the viewport
to clip their horizontal extent. The parent owns a Lap-bound selection shared by
both panels; successful new results invalidate it, while failures keep it. Range
controls live inside labelled panels and do not serialize another workspace state.
Desktop grid height follows center content with a viewport minimum. Size containment
on the side columns preserves their internal scrolling while preventing their
expanded details from setting the grid's intrinsic height. The footer remains in
normal flow after the complete workspace rather than covering overflowing controls.
`RenameProjectDialog` holds only a local name draft. It closes the native modal
before callbacks restore focus outside it. Applying a name changes project metadata
without touching calculation generations, source/vehicle state or the shared clock.
The existing name field, local Save and portable export consume that same value.

Portable project bundles use a separate versioned reader in `apps/web/src/project.ts`.
It validates source/reference identity and catalog or embedded vehicle inputs,
resolves local track/vehicle-ID collisions, and returns a workspace without mutation.
The app recalculates it before committing any project state. File and API failures
therefore preserve the prior workspace. Archived laps remain artifacts rather
than an alternative source for active simulation output.
Portable v3 requires an explicit vehicle source; v1/v2 retain installed-physics
matching. Editable profiles are validated before archival defaults or unknown-field
stripping can weaken their contract. `prepareSavedProject` adapts device-local v1
records through this same boundary. Catalog registration checks the active startup
effect or successful import generation. A ref-held profile map supplies inline
vehicles to every calculation path without making startup depend on catalog state.
Full vehicle JSON already participates in the bounded cache. Python `VehicleProfile`
and shared `vehicleProfileSchema` add strict bounded inputs while preserving the
broader archived `Vehicle` reader. See VEHICLE_PROFILES.md.
Track v2 fixes timing gates to source progress, while v1 remains distance-based.
Project reuse checks track version in addition to geometry fingerprint. New laps
report gate basis and source intervals; the reference comparison already evaluates
the current physical intervals, so historical native sector totals are not reused
as if they belonged to the new gates.

Aero comparison is a local modal workflow over sequential calls to the existing
simulation endpoint. Full Lap results stay temporary until explicit application;
eligibility uses returned convergence and force diagnostics. Abort signals combine
user cancellation with the existing request timeout. No new backend job system or
alternative lap computation is introduced.
Study exports retain full source inputs and every returned Lap, including failed
and unfinished candidate states. The shared download helper keeps file creation
local. `apps/simulation/provenance.py` fingerprints normalized source text once
per process and attaches numerical runtime versions to new outputs; the optional
schema field preserves readers for older native references.

`DeferredTrackView` loads the Three.js viewer as a separate module after its panel
mounts. The application shell and analysis have no runtime import of that module.
A loading/error placeholder preserves the panel, and the completed module receives
the latest authoritative props. Browser module failures may be cached, so recovery
uses an explicit page reload after Save rather than a misleading same-module retry.
The existing in-viewer boundary still handles WebGL rendering failures separately.

Blender is not a source of truth. Future licensed GLB cars, barriers or buildings
may decorate the scene without defining track or physics. Neither track-specific
coordinates nor vehicle performance conditionals belong in React components.
