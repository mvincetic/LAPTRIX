# Architecture

Playback entry observes transitions of the existing clock to select the initial
follow camera. Explicit camera/reset choices suppress automatic changes. The
isolated ScenePlayback subscriber displays current/reference vehicle identity and
owns viewer restart, rate and seek controls. Follow only changes view/visibility;
none of these actions adds a clock, simulation request or persisted project field.

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
The catalog now includes the original development circuit and a licensed Red Bull
Ring reconstruction. Its offline importer consumes pinned OSM/terrain files;
runtime requests do not contact the data providers. Catalog JSON is explicitly
decoded as UTF-8 on every platform, including Windows.
Optional bounded track attribution is validated in both contracts, displayed by
generic viewer/inspection components and copied to new Lap metadata. It does not
participate in the physical source fingerprint. Native/timing JSON retains it;
CSV exports with declared source notices use an uncompressed ZIP alongside a text
notice and JSON attribution. The numeric tables and interpolation are unchanged.
The deferred Landscape component consumes a pure fixed-grid terrain builder.
Nearest source-segment interpolation and conservative road/shoulder cell caps
prevent contextual ground from cutting through the road. Tree clearance accounts
for source widths and bases sample the final terrain triangles. See TERRAIN.md.
Road and separate shoulder strips use track-keyed memos. Both retain every source
cross-section and boundary, adding render-only sections at three-metre gates to
limit the twist of coarse, nonplanar quads. Shoulder geometry joins the exact outer
road edges instead of spanning under its full width. Ordinary setup or viewer-state renders retain both GPU
geometries; track replacement derives fresh surfaces and disposes old buffers.
`road-presentation.ts` builds original paint/curb/finish geometry from those source
frames and a separate apron from the existing final terrain sampler. RoadDetails
uses three static material batches. Ribbon UVs are centered world coordinates;
small deterministic mipmapped grain textures provide surface scale without asset
downloads. Landscape retains its fixed terrain/placement budget and adds an
instanced trunk batch. Source, solver and playback data remain unchanged.
The Fiber canvas renders on demand when paused. A subscription to the existing
clock requests frames after actions; active playback continues the existing Fiber
frame loop. Controls invalidate during orbit/damping and fitting explicitly wakes
the scene. Pose updates precede HTML projection, and callout portal attachment
requests layout. See RENDERING.md for ordering and idle-work checks.
The same rendering bridge requests a frame after the browser restores the WebGL
context and removes its event listener on unmount. Existing scene objects, camera,
project data and playback are retained; both development and production test this.
The deferred viewer's isolated FullscreenControl derives state from native
fullscreen events and handles rejected or unavailable API calls locally. Generations
invalidate obsolete errors after newer requests/transitions and cleanup removes
the listener. Fullscreen scene sizing can shrink under a fixed header/footer,
retaining the existing Canvas and camera mode. See FULLSCREEN.md.
TrackView observes its actual scene size for the track key's initial compact
state, with a local explicit-choice override. Expanded state participates in the
existing event/ghost layout keys and demand invalidation; its observer disconnects on
cleanup and adds no clock or renderer. See TRACK_KEY.md.
An isolated `ScenePlayback` subscribes to the same PlaybackClock through
`useSyncExternalStore`. Its footer interpolates the current canonical Lap; clock
notifications do not rerender TrackView or rebuild geometry. The readout has no
timer and does not announce numerical updates as a live region.
Its viewer play/pause, loop and seek controls call the existing PlaybackClock
methods directly, with unique accessible names beside the graph transport.
The same snapshot drives both sliders, current readouts and the interval-loop
notice. Native fullscreen retains these controls inside the fullscreen element;
no secondary state, persistence field or input-to-simulation path is introduced.
`chase-camera.ts` derives distance-follow and look-ahead poses from the same Lap,
with a fixed field of view and no history-dependent smoothing. Below canvas aspect
0.9 it retreats on the same view ray to retain portrait fullscreen car clearance.
VehiclePresentation
contains original Formula/GT bodywork in metres. Its memoized geometry survives
ordinary setup/viewer edits; TelemetryGhost updates wheel spin from travelled
distance and front steering from the existing sample in the same pose callback.
The road, racing line and tyre bases share explicit display offsets, avoiding
the previous enlarged mesh and floating line. Overview dots are screen-space
locators rather than enlarged vehicle geometry.
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
Separate audio generations in the workspace and synthesis engine reject obsolete
enable completions. Mute and disposal invalidate pending activation; a late
success/rejection cannot replace newer audio intent, UI state or a replacement
context's activation. See AUDIO_ENGINE.md.

