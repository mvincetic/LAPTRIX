# Decision log

## 2026-09-11 — Preserve car framing in portrait fullscreen

**Decision:** For canvas aspect ratios below 0.9, retreat the chase camera from
its existing target along the same view ray by `0.9 / aspect`. Keep the vertical
field of view fixed at 55 degrees. **Reasoning:** A full-lap projection sweep
identified a narrow fullscreen risk; composited pixel checks confirmed the GT
car was cropped at a Red Bull Ring hairpin. **Consequence:** Tall views retain
road and car clearance with unchanged bearing, clock and source telemetry.
Ordinary wider views retain their exact pose; the adaptation depends only on
viewport size, with no time smoothing or animated field of view.
The 320 px review also exposed clipped elapsed time and a seek bar extending
outside the footer. At widths up to 360 px, controls, readouts and scrubbing use
three rows. Browser pixel checks wait for the actual WebGL backing size after
fullscreen changes, then verify footer containment as well as car clearance.

## 2026-09-11 — Keep playback controls inside the viewer

**Decision:** Add native play/pause, loop and seek controls to the existing isolated
ScenePlayback subscriber, with an explicit active-interval notice. Refine footer
layout and result/table typography. **Reasoning:** A readout alone left fullscreen
playback dependent on controls outside the fullscreen element. **Consequence:**
Both transports operate one clock and immediately reflect the same time and loop
state; keyboard input and completion keep their established semantics. Unique
accessible control names distinguish viewer actions from graph actions.

## 2026-09-11 — Ground the source road with original scene detail

**Decision:** Add static world-scale grain, edge paint, curvature-based schematic
curbs, a finish stripe and grass aprons from shoulders to the existing terrain.
Retain original source geometry, conservative ground caps and seeded tree locations.
**Reasoning:** Close chase views need road-scale cues and a visible ground connection;
licensed centerline/elevation data does not specify actual scenery or curbs.
**Consequence:** Scene detail is generic, explicitly schematic and disconnected
from physics. Memoized batches and instanced trunks retain settled zero-draw
behavior. No commercial circuit artwork, runtime map or external asset is used.

## 2026-09-11 — Follow source metres with original vehicle bodywork

**Decision:** Replace the distant heading-offset chase pose with physical-distance
sampling of the canonical lap, and replace enlarged boxes with original metre-scale
Formula/GT lofts and components. Drive wheel rotation and steering from the same
sample as each ghost. **Reasoning:** A closer road perspective and recognizable
vehicle give useful speed/scale cues without decorative motion or fake telemetry.
**Consequence:** Paused seeks are deterministic, finish wrapping is continuous,
overview uses screen-space locator dots, and the racing line sits below bodywork.
The fixed field of view avoids zoom pumping. Models and contact shading remain
original visual approximations, not manufacturer geometry or suspension dynamics.

## 2026-09-11 — Bundle a reproducible, attributed Red Bull Ring showcase

**Decision:** Add a separate Red Bull Ring GP source built offline from OSM relation
5309181v8 and a pinned Steiermark1m terrain crop. Preserve Dev Track. Record the2010
flight epoch, all transformations, estimated widths/sectors and6.084m maximum
height adjustment. Keep source licenses in the repository and exported results.
**Reasoning:** A recognizable real circuit supports the new presentation priority;
the data does not establish a surveyed current race surface. **Consequence:** The
app remains generic and offline, with no circuit-specific solver tuning. Optional
attribution survives JSON and accompanies CSV in an explicitly labelled ZIP.
Source identity stays geometric; solver-source identity changes for added metadata
without changing equations. UTF-8 catalog reads fix Windows credit corruption.

## 2026-09-11 — Present the preserved development circuit and shared playback

**Decision:** Rename only the installed synthetic circuit's display name to
LAPTRIX Dev Track; retain its ID, data file, points, sectors and fingerprint.
Replace scene implementation details with an isolated current-lap playback readout.
**Reasoning:** The user considers the technical MVP sufficient and prioritizes
presentation. Speed, gear and playback state explain the moving vehicle directly.
**Consequence:** Existing catalog-based projects resolve to the current label;
historical reference artifacts retain their recorded names. The footer consumes
the existing clock and interpolation without another scheduler or scene rerenders.
Red Bull Ring will be added alongside the development track in the next milestone.

## 2026-09-10 — Own CSV review work by the selected file

