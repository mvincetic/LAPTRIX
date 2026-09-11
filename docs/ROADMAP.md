# Roadmap

## Premium product phase — 2026-09-11

The technical MVP is sufficient. The next sequence improves the actual experience
of choosing a circuit, calculating a lap, watching its vehicle and interpreting
the result. The seven presentation milestones below are the starting baseline,
not the end of the product-quality phase. Retain both source tracks, their
identities, all engineering contracts and the single playback clock.

| Milestone | Product outcome and current state |
| --- | --- |
| V1 Playback clarity | Implemented: first Play finds the current car; explicit camera choices persist. Vehicle identities, follow, restart and rate stay with the viewer transport. |
| V2 Cameras and speed | Implemented: vehicle-mounted Formula/GT onboard views with deterministic seeking, fixed field of view and stable horizon. Grounded scale cues continue in V4. |
| V3 Track grounding | Implemented ahead of V2: closer terrain with conservative clearance, separate outside shoulders and render-only cross-sections that prevent coarse pavement from covering the canonical line. |
| V4 Surface and environment | Implemented: source-framed guardrails, supports and reflectors follow shoulder crests and exclude nearby roads. Final terrain/motion/production checks pass on both circuits/imports. |
| V5 UI clarity | Implemented: grouped lap overlays/environment, collapsed source inspection and bounded scrolling panels retain camera/playback access. All 48 visual states and 29 production journeys pass. Continue the workflow audit through showcase selection next. |
| V6 Dev Track presentation | Keep the fictional engineering track intentional, with restrained original trackside identity after grounding is stable. |
| V7 Showcase selection | Implemented: native source groups and compact provenance descriptions retain identity and import/restore behavior. Fifteen visual states and 30 production journeys pass; narrow/tablet headers remain aligned through loading and cancellation. The licensed Red Bull Ring data package is complete. |
| V8 Formula presentation | Implemented: original rounded body contours, sidepod/engine-cover silhouettes, tapered floor, shallow wings and tyre shoulders. Closed-surface/dimension tests, 128 final visual states and all 30 production journeys pass. |
| V9 GT presentation | Next vehicle slice: refine coupe proportions, wheel arches, cabin/roof surfaces and telemetry-driven brake lights. Preserve the physical profile, road frame and shared clock. |
| V10 Asset pipeline | Started in V4: actual original guardrail parameters, manifest, conventions and quality-gate validation. Authored vehicle assets, GLB export/optimization and broader validation remain. Use Blender only if locally useful. |
| V11 Lighting and materials | Polish one dry-day environment; prioritize vehicle shape, elevation and surface depth with bounded texture weight. |
| V12 Visual QA | Repeat actual desktop/laptop/narrow/fullscreen and playback inspection across both cars and circuits; keep reproducible critical captures. |
| V13 Performance | Verify scene resource counts, idle work, geometry reuse and responsive engineering interactions after richer visuals. |
| V14 Showcase stabilization | Resolve remaining presentation defects, repeat production regressions and retain documented source/asset limits. |

Reassess after every stable implementation/test/visual-QA/documentation/commit/push
cycle and continue directly. Do not add low-quality camera modes for checklist
coverage, broaden the solver, merge main, rewrite history or change repo settings.

The initial sequence has been grouped into vertical slices so the dashboard always
consumes genuine solver output. See DECISIONS.md for the ordering rationale.

## Product presentation priority — 2026-09-11

The current solver and engineering tools are technically sufficient for this MVP.
Primary work now shifts to visual fidelity and product presentation. Preserve the
existing development circuit, geometry, identity and saved-workspace compatibility;
present its current name as **LAPTRIX Dev Track**. Add **Red Bull Ring, Austria** as
the first real showcase circuit alongside it, using legally reusable source data
with checked-in attribution, licenses, derivation steps and approximation limits.
Do not replace the development track or imply official circuit/game assets.

The CSV worker cycle is complete: CI run 34566631109 passes both jobs, all 132
development journeys, eight production journeys and the complete quality gate.
Proceed through these
autonomous milestones, each with implementation, appropriate tests, actual visual
QA, documentation, a clean commit and working-branch push:

1. Establish the LAPTRIX Dev Track presentation and a desktop/phone/landscape visual
   baseline. Prioritize readable playback state, cleaner scene overlays and a
   coherent track/vehicle scale against the supplied interface reference.
   Implemented: preserved track identity and current-lap playback readout; camera
   motion and vehicle scale are delivered in milestone 3.