Simulation telemetry is authoritative. The renderer draws solved positions and
braking values. A single external playback clock exposes time, play/pause, rate and
loop state; binary-search interpolation supplies ghost, plots and sound. React's
high-level setup state does not rerender at playback frequency. The chart component
subscribes to the clock, while the ghost reads it within the Three.js render loop.
The clock schedules one animation callback chain only while playing and owned by
an active `start()` registration. Pause, new-Lap reset, non-looping finish and last
owner cleanup cancel pending work; resume initializes a fresh timestamp. Multiple
owners share the chain, cleanup is idempotent, and notification-time pause is
honored before another frame can be queued. The existing delayed-frame cap and
forced finish notification remain intact. See RENDERING.md.
An optional validated start/end interval in that same clock supports explicit
sector playback loops. Telemetry memoizes sector times from canonical distance
gates and derives the visible loop label from the clock. No duplicate selection
state or scheduler is needed. Outside seeks clear the interval; new-Lap configure
also clears it. See PLAYBACK_LOOPS.md for boundary and transport semantics.
Custom graph windows store exact time endpoints with the completed Lap object.
The shared viewport helper validates both axis projections; switching axes maps
the same endpoints through canonical interpolation. Paths and full-lap scales
remain memoized, while only clipping and labels change. Explicit Loop window uses
the existing clock interval; editor and plotted range do not own playback state.
See CUSTOM_WINDOWS.md.

The solver's `analyze_corners` derives bounded periodic windows from the completed
speed profile and its canonical time/distance axes. Temporary unwrapped indices
support interval arithmetic; all exported event indices address the existing Lap.
`cornerAnalysis: closed-windows-v1` enables periodic contract checks and wrapped
reference duration, while absent markers retain historical interval rules. No
additional solver pass or playback clock is introduced. See CORNER_WINDOWS.md.

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
Additional actions remains a disclosure of native buttons. `useActionsMenuHeight`
measures the open menu before paint and observes viewport/header size changes to fit it below
the opener with a 12 px lower gutter. CSS provides internal vertical scrolling,
contained overscroll and fixed-size rows. No timer or playback subscription is
added; the observer/listener are removed when the disclosure closes. Its wrapper
closes on focus leaving, Escape restores the trigger, and action activation restores focus
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
`timingCsvData.ts` contains bounded CSV parsing and explicit numeric conversion;
`timingCsv.ts` reexports that pure contract and constructs canonical references.
`TimingCsvReader` creates one module worker per selected file. The worker retains
the raw table and returns only headers/count and converted timing arrays. Request
IDs pair replies with promises; disposal terminates the worker and rejects pending
work. Startup/message errors stay local and permit choosing a file again.
The native TimingCsvDialog owns file generations and conversion effects. A preview
belongs to the exact column/unit selection object, so an older result cannot enable
Import after a selection change. Cancel, replacement, unmount and successful Apply
release the worker. Metadata edits and playback do not repeat conversion.
App retains source fingerprinting and shared reference/calculation generation
checks through asynchronous Apply. Canonical schema validation remains on Apply.
Converted CSV data enters the existing persistence path without a new source,
solver call, channel set or playback clock. The worker uses
[Vite's static worker constructor](https://vite.dev/guide/features#web-workers)
and [immediate termination](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate).
`comparison-report.ts` consumes `prepareTimeComparison`'s source progress and
matched reference times, then uses the existing sample interpolator for each side.
It clones both completed inputs and omits undeclared legacy vertical channels from
derived rows. TimeDeltaPlot builds/downloads the report only on explicit activation;
no clock, calculation, project or reference action is dispatched. The report is a
separate versioned artifact, not another accepted import format.
`comparison-csv.ts` serializes those exact report rows into a fixed 40-column
numeric table. Canonical-unit headers pair both sides' channels, and omitted
channels become blank cells. Serialization retains numeric precision and CRLF
records; no new alignment, interpolation, inferred channel or sample grid is added.
CSV omits arbitrary metadata/input snapshots, which remain available in JSON.
`TelemetryGhost` now renders either the current or eligible native reference Lap.
Both call the pure `ghostPose` helper with the same elapsed clock time; each uses
its own samples and vehicle snapshot. Source fingerprint matching gates native
reference availability, while timing-only references remain analytical data. The
pose helper clamps at a lap's finish and keeps the same seam-aware orientation as
time advances beyond it. Viewer preferences add no stored lap or second clock.
Stable Group refs let `GhostLabels` project the rendered vehicle matrices after
pose updates. A pure bounded layout moves name rectangles around static scene
obstacles while keeping their anchors exact. Separate HTML portals put leaders
below badges and names above the canvas. Camera/result/layout/visible-node changes
refresh obstacle bounds; vehicle movement reuses them. A cleaned-up Fiber
`addAfterEffect` subscription orders event controls, sector badges and ghost names
after final HTML positions, even when portals remount in a different order.
Upstream placement changes invalidate downstream obstacle caches in the same pass.
`SectorLabels` connects measured timing rectangles to their canonical interval
midpoints and omits obstructed/offscreen map badges while analysis retains the times.
Root attachment invalidates the demand renderer, with no second
scheduler. See GHOST_LABELS.md.
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