**Decision:** Parse and convert in one dedicated worker per file, retaining the raw
table there. Return only headers/count and timing values; terminate on replacement,
close or successful import. Bind conversion results to their exact selection and
reject pending requests on disposal. **Reasoning:** Accepted near-5-MB files took
hundreds of milliseconds synchronously, including large ignored note fields.
**Alternatives:** Lower import limits, copy the full parsed table back, or silently
fall back to blocking UI work. **Consequence:** CSV review requires a working local
worker module and shows a recoverable error if it fails. Canonical validation on
Apply, existing source/reference generations and the single playback clock remain.
Production browser tests exercise the separately built module and failure recovery.

## 2026-09-10 — Serialize aligned comparisons as a numeric CSV table

**Decision:** Build the existing full-lap report on explicit activation and export
its exact rows through a fixed 40-column canonical-unit header. Missing timing-only
or historical load channels remain blank; known zero remains numeric zero.
**Reasoning:** External analysis can use flat columns without rebuilding source
correspondence from nested JSON. **Alternatives:** Another interpolator or embedding
unstructured metadata in spreadsheet rows. **Consequence:** JSON retains metadata,
source fingerprint and original snapshots; CSV contains numeric analysis only.
No new persistence format or automatic reference-import round trip is introduced.

## 2026-09-10 — Bound the actions disclosure to available height

**Decision:** Measure the open menu's actual top edge before paint, refresh on
viewport/header resizing, and use internal scrolling with fixed-size native
buttons. **Reasoning:** The 456 px menu exceeded a 390 px viewport and native
Tab navigation moved the whole page, hiding its opener. **Alternatives:** Fixed
viewport offsets, smaller action rows or new menu keyboard semantics.
**Consequence:** The menu retains its original anchor, action order and focus
behavior; no application data, playback or simulation work is introduced.

## 2026-09-10 — Review CSV into the existing timing-reference contract

**Decision:** Parse bounded local comma-separated records, ask for explicit time/
progress columns and units, preview conversion and require source/provenance
declarations. Validate the resulting existing timing schema after fingerprinting
the displayed source. **Reasoning:** Prepared logger/simulation timing can be
compared without hand-writing JSON, while source correspondence remains explicit.
**Alternatives:** Guess distance/GPS alignment or introduce another persisted format.
**Consequence:** CSV cannot supply positions or channels absent from timing data.
Read generations and shared reference/calculation generations protect cancellation
and superseding actions. No solver request or playback transition is introduced.

## 2026-09-10 — Keep contextual terrain below source roads

**Decision:** Use all closed source segments for ground interpolation and cap
overlapping grid cells below road/shoulder segment endpoints. **Reasoning:** An
accepted original sloped-circle import exposed repeated terrain intrusions and
visible racing-line gaps at desktop and phone widths. **Consequences:** Road,
lap and physics stay unchanged; the conservative synthetic ground can lie well
below the road at sparse segments or crossings. Tree clearance uses road widths
and the actual capped ground. A pure builder and separate deferred Landscape
component retain the existing fixed grid and rendering lifecycle. See TERRAIN.md.


## 2026-09-10 — Retain unchanged shoulder geometry

**Decision:** Memoize shoulder widths beside the existing asphalt widths by track
identity. **Reasoning:** Inline expanded-width arrays caused every pending setup,
key, tab and camera change to delete three GPU buffers and upload 51,840 bytes
again on the source-grid scene. **Consequences:** Ribbon's existing geometry memo
now survives ordinary renders. Dimensions, materials, disposal on replacement,
sampling and solver data retain the same behavior. Real buffer counters extend
the existing demand-render checks; no additional cache or dependency is introduced.


## 2026-09-10 — Expose short-scene markers through a collapsible key

**Decision:** Make the track key a native disclosure, initially collapsed below
480 px scene width or 350 px height while retaining an explicit user choice. **Reasoning:** The
fixed legend intercepted corner 1 in short fullscreen Top View; visual QA also
caught the added heading covering the phone marker. **Consequences:**
Marker coordinates remain authoritative; existing event/ghost placement observes
the key's changed bounds. A single ResizeObserver and local state add no clock,
solve or project-format change. Expanded overlays remain optional obstacles;
this is not global marker collision avoidance. See TRACK_KEY.md.


## 2026-09-10 — Recover viewer fullscreen transitions locally