2. Source, attribute and bundle the Red Bull Ring showcase. Verify the complete GP
   layout, direction/start line, geometry and source limitations. Keep both tracks
   selectable and exercise activation, saved projects and reference isolation.
   Implemented: pinned OSM GP data, Steiermark
   terrain/flight epoch, reproducible transformation, visible/portable attribution.
   See data/sources/red-bull-ring/README.md.
3. Improve camera framing and follow behavior, speed perception and playback
   clarity using the existing telemetry and single clock. Verify pause/seek/rate,
   loops, camera transitions, reduced motion and responsive/fullscreen use.
   Implemented: deterministic distance-follow camera, fixed field of view, original
   metre-scale Formula/GT bodywork and telemetry-driven wheels. Road-edge context
   and materials are delivered in milestone 4; see PRODUCT_PRESENTATION.md.
4. Improve track grounding, materials, curbs, surroundings and vehicle presentation
   with original or appropriately licensed assets. Keep visual detail separate
   from source geometry and approximate physics; review close and overview views.
   Implemented: original asphalt/shoulder materials, edge paint, schematic curbs,
   finish stripe, grassy terrain connections and tree trunks. Source geometry
   and simulation remain unchanged. Dashboard/playback polish is delivered in 5.
5. Refine spacing, density, typography and information hierarchy across the
   dashboard, then repeat representative interaction and visual regressions.
   Implemented: in-viewer play/pause, loop and scrubbing, an active interval notice,
   responsive/fullscreen control layout and clearer result/table typography.
   Both transports retain the single clock and complete workspace. Final visual
   and interaction evidence is recorded in PRODUCT_PRESENTATION.md.
6. Follow continuous playback through both complete circuits and tall fullscreen
   views, correcting presentation regressions discovered by the visual checks.
   Implemented: viewport-aware chase distance fixes the clipped GT hairpin and
   improves Formula clearance in portrait fullscreen. Both cars have independent
   rendered-pixel checks at 390 and 320 px, alongside analytical framing and the
   existing clock/fullscreen/idle regressions. Compact playback rows retain every
   control and value at 320/360 px. The reproducible continuous-lap
   sweep records every rendered body projection; see CAMERA_FRAMING.md.
7. Keep overview annotations readable after the larger scene and vehicle changes.
   Implemented: sector badges avoid corner circles and controls, with leaders to
   their actual interval midpoints. One ordered layout pass gives selected event
   controls space before timing badges and ghost names. Narrow headings are more
   readable. See SECTOR_LABELS.md for placement, fallback and verification.

Continue directly into the next milestone after each stable cycle. Numerical fixes
remain eligible when required for correct product behavior; new solver expansion,
calibration studies and maximum comparison-export background work are secondary
backlog. Do not merge main, rewrite history or alter repository settings.

| Milestones | Current implementation |
| --- | --- |
| M0 Foundation | React/Vite + Python/FastAPI, reproducible installs, shared launcher, quality gates |
| M1 Track data | Validated local schema, original 720-sample circuit, SI units and derived frames |
| M2–M3 Procedural viewer | Indexed road mesh, synthetic terrain, interactive orbit/top views, layers |
| M4–M5 Racing line | Sparse bounded curvature approximation, convergence diagnostics, optional vehicle-aware lap-time refinement |
| M6–M8 Vehicle/speed/time | Synthetic Formula/GT profiles with provenance, periodic envelope, integrated lap time |
| M9–M10 Analysis/telemetry | Braking, turn-in, apex, throttle events; canonical closed-lap telemetry |
| M11–M13 Playback/dashboard | Ghost playback, seven synchronized plots, light engineering layout |
| M14–M15 Comparison | Corner inspection, sector reference deltas, explicit reference selection |
| M16 Audio | Original engine, harmonic, whine, wind and shift synthesis consumes playback telemetry |
| M17 Cameras | Orbit, top and telemetry chase implemented; broader cinematic modes deferred |
| M18 Model checks | Analytical circle and numerical invariants tested; real-world validation deferred |
| M19–M20 Stabilization | Browser regression, responsive QA, validated persistence, dependency audit, CI and documentation |