**Decision:** Derive fullscreen controls from actual browser events, catch failed
entry/exit locally, ignore obsolete completion errors and permit the fullscreen
scene to shrink around its header/footer. **Reasoning:** Browser cases reproduced
missing failure feedback and stale control state; short-landscape review also
exposed camera/exit controls clipped below the viewport. **Consequences:** The same
Canvas, camera mode, selected corner, ghost options and canonical clock remain.
Native transitions need no new dependency or global error handler, and the ordinary
workspace retains its minimum scene height. See FULLSCREEN.md.
## 2026-09-10 — Inspect exact custom telemetry windows

**Decision:** Extend the existing plot viewport with exact current-lap time bounds,
an explicit Apply/Cancel editor and optional reuse of `clock.focusLoop`.
**Reasoning:** Whole-sector views can obscure short braking events. Canonical time
endpoints preserve the same positions across nonlinear time/distance axes without
creating another data grid. **Consequences:** Existing paths, full-lap scales,
source alignment and project data stay unchanged. Applying preserves playback;
only explicit Inspect/Loop actions change it. The 0.001-second minimum bounds the
editor's zoom, not simulation accuracy. New laps reset this transient selection;
increasing windows cannot wrap across the seam. See CUSTOM_WINDOWS.md.

## 2026-09-10 — Preserve the latest explicit audio activation

**Decision:** Guard asynchronous activation in both the engine and workspace with
generations advanced by enable, mute and cleanup. **Reasoning:** Controlled native
resume delays reproduced an older success undoing mute and an older rejection
overwriting a successful activation at both desktop and phone widths. Engine tests
also exposed activation of a replacement context by its disposed predecessor.
**Consequences:** The existing context, synthesis and telemetry subscription remain;
only the current attempt can activate output or update completion UI. Active
failures still retry normally, unrelated errors survive recovery, and mute clears
only its obsolete success notice. See AUDIO_ENGINE.md.

## 2026-09-10 — Sleep the shared playback scheduler while paused

**Decision:** Queue clock frames only during owned active playback, cancel at
pause/reset/finish/cleanup and resume with a fresh timestamp. **Reasoning:** Demand
rendering removed idle WebGL draws, but the clock still executed 32 callbacks per
measured half-second. **Consequences:** One canonical clock and one shared frame
chain remain. Multiple start owners receive idempotent cleanup; paused inspection
still notifies the renderer. Seven scheduling cases preserve delayed-frame/rate,
finish, restart and notification behavior, and browser checks now require zero
idle callbacks as well as draws. See RENDERING.md.

## 2026-09-10 — Export comparison data through the existing alignment

**Decision:** Add full-lap comparison JSON to Time Delta, using the plot's merged
source grid, matched times and shared channel interpolator. Preserve both original
comparison inputs, explicit units and missing-channel availability. **Reasoning:**
Individual Lap exports do not capture the source-aligned comparison shown in the
workspace. **Consequences:** Timing-only references remain timing-only; unmarked
historical vertical fields stay literal in the archived input and are omitted from
derived rows. Export preserves inspection and pending work, and adds no import
format, solver or clock. The maximum merged timing grid is covered independently.
See COMPARISON_EXPORT.md.

## 2026-09-10 — Place ghost names around scene information

**Decision:** Project existing rendered car transforms into separate bounded name
boxes and leaders. Reuse corner-callout placement with explicit dimensions and
unchanged corner defaults. **Reasoning:** The sector-loop visual review exposed
CURRENT covering Sector 2's time for GT/Formula comparison. **Consequences:** Car
poses and timing stay authoritative; reference-finish checks measure anchors
separately from movable labels. Names may be omitted in crowded/offscreen views
instead of gaining misleading long leaders. Portal-aware caching retains demand
rendering without another clock or per-frame React state. See GHOST_LABELS.md.

## 2026-09-10 — Repeat selected sectors through the canonical playback clock

**Decision:** Add an explicit Loop sector toggle, optional validated clock interval
and persistent active-loop strip. **Reasoning:** Engineers can repeat a selected
section without rescrubbing the whole lap, while changing the graph view alone
must retain its existing inspection-only meaning. **Consequences:** Playback,
ghosts, plots and audio still share canonical time. Outside seeks restore full-lap
looping; new results clear the interval. The range stays transient and introduces
no project, solver or source-data changes. Keyboard and whole-boundary cases are
tested, including independent first/final-sector and rate/remainder checks.
See PLAYBACK_LOOPS.md.

## 2026-09-10 — Preserve corner events across the closed lap seam

**Decision:** Derive event windows with bounded periodic indexing and declare
`cornerAnalysis: closed-windows-v1` on new Laps. Validate their event order and
sample-derived intervals, and wrap reference timing through its own lap duration.
**Reasoning:** Moving the source start onto an apex preserved lap physics but
clipped its braking distance to zero and shortened its reported corner duration.
**Consequences:** Event indices still point into canonical telemetry; the UI states
when distances cross the origin. Existing unmarked reference estimates remain
literal, and no source alignment is inferred across differently ordered tracks.
Independent interval sums and six Formula/GT rotation regressions protect the fix.
See CORNER_WINDOWS.md for bounds, compatibility and limitations.

## 2026-09-10 — Inspect sampled source curvature with the original profiles

**Decision:** Add a signed three-point curvature plot and selected-point value to
the existing source inspector, with 1/km display and full-precision 1/m in report
v2. **Reasoning:** Elevation and grade alone do not expose the sampled curvature
that can strongly affect vertical load. **Consequences:** Original points and
elevation/grade fields stay unchanged; the estimator adds no smoothing or quality
threshold. Nodal values remain distinct from solved-line dynamics and absent source
detail. The dialog retains one selection and a visible Close control while scrolling.
Analytical circle/triangle oracles and source-transform checks cover the calculation.
See SOURCE_PROFILES.md and ELEVATION_SENSITIVITY.md.

## 2026-09-10 — Redraw a paused scene after graphics restoration

**Decision:** Request a Fiber frame when the canvas receives `webglcontextrestored`.
**Reasoning:** A bounded context-loss probe showed the paused circuit stayed blank
after Three restored its resources, until another interaction requested a frame.
**Consequences:** A cleaned-up listener redraws the existing scene without changing
the project, clock or camera. Repeated restoration is tested on desktop/phone and
against production assets. The browser still determines whether a lost graphics
context can be restored. See RENDERING.md.

## 2026-09-10 — Let a settled paused viewer stop drawing

**Decision:** Use Fiber's demand rendering with existing-clock invalidation and
continuous frames only during playback or camera movement. Update camera/ghost
poses before HTML projection and invalidate callouts when their portal becomes
ready. **Reasoning:** Instrumented WebGL calls showed continuous idle rendering
despite a stationary paused scene. Existing Drei controls already invalidate camera
changes. **Consequences:** Geometry, resolution and authoritative time are retained;
single-frame seeks must update projected labels correctly. Browser checks measure
actual draws and cover wake/settle behavior without claiming hardware frame-rate
or battery guarantees. See RENDERING.md.
The clock also publishes non-looping completion even inside its normal 30 Hz
notification interval, preventing subscribers from retaining a stale playing state.

## 2026-09-10 — Seek sampled current-lap load extrema through the existing clock

**Decision:** Add a collapsed disclosure for full-lap minimum/maximum tyre load
and vertical G, retaining exact sample objects and first-sample ties. Inspect
pauses the existing clock and restores the full-lap graph before seeking.
**Reasoning:** The load curves expose meaningful whole-lap data, but locating their
extrema by manually scrubbing does not give an exact sample. A sector-only view
can also hide the chosen event. **Consequences:** Labels explicitly identify current
lap and full-lap scope. Overlay references and pending setup remain untouched,
legacy zeros do not create extrema, and actions add no solve or second clock.
The UI describes sampled values without inferring source accuracy. See LOAD_EXTREMA.md.

## 2026-09-10 — Quantify source elevation sensitivity with complete analytic cases

**Decision:** Add a fixed offline phase/resolution study with original sine-elevation
circles, complete source/vehicle/setup/Lap exports, independent geometric oracles
and unchanged production sampling. **Reasoning:** The new tyre-load model responds
to elevation curvature. A 720-node source can sample only a 10 cm wave's zero
crossings, while another phase captures its extrema; passing force checks does not
identify the missing surface. **Consequences:** Thirty cases in both vehicles
quantify the sensitivity, including capped 3 m grids and denser original sources.
The report distinguishes numerical eligibility from source fidelity and retains
rejected cases. It introduces no smoothing, automatic quality threshold or calibrated
uncertainty claim. See ELEVATION_SENSITIVITY.md for exact inputs and results.