MVP+ already implemented: custom local track JSON import, local project save/restore,
and telemetry JSON/CSV export. They reuse existing contracts without new services.
The next solver milestone is also delivered: sparse curvature convergence through
the 2,000-point grid study, integrated braking/force checks, and opt-in 78-candidate
lap-time refinement with visible seed gains and exportable diagnostics.
Controlled source/5 m/3 m sampling, source-progress comparison across grids,
verified reference migration, and independent circle/power/rigid-transform
benchmarks are now implemented too. The source geometry remains unchanged.
The second vehicle milestone adds documented GT specification anchors, visible
assumptions, stricter drivetrain contracts and cross-vehicle references with
immutable result snapshots. A public 2D track dataset was evaluated; it does not
provide the independently documented elevation needed for a bundled 3D circuit.
Independent uphill/downhill work-balance and exported actuator-energy checks now
cover steep grades and both development profiles; see PHYSICS_BENCHMARKS.md.
Reference-file import now accepts native simulation exports and explicit external
timing data with units/provenance/source checks. Sector and corner comparisons
use matched physical intervals. Measured channel overlays and automatic logger
alignment remain separate future work; imported timing never fabricates channels.
A synchronized Time Delta view now retains both grids' breakpoints and supports
either horizontal axis, shared seeking, playback and reference changes.
Portable project files preserve names, selected setup, custom source and
references; the v1/v2 readers remain supported. Imports validate and recalculate
before activating state, and track-ID collisions preserve existing geometry.
A bounded aero study now compares five or six settings through the existing
solver, exposes progress and numerical eligibility, and applies only a selected
checked result. Stopping retains completed rows; references survive application.
Studies can now be exported with complete source inputs, every full result,
failed/unfinished states and timestamps. New laps identify the solver source and
numerical runtime. A bounded review of RACECAR, BETTY and Marzaglia is recorded in
CALIBRATION_DATA_EVALUATION.md; no suitable complete calibration/3D input was
established and no external dataset was copied.
The GT study subsequently exposed a coarse power-envelope interpolation error at
gear redlines. Exact per-gear evaluation now removes it, with breakpoint agreement
and independent integrated wheel-force checks across all five GT aero settings.
Track v2 now fixes timing gates to source positions across line/sampling changes.
Version 1 remains readable with its original distance semantics; portable imports
preserve that distinction and historical references compare at current gates.
The WebGL viewer now loads separately from the engineering workspace. Delayed or
failed downloads preserve simulation and telemetry; production-asset tests cover
the same recovery behavior as development modules.
Source geometry diagnostics now report projected crossing/touch/overlap pairs and
interpolated height gaps. The original-track diagram and report remain independent
of resampled lap geometry; complete counts survive a 100-pair detail cap.
Track imports and loaded-track selection now activate source/current/reference
together after successful calculation. Failures preserve complete exported project
contents; retries retain the intended target, and stale imports cannot add sources.
Ordinary runs and track/project imports now share explicit browser cancellation.
Cancel preserves completed data and pending setup edits, aborts active requests and
ignores late results. It does not claim to stop an already executing server worker.
The actions disclosure now supports predictable keyboard entry/exit and Escape,
with focus restoration after actions and no invisible backdrop tab stop. A bounded
default-screen audit checks accessible control names at desktop/mobile widths.
Viewer and telemetry tabs now share arrow/Home/End navigation, labelled panels and
visible focus. Camera/axis controls expose selected state; tab changes retain the
canvas, layer choices and playback position.
Cursor Data now offers exact seconds/metres entry and numerical channel values.
Inspect pauses and seeks the shared clock, invalid positions retain it, and draft
entry resets on axis/result changes. Legacy reserved vertical dynamics stay explicit.
Native references now support an optional second ghost with independent visibility
and vehicle snapshots. Both use shared elapsed time; a completed reference holds
its finish pose. Timing-only files remain comparisons without invented positions.

## Current cycle and secondary backlog

Complete CSV-worker validation and verify its remote CI, then begin the product
presentation sequence above. Comparison CSV and the allocation reduction pass all
preceding 128 development journeys remotely. Maximum comparison-report generation
still has measured synchronous cost and remains a documented secondary task.
Measured calibration and transient dynamics await independent benchmarks and
suitable sources; they do not lead the current MVP presentation sequence.

Browser workload profiling covers accepted near-5-MB imports and maximum comparison
grids at normal/synthetically slowed CPU. Replacing nested CSV pair arrays reduces
serialization cost while preserving rows and units. CSV parsing and conversion
now run in a file-owned worker; raw notes stay there, stale previews are invalidated,
and closing/replacing the review terminates work. Report generation remains
synchronous and measurable; see CSV_WORKLOADS.md for the follow-up priority.

Time Delta now exports flat CSV rows from the same full-lap comparison report.
Forty canonical-unit columns preserve independent times, deltas and paired channels,
with empty cells for unavailable data. JSON retains provenance/input snapshots.
Numerical checks cover units, full precision, known zeros and the maximum row grid;
desktop/phone browser exports retain the complete inspected workspace. See
COMPARISON_EXPORT.md.

The actions disclosure now fits beneath its actual opener and scrolls internally
on short screens. Native Tab navigation no longer moves the whole page to reach
the final action; resizing and wheel boundaries preserve the workspace. See
ACCESSIBILITY.md for measured bounds and the retained focus behavior.

Reviewed CSV timing now maps explicit time/source-progress columns and units into
the existing reference schema. Converted first/final records, duration, provenance
and source declaration are reviewed before activation. Original simulated examples
come from current telemetry. Local file ordering and shared generation checks
preserve the workspace through cancellation and superseding imports. No GPS
alignment or measured channels are inferred; see REFERENCE_IMPORT.md.

Synthetic terrain now interpolates full source segments and caps overlapping grid
cells beneath the road and shoulders. Width-aware tree clearance and final-grid
base heights retain usable close views on accepted sparse/sloped inputs. Eight
geometry tests, fourteen relevant browser journeys and thirty visual states cover
the correction. No source geometry or solver output changes; see TERRAIN.md.
The single earlier fuel observation remains recorded in VALIDATION.md; nine further
native-input sequences, including slowed runs, did not reproduce it.

The track key now collapses automatically in narrow or short scenes and retains
explicit choices across viewer transitions. Browser/visual QA confirms the observed
corner-1 obstruction is removed in those compact defaults, while expanded state
remains an optional overlay. Canonical marker positions and the same demand
renderer remain. See TRACK_KEY.md for thresholds and bounded evidence.
Shoulder width arrays now retain their identity until track data changes, removing
unchanged GPU buffer replacements after ordinary setup and viewer interactions.
The existing renderer and disposal path remain; see RENDERING.md.