## 2026-09-10 — Inspect declared load channels in a separate graph group

**Decision:** Retain the seven-channel Overview and add a seven-row Loads &
elevation view using the same channel renderer, source alignment and playback
clock. Determine reference availability separately for each load-group channel.
**Reasoning:** Vertical acceleration and tyre load are now meaningful solver
outputs, while older references have no declared vertical model. Rejecting all
their graphs loses useful comparisons; drawing reserved zeros invents meaning.
**Consequences:** Eligible curves alone contribute to shared scales; unavailable
rows show R — and an explanation. Legacy current laps retain Overview. Signed
small-G ranges use tenths, tyre load uses multiples of weight with a 1× guide,
and gradient explicitly means rise / 3D distance. Group choice is a local view
preference without new project fields or simulation work. See LOAD_GRAPHS.md.

## 2026-09-10 — Separate scene callout layout from event geometry

**Decision:** Lay out selected-corner event buttons in CSS pixels and connect them
to projected sample positions with SVG leaders. Reuse the viewer frame loop and
cache placement between relevant changes. **Reasoning:** Final GT visual review
showed that world-metre label offsets collapse into overlapping text when zoomed
out. A browser regression reproduces the overlap. **Consequences:** Events retain
their exact samples/times and existing seek actions. Buttons stay separate and
inside supported canvas bounds, while a bounded heuristic reduces overlap with
other visible UI. A wider phone review exposed collisions with other labels;
the layout now searches free vertical gaps at up to 64 horizontal positions.
Offscreen events are omitted; no source location is invented.
This adds no simulation state or independent playback timing. See CORNER_CALLOUTS.md.

## 2026-09-10 — Model quasi-steady crest/compression contact load explicitly

**Decision:** Derive signed vertical curvature from adjacent horizontal-distance/
elevation chords and use gravity, curvature and road-normal downforce together for
tyre grip and rolling loss. Retain a separate 2% gravity-supported contact reserve
at crests. Export signed acceleration, positive normal load, its minimum and a
versioned interpretation marker through the existing Lap. **Reasoning:** An
independent synthetic crest probe reconstructed nonpositive tyre load where the
old envelope still claimed feasible grip. A straight crest also needs a contact
bound when lateral demand is zero. **Consequences:** All solver modes and studies
share the correction; rolling loss now includes aerodynamic load too. Analytical
geometry/force tests retain independent oracles, and previous work/braking checks
keep their tolerances with the corrected equations. Legacy references retain their
reserved zeros without invented channels; declared new data must be complete.
Cursor Data uses the same playback interpolation. This remains a discrete road-
following point mass, without suspension, flight or measured calibration. See
VERTICAL_LOAD.md for equations, the numerical reserve and evidence.

## 2026-09-10 — Keep each workspace error with its recovery action

**Decision:** Replace separate message/action state with one typed error value,
including an explicit Enable audio again action. **Reasoning:** After the Save
recovery fix, browser checks also reproduced audio-start failures inheriting
simulation Retry or Download project. Keeping the fields separate allowed a new
failure to reuse unrelated recovery metadata. **Consequences:** Every failure now
chooses its action when publishing its message. Existing calculation/import retries
retain their behavior. Successful audio enable and Save clear only their respective
current warning through functional state updates, so a delayed audio success cannot
erase a newer reference error. Retrying audio preserves the workspace and clock.

## 2026-09-10 — Recover failed device Save through the existing portable export

**Decision:** Give storage failures an explicit Download project action, sharing
the menu's portable writer. Clear stale success feedback on a Save attempt, and
clear only an active storage warning after a later successful Save. **Reasoning:**
The generic error banner inherited either simulation Retry or Import reference
again when local storage failed, neither of which preserves the project on disk.
**Consequences:** Recovery retains the completed lap, pending setup, reference,
cursor and previous device save. Download does not imply that browser storage was
written. Other failures keep their own messages and retry actions after successful
Save. The project format and explicit Save contract remain unchanged.

## 2026-09-10 — Classify comparison displays at their visible precision