Bounded vehicle JSON import/export is implemented through the existing solver and
cache. Activation is transactional; metadata, references, built-ins and pending edits
survive failures/cancellation. Local saves and portable v3 retain embedded profiles,
resolve collisions and preserve v1/v2 installed-profile rules. Declared parameters
and sources remain visibly unverified; see VEHICLE_PROFILES.md.
Project naming now works at every width through a native dialog with separate
drafts, explicit application and reliable return focus. It preserves simulation,
pending setup and playback, and uses the existing Save/export name contract.
Native-reference channel overlays now preserve both sampling grids and source
correspondence on current-lap axes. Optional dashed curves share channel scales
and R cursor readings; timing-only imports cannot acquire channels. Horizontal
tick and sector text retain their font size on narrow screens.
Sector-focused inspection now shares one range across channel and time-delta
plots, retaining canonical paths, scales and playback. Explicit actions inspect
the first gate or reset the full view. Outside cursors are labelled; successful
new results reset the selection. Desktop content sizing keeps playback reachable.
Channel scale limits and signed zero guides now expose the full-lap display domains
for current/native curves. Shared row geometry keeps labels aligned at desktop and
mobile widths, including sector windows and wrapped captions.
Reviewed GPX 1.1 import now converts one bounded circuit with complete elevations.
Users inspect its start, closure, dimensions and width assumptions before the
existing transactional pair solve. Failed runs retain the reviewed draft for retry;
local Save and portable projects preserve converted geometry and provenance.
Source elevation and conventional grade now use original closed chords, with raw
totals, exact segment inspection and complete profile exports. Settings open a
bounded dialog that preserves selection on closure; GPX review embeds the same
plots. Inspection preserves playback and project state, including after resampling.
See SOURCE_PROFILES.md for source-noise and slope-definition limits.
Camera fitting now includes source road edges and uses reachable zoom limits and
source-scaled clipping planes. A valid large source remains rendered on mobile;
independent projection and framebuffer checks cover fit/reset/resizing without
changing simulation or playback. See CAMERA_FRAMING.md.
The north arrow now projects track north through the actual camera, including
manual orbit and shared-clock chase. Reset drains residual orbit damping before
applying its fit. Direction labels are accessible, and camera actions retain the
complete workspace. See CAMERA_FRAMING.md for projection and reset evidence.
Slope-normal weight, projected horizontal speed and signed downhill braking now
use consistent quasi-steady equations. Six independent circular-ramp cases protect
the correction alongside updated uphill/downhill and actuator-work checks. An
adversarial sub-1 m/s case protects the braking bracket from increasing a lateral
cap and retains its failed force diagnostic. Flat analytic cases remain stable;
the current production sampling study reports the
changed graded laps and unchanged source identity. See PHYSICS_BENCHMARKS.md.
Initial optimized seeds and refinement candidates now share geometry-domain
checks. Unsupported slopes and reversed intervals fail before the speed envelope
with Centerline recovery advice. Actual API/browser tests preserve the complete
workspace on failure and recover the valid source; phone errors use a full text
row above their actions. See LINE_GEOMETRY.md.
Source fingerprints now encode exact zero consistently in Python and TypeScript,
retaining every other numeric bit and existing positive-zero hashes. Verified
legacy migration preserves timing/telemetry and avoids false project collisions;
missing sign information is not guessed. See SOURCE_IDENTITY.md.
Reference imports now check their own ordering and the workspace calculation
generation through file reads, hashes and errors. New imports, explicit reference
selection and calculations supersede older work without stale data or feedback.
Current failures retain retry, playback and completed reference data. Seven browser
cases cover delayed reads/hashes and newer choices; see REFERENCE_IMPORT.md.
Displayed comparison signs and tones now share their actual decimal precision.
Zero and missing differences are neutral, including percentage changes and whole
sub-resolution delta traces; meaningful gains/losses remain distinct. Full-precision
comparison data, trace paths, exports and aero ranking remain unchanged.
Device Save failures now offer Download project through the same portable writer
as the actions menu. Recovery retains completed results, pending setup, references,
playback and the previous device save. Successful Save clears only its storage
warning, leaving other failures' recovery actions available. See PROJECT_FILES.md.
Workspace errors now keep messages and recovery actions together. Audio startup
has its own explicit retry, reusing its context and preserving the project/clock.
Delayed successful audio activation retains newer unrelated errors. Separate engine
and workspace generations also reject obsolete success/failure after a newer
activation, mute or disposal; muted output and replacement contexts stay protected.
See AUDIO_ENGINE.md.
Quasi-steady crest/compression load now feeds tyre grip and total rolling loss in
every solver mode. An independent contact-speed cap also constrains straight crests.
Declared vertical/load telemetry, matching minima and exact cursor readouts preserve
legacy references without invented channels. Fourteen analytical Python cases and
both vehicles on source/5 m/3 m grids check the correction; see VERTICAL_LOAD.md.
Selected-corner event callouts now use screen-space placement and leader lines to
their unchanged telemetry anchors. Native buttons retain exact seeking while
camera/layer changes update the layout. See CORNER_CALLOUTS.md.
Loads & elevation now exposes seven whole-lap channels through the existing graph
renderer and clock. Native references share scales only for available channels;
legacy references keep five useful curves and explicitly omit undeclared load data.
Overview, sector ranges, axes and project contents retain their contracts. See
LOAD_GRAPHS.md for units, precision, guides and compatibility.
The original analytic elevation study now quantifies source-phase sensitivity in
30 centerline runs across both vehicles. Complete sources/results and independent
geometric checks show why numerical eligibility cannot establish elevation fidelity.
Production resampling cannot recover an absent wave; no smoothing or quality
threshold is introduced. See ELEVATION_SENSITIVITY.md.
Current-lap extrema now exposes exact sampled minima/maxima for tyre load and
vertical G in a collapsed disclosure. Inspect pauses at the original sample and
restores Full lap while retaining reference and project contents. See LOAD_EXTREMA.md.
The growing browser suite reached its 20-minute serial CI budget. Two isolated
runner shards now preserve complete coverage and per-test deadlines; successful
graph screenshots stay in visual QA. The first sharded run passed all 87 journeys
at `83c65ad`, plus quality and production gates; see CI.md.
The paused viewer now renders on demand after camera motion settles, waking through
the same playback clock and existing controls. Camera and ghost poses update before
HTML projection. Non-looping completion also always publishes its stopped state,
even inside the normal notification interval. See RENDERING.md.
Source profiles now include sampled vertical curvature, with signed compression/
crest values, exact point selection and full-precision SI exports. Independent
circle/aliasing checks and cross-language consistency retain the original geometry.
The scrollable dialog keeps Close available at phone and short-landscape sizes.
Browser graphics restoration now requests a redraw without replacing the canvas,
camera, project or clock. Repeated restoration passes at desktop/phone widths and
in production, with full project preservation and no additional solves.
Corner event windows now wrap across start/finish, preserving braking distances,
durations and source-aligned reference intervals. New results declare their closed
interval semantics, while historical unmarked estimates remain literal. Six
Formula/GT start-rotation checks preserve every detected event and lap time; the
independent interval fixture covers nonuniform samples and bounded braking.
Explicit sector loops now repeat telemetry through the same clock, independently
of plotted range. A pressed keyboard control and persistent strip identify the
active interval. Outside seeks restore full-lap looping, new Laps reset it, and
eight clock cases cover bounds, rate/remainder, reset and notification behavior.
Ghost names now avoid timing badges, event labels and controls, with leaders to
the actual rendered car anchors. End-of-frame placement handles remounted corner
portals after chase; paused zero-draw behavior and reference finish holding remain
covered. Sixteen visual states cover desktop, phone and short landscape.
Time Delta now exports full-lap comparisons on both source grids' union, retaining
each lap's times/distances, known channels, explicit units and original inputs.
Timing-only and historical load availability remain explicit. Eight report cases
cover independent interpolation, immutable snapshots and maximum input grids;
browser exports preserve sector/loop inspection and pending work at both widths.
The sector-loop fixture now observes two real near-boundary crossings without a
renderer-speed assumption; both cases pass with six-times CPU throttling.
The shared clock now sleeps while paused, cancels at reset/finish/last cleanup and
resumes with a fresh timestamp. Seven scheduling cases retain the delayed-frame
cap, rate, notification behavior and one chain across start owners. Desktop/phone
checks now require zero idle animation callbacks as well as zero WebGL draws.
Custom windows now clip both graph views to exact increasing current-lap times.
The editor validates before applying, preserves playback and source/native curves,
and maps the same positions across axes. Explicit Inspect start seeks the stored
time directly; Loop window reuses the existing clock interval. Six numerical cases
and desktop/phone browser journeys cover precision, recovery, looping and project
preservation. See CUSTOM_WINDOWS.md.
Fullscreen controls now follow actual browser transitions and show local recovery
for rejected or unavailable requests. Native entry/exit, external exit, obsolete
errors and short landscape sizing preserve the existing viewer, project and clock.
Seven fullscreen journeys join the existing rendering regressions. See FULLSCREEN.md.

## Stabilization evidence

The local numerical/API suite contains 152 passing tests, including coupled quadratic
oracles, grid convergence, refinement accounting, start/finish rotation and setup
extremes, source aliasing and analytical work/grip/contact benchmarks. The 280 TypeScript tests cover
geometry, source contacts, alignment, project/reference validation, comparison
eligibility, native channel plots/scales, sector viewport mapping, vehicle contracts,
ghost poses, local geographic conversion, source elevation/grade/curvature, camera projection,
north direction, verified signed-zero migration, display precision, optional load
contracts, corner-callout placement, load graph availability/scales and clock/data invariants.
One hundred and fifty-four browser journeys cover the
core workflow, refinement, resampling, cross-vehicle reference restore, imports,
audio, aero comparison application/failure/cancellation, viewer downloads, geometry
reports, failed/superseded track activation, calculation cancellation, keyboard actions/tabs,
precise cursor inspection, reference ghosts, embedded vehicle profiles, project naming,
native channel overlays, sector graph inspection, reviewed GPX import, source
profile inspection/export, large-track camera visibility, orbit/reset/chase north,
unsupported optimized-line recovery, signed-zero reference/project round trips,
ordering of delayed reference reads/hashes including asynchronous read rejection,
neutral displayed deltas with full-precision reference preservation,
device-storage and audio-start recovery, declared/legacy load telemetry, separate
corner event callouts through camera/layer changes, and the
optional structured-tool contract. Four viewer loading/restoration and four CSV
worker journeys also run against production assets, alongside three showcase
and three viewer-transport journeys plus two portrait-car pixel checks and four
sector-annotation, playback-entry and onboard journeys. See VALIDATION.md
for the final record. The first remote CI run passed on the working branch.

The scoped MVP and selected MVP+ extensions are implemented. Numerical accuracy
beyond the stated development model remains a next phase. No release to main or
public application deployment is performed.

No external credentials, paid services or proprietary assets are needed for the
current local MVP. Push only the working branch; never merge into main automatically.