**Decision:** Suppress the sign of a displayed zero and share comparison-tone
classification using the same `toFixed` precision. Use neutral styling for zero or
missing comparisons across tables, badges, cursor readouts and aero rows. Percentage
change uses its own two-decimal value. A wholly sub-resolution time-delta trace
retains its path with neutral stroke. **Reasoning:** Comparing a lap to its own
export produced red `+0.000` and green `-0.000` sector differences from interpolation
roundoff. Separate aero thresholds also disagreed at the negative rounding boundary.
**Consequences:** Full-precision timing, interpolation, trace coordinates, ranking,
eligibility and exports remain unchanged. Neutral presentation means no difference
at the displayed precision, not a claim of exact numerical or physical equality.

## 2026-09-10 — Keep reference imports ordered through reads and hashes

**Decision:** Give reference-file imports a separate request counter, checked with
the calculation generation after each asynchronous boundary and before reporting
errors. A new import or explicit Set reference supersedes earlier reference work;
workspace changes invalidate it through the existing calculation lifecycle.
**Reasoning:** Controlled browser reads reproduced an older valid file overwriting
a newer reference and an older malformed file replacing current success with an
obsolete error. A calculation-only guard did not order reference changes.
**Consequences:** Superseded work exits quietly. Current failures keep the completed
reference and retry action; reference changes retain playback and cause no solve.
No worker, second clock or additional application service is introduced.

## 2026-09-10 — Canonicalize exact zero and verify legacy source hashes

**Decision:** Encode exact zero as positive zero in both source fingerprint
implementations. Preserve all other bits, the v1 prefix and existing positive-zero
hashes. Keep a raw-byte reader helper for verified legacy migration. **Reasoning:**
JSON accepts negative zero but browser serialization erases its sign, making a
valid source reject its own API lap and falsely collide during project import.
**Consequences:** Source data and telemetry remain unchanged. Historical references
can migrate when their supplied source or native source grid proves the old hash
and canonical identity. Lost sign information is not guessed; resampled grids
cannot prove an original source. Track-version reuse rules remain intact. See
SOURCE_IDENTITY.md for encoding, compatibility and regression evidence.

## 2026-09-10 — Validate the optimized seed before its speed envelope

**Decision:** Share one geometry check between the initial optimized seed and
refinement candidates. Reject nonfinite coordinates, collapsed/reversed source
progress and slope ratios above the existing limit, with small derived-roundoff
margins. Return an actionable 422 for an invalid seed; keep candidate rejection
accounting. **Reasoning:** Valid sources produced converged seeds at slope 0.345
or with -0.916 m forward progress while force checks could still pass. Source and
force validation do not establish the line's geometry domain. **Consequences:**
Some formerly returned laps are now refused. Users can explicitly choose the
validated centerline; the application retains completed work and pending inputs.
No implicit source repair or solver substitution is introduced. Mobile errors
give their text a full row above recovery controls. See LINE_GEOMETRY.md.

## 2026-09-10 — Resolve slope forces and preserve signed downhill braking

**Decision:** Use slope-normal weight in grip and rolling loss, horizontal projected
speed with horizontal curvature, and one signed lateral-acceleration array for the
envelope and telemetry. Keep road-normal aero and omit vertical/transient dynamics.
Allow negative net deceleration during backward propagation and check start-node
braking on accelerating descents too. **Reasoning:** Independent graded circular
ramps exposed a 9.18% lateral error and a converged lap with demand ratio 1.148551.
The old zero clamp and downstream-speed bisection bracket excluded the physically
required descending case. **Consequences:** Graded lap values change; flat analytic
cases remain stable. Existing convergence limits, minimum-speed floor and failed
force diagnostics remain explicit. Updated work/energy benchmarks and six ramp
cases cover the correction. See SIMULATION_MODEL.md and PHYSICS_BENCHMARKS.md for
equations, assumptions, sources and accuracy limits.

## 2026-09-10 — Project north from the actual camera and clear reset inertia

**Decision:** Replace the fixed compass rotation with the projection of track
north through the active camera quaternion. Reuse CameraRig's frame callback and
update only changed DOM angles/labels. Drain OrbitControls damping before fitting
or resetting. **Reasoning:** A fixed icon gives the wrong direction after orbiting
or entering chase. Real drag tests also exposed residual motion changing a reset
pose. **Consequences:** The indicator describes track-coordinate north and hides
when its screen projection is undefined. Project contents, simulation and the
shared clock are unchanged. Independent rotation checks and desktop/phone browser
journeys cover orientation and reset behavior; see CAMERA_FRAMING.md.

## 2026-09-09 — Fit and clip the viewer using accepted source extents

**Decision:** Extract camera-space source/road fitting and derive orbit limits,
near/far planes and perspective updates from the source and canvas dimensions.
Preserve existing camera directions, field of view, fit margin and chase telemetry.
**Reasoning:** A valid 28 km source rendered on desktop but disappeared on a phone
because its fitted camera lay beyond the fixed 12 km far plane. Horizontal-span
zoom limits also failed to guarantee a reachable fit for tall/narrow cases.
**Consequences:** Projection tests cover original road edges and full 3D extents;
browser framebuffer checks catch a blank rendered scene independently of visible
HTML labels. No input, solver, playback, asset or depth-test contract changes.
See CAMERA_FRAMING.md for the reproduction and scoped guarantees.

## 2026-09-09 — Inspect original source profiles independently of simulated laps

**Decision:** Derive elevation and conventional percent grade from every closed
source chord, with cumulative 3D source distance, raw ascent/descent, keyboard and
pointer inspection, and a full profile export. Reuse the plots/data in a settings
dialog and optional GPX review disclosure. **Reasoning:** Imported elevation should be visible
before interpreting model behavior; resampled simulation channels cannot explain
the original file on their own. **Consequences:** Source selection does not seek
playback or trigger calculation. Noise remains visible, with explicit raw-total
limits. Rise/horizontal run is named separately from the existing rise/3D-distance
solver slope; validation and dynamics are unchanged. The contact-report v1 format
is preserved, with a separate versioned profile artifact. An inline sidebar preview
was too narrow at 1280 px, so the settings launcher opens an 820 px bounded dialog.
Selection survives closure, and native Close/Escape returns focus to the launcher.
See SOURCE_PROFILES.md.

## 2026-09-09 — Review bounded GPX geometry before transactional activation

**Decision:** Accept one continuous GPX 1.1 circuit with complete elevations through
a local review dialog. Project WGS84 surface coordinates into the first point's
east/north frame, retain provided elevations independently, and expose width,
banking, sector and closure assumptions. Share JSON import's validated calculation
and activation path. **Alternatives:** Guess missing elevations, join arbitrary
segments, infer a road centerline from driving data, or persist a second GPX-based
runtime geometry. **Reasoning:** A useful geospatial entry point needs visible
assumptions and bounded behavior before the model can consume it. **Consequences:**
The subset excludes logger timing, multi-lap selection, geoid/ground-scale correction
and noise filtering. Imported source accuracy remains unverified. Projects keep
normalized Track geometry and provenance; the original file is retained separately
by its owner. Independent math and real-browser tests protect conversion, review,
failure/cancellation and persistence. See GPX_IMPORT.md for bounds and primary sources.
Geographic outputs canonicalize signed zero before becoming a Track. A southern-
hemisphere fixture exposed different local/server fingerprints when JSON converted
`-0` to `0`; normalization preserves source identity without changing numeric geometry.

## 2026-09-09 — Visible channel domains and shared zero guides

**Decision:** Add a compact scale column with rounded display-domain bounds and
zero guides for signed channel ranges. Use the existing full-lap/shared-reference
ranges and one value-to-row mapping. Keep scale text in HTML at a fixed readable
font size, aligned with the SVG through a common responsive height.
**Reasoning:** Moving cursor values alone do not explain the magnitude of a curve.
Sector zoom must preserve vertical comparability. **Consequences:** These labels
describe display bounds, not observed extrema. Large values use compact scientific
text with exact accessible labels and hover titles. Elevation zero remains the
source's vertical origin, whose datum may be unverified. Rendering moves into
`ChannelPlot`; the existing clock and canonical data remain authoritative.

## 2026-09-09 — Inspect sectors by changing the plot viewport

**Decision:** Share a current-lap sector selection between channel and time-delta
views. Clip existing full-lap paths with an SVG viewport and map pointer positions
back into the current clock. Preserve full-lap channel scales and playback duration.
**Alternative:** Rebuild separately resampled sector laps or seek automatically on
every range change. **Reasoning:** Inspection should preserve authoritative samples
and the selected cursor. **Consequences:** Explicit Inspect start pauses and seeks;
outside cursors are labelled and hidden rather than clamped to the visible edge.
New completed laps reset the view. Sector Analysis opens the matching graph range
and returns keyboard focus to its tab. See PLOT_INSPECTION.md.

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
