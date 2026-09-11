# Product presentation milestones

The September 11 user direction makes visual/product presentation the primary
sequence. The current solver is sufficient for the MVP. ROADMAP.md preserves
the sequence through source attribution, camera/speed, grounding/vehicles and UI.

## LAPTRIX Dev Track and playback clarity — 2026-09-11

The former Ardennes Development Circuit is now LAPTRIX Dev Track. Only its name
and the generator's name changed: every other JSON field is identical to the
preceding commit. The ID/file remain `ardennes-development`; source fingerprint is
`sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689`.
An old-name project resolves to the installed source without adding a duplicate.
Historical reference artifacts retain their recorded labels and results.

A 50 px footer shows current-lap speed in km/h, gear, elapsed/full time, playback
rate and ready/playing/paused/complete state. It consumes the existing canonical
Lap and PlaybackClock in an isolated subscriber. No additional clock, animation
scheduler, synthetic motion or scene geometry rebuild is introduced. Numerical
updates are not live announcements. Chase guidance describes actual follow
behavior; orbit/top retain drag and zoom instructions.

The complete quality gate passes: ESLint, Ruff, strict TypeScript, 257 TypeScript
tests, 146 Python tests (43.13 seconds) and production build. Entry JavaScript is
427.70 kB / 129.27 kB gzip; deferred viewer is 967.32 / 259.35 kB. Evidence:
`artifacts/presentation-playback-check.log`.

Fourteen existing browser regressions pass in the first run, covering framing,
fullscreen, keyboard and settled-render/buffer behavior. The two new journeys
initially read the range input's browser-quantized `.value` rather than React's
exact value attribute. Correcting the test oracle preserves the application code;
both final journeys pass in 11.1 seconds. They independently interpolate exported
telemetry at a gear boundary, inspect live/pause/rate/loop/finish/restart, compare
elapsed time to the transport, and retain the complete project, pending fuel21 and
reference with zero simulation requests. Evidence:
`presentation-playback-browser.log` and `presentation-playback-browser-final.log`.
All eight production browser journeys pass on the final build in 36.7 seconds
(`artifacts/presentation-playback-production.log`). Final changed-script lint and
strict typecheck also pass.

`node scripts/presentation-playback-qa.mjs` captures overview, top, chase and chase
fullscreen at 1600×1000, 1280×900, 390×844 and 780×390. All 16 states retain footer
values inside the strip, no horizontal overflow and no runtime errors. Desktop
overview, phone chase and short fullscreen scene screenshots were opened and
reviewed. Evidence: `artifacts/presentation-playback-qa.json`, corresponding log,
and `presentation-playback[-scene]-*.png`. The earlier four-size overview/top/chase
baseline is retained as `product-before-*`; the first capture needed an explicit
corner-overlay mount wait, which was a capture-timing issue, not a rendering defect.

These checks establish playback clarity and compatibility. The vehicle is still a
schematic enlarged mesh and the follow camera/context need the next milestones.
The development track remains available when the real showcase is added.

## Red Bull Ring GP showcase — 2026-09-11

Both circuits now coexist in the catalog. Red Bull Ring uses pinned OSM GP ways
and a licensed Steiermark terrain crop; complete licenses, source hashes, flight
epoch, geometry transformation and assumptions are in
[the source record](../data/sources/red-bull-ring/README.md). The original Dev Track
JSON is unchanged in this milestone. The new source fingerprint is
`sha256:6269176570597be6d70057566a045d193bdbc18f3e59db8cad141c33798c4118`.

The reconstruction has 720 points, a 4311.389 m 3D source length and 63.272 m of
elevation. It uses the clockwise GP route without motorcycle/pit branches, starts
at the mapped finish vertex and retains estimated 12 m width and sector thirds.
An initial 10 m height-filter sigma left a 27.1% grade near a short DGM dip; the
final 30 m spatial sigma smooths that feature while preserving the broad hills.
Its maximum 6.084 m height adjustment and 2010 data epoch remain explicit.
This is approximate terrain reconstruction, not a current road-surface survey.

Optional bounded attribution is carried in the track and new native/timing lap
metadata. It appears beside the viewer, in track inspection, in JSON exports and
in credited CSV ZIPs. The archives keep the numerical CSV intact and add text/JSON
source notices. fflate 0.8.3 is now a pinned direct dependency (previously transitive);
ZIP entries use STORE to avoid compression of the numerical tables. Source identity
excludes presentation metadata. New solver-source identity is
`sha256:5c41ae28ce7434eabb9a4d457c66233f29cd1e4d1ea6f8ab2043dddd69025e8f`
because the contract/output carries attribution; no equations changed.

The final full gate passes lint, Ruff, strict typecheck, **259 TypeScript tests and
152 Python tests (46.44 seconds)** plus build. New Python cases cover pinned bytes,
the closed GP chain, direction, both catalog sources, metadata/URLs and Formula/GT
solves. New TypeScript cases cover geometry identity and attributed portable
restoration. The offline importer reproduces both generated files exactly with
`--check`. Evidence: `artifacts/red-bull-ring-check-final.log`,
`red-bull-ring-python.log`, `red-bull-ring-reconstruction.log` and
`red-bull-ring-reproduce.log`. Entry JavaScript is 438.92 / 134.97 kB gzip;
deferred viewer is 967.84 / 259.53 kB.

Ten existing browser regressions pass, including project recovery, transactional
track activation, source isolation, comparison export and scene playback.
The first new browser run caught a Windows catalog decoding defect: implicit
system encoding garbled UTF-8 credits. Explicit UTF-8 catalog reads fix both track
and vehicle loading, with a Unicode regression assertion. A subsequent phone
fixture attempted the hidden desktop project-name field; it now uses the existing
Rename project dialog. All three final showcase journeys pass in 35.6 seconds.
They verify both tracks remain available, source/reference alignment, local save,
reload, portable restore and native/timing/CSV notices. Python's independent ZIP
reader verifies CRCs; every telemetry value and comparison timing row is retained.
Evidence: `red-bull-ring-browser.log`, `red-bull-ring-browser-final.log` and
`red-bull-ring-browser-release.log`. All **11 production journeys pass in 1.1
minutes**, including those three built-app showcase cases
(`artifacts/red-bull-ring-production.log`). Final changed-script lint/typecheck pass.

Visual QA uses `node scripts/presentation-playback-qa.mjs --showcase`: overview,
top, chase and chase fullscreen at 1600×1000, 1280×900, 390×844 and 780×390. All
16 states retain the readout and source credits within their viewer, with zero
horizontal overflow or runtime errors. Desktop overview, phone top and short
fullscreen screenshots were opened and reviewed. The GP plan is recognizable;
seven detected corner groups are explicitly labelled as detected rather than the
official ten turns. Evidence: `artifacts/red-bull-ring-qa.json`, corresponding log
and `red-bull-ring[-scene]-*.png`.

Camera distance, the schematic enlarged vehicle, ground materials and scene
context remain the next presentation targets. No calibration claim follows from
successful solves or the similarity of the reconstructed elevation range.

## Camera and vehicle presentation — 2026-09-11

The chase camera follows a physical distance along the canonical racing line,
with a lower position, fixed 55-degree field of view and a target weighted towards
the car. Original metre-scale Formula/GT bodywork replaces the threefold enlarged
boxes. Tapered surfaces, glazing, cockpit, wings, suspension, tyres and hubs improve
silhouette and material separation; wheels rotate by `distance / wheelRadius` and
front wheels use sampled steering. A subtle original procedural contact shade is
visual only. Small overview dots preserve locatability. The racing line now sits
0.08 m above the road display lift, below bodywork rather than through the car.

Initial chase screenshots exposed the line/body intersection and prompted the
road-level correction. A broader 64-pose renderer sweep then caught real clipping
at Red Bull Ring's tight turn on the phone (30% of the Formula lap): the initial
look-ahead target pointed too far through the turn. The new target blends 35%
towards the ahead sample from the car. An independent stadium fixture with
12/20/35 m hairpins fails before this correction and passes afterward. Finish
continuity, deterministic seeking, translation and three camera proportions also
pass. There is no history-dependent camera damping, additional playback clock,
camera shake or animated field of view.

The final complete quality gate passes lint, Ruff, strict TypeScript, **263
TypeScript tests**, **152 Python tests (39.90 seconds)** and production build.
Evidence: `artifacts/vehicle-camera-check-final.log`; the preceding initial gate
also passed 262/152. The entry bundle remains 438.92 / 134.97 kB gzip; the deferred
viewer is 972.75 / 261.13 kB. No solver or source-file change is part of this cycle.

All 27 initial browser regressions pass in 3.2 minutes: framing, fullscreen,
ghost labels, independent reference finish holding, north projection, full playback,
source inspection, embedded vehicle/project recovery and settled rendering.
The phone playback/idle journeys now emulate reduced motion. Idle checks still
require zero animation callbacks, zero WebGL draws and no buffer uploads/deletions
after pending setup or track-key edits. These runs include repairs for the four
outdated Red Bull Ring CI fixtures, retaining exact loaded source/catalog contents.
Evidence: `artifacts/vehicle-camera-browser.log`.

`node scripts/vehicle-motion-qa.mjs` reads the installed development Fiber renderer
without adding an application hook. All **64 final poses** pass across both
circuits, both vehicles, desktop/phone and eight positions per lap. Independent
interpolation of exported telemetry agrees with all four wheel rotations and
front steering; actual group scale is one, the field of view is 55 degrees and
every corner of the rendered body's world bounding box remains in the frustum.
It captures each view and records draw/triangle counts without claiming a frame-rate
guarantee. Evidence: `vehicle-motion-qa.json`, `vehicle-motion-final-qa.log` and
`vehicle-motion-*.png`. The failed initial records and actual cropped screenshot
remain under `vehicle-motion-initial-*`, `vehicle-motion-hairpin-before-*` and
`vehicle-camera-hairpin-before.png`. The repaired phone hairpin and Formula/GT
views on both sources were opened and reviewed. Curbs, surroundings and ground
materials continue directly in the next milestone.

After the hairpin correction, all seven affected camera/playback/idle browser
journeys pass again in 1.3 minutes (`vehicle-camera-browser-final.log`). The final
layout sweep captures 32 overview/top/chase/fullscreen states at 1600×1000,
1280×900, 390×844 and 780×390, using Formula on Red Bull Ring and GT on Dev Track.
Every readout and attribution strip stays contained, with no horizontal overflow
or runtime error. The desktop overview dot, phone hairpin, both body styles and
short fullscreen captures were opened and reviewed. Evidence:
`vehicle-camera-rbr-formula-qa.json`, `vehicle-camera-dev-gt-qa.json`, their logs
and corresponding scene PNGs. These are in addition to the 64 pose captures.
All 11 production browser journeys pass on the final build in 1.1 minutes
(`artifacts/vehicle-camera-production.log`), covering module/graphics recovery,
the real CSV worker and complete showcase persistence/licensing exports.

## Track grounding and road detail — 2026-09-11

The next milestone adds original static asphalt grain, warm shoulders, white edge
paint, alternating schematic curbs and a checker stripe at the source finish.
Grass aprons join the shoulders to the existing conservative terrain; original
trunks and muted crowns improve the tree silhouettes. All detail follows source
frames in metres. The Analysis Layers panel identifies the scenery as schematic.
The Dev Track and Red Bull Ring source JSON, fingerprints, solver and playback
remain unchanged. [TERRAIN.md](TERRAIN.md) specifies the dimensions, geometry
budget, approximation limits and resource ownership.

The full quality gate passes lint, Ruff, strict typecheck, **267 TypeScript tests**,
**152 Python tests (39.75 seconds)** and build. Four new independent cases check
asymmetric paint/curb placement, physical curb intervals, closed seams, upward
triangles, a finish stripe, an analytical ground plane and bounded 2,000-point
output. Ten browser regressions pass in 1.8 minutes, including sparse/sloped
terrain-on/off visibility, large imported camera framing, ghost labels, track-key
layouts and zero idle draws/callbacks/buffer replacement. Evidence:
`artifacts/track-grounding-check.log`, `track-grounding-unit.log` and
`track-grounding-browser.log`. Entry JavaScript is unchanged at 438.92 / 134.97 kB
gzip; deferred viewer is 976.55 / 262.47 kB.

The 64-pose camera/vehicle sweep passes again with the finished scenery on both
circuits and both vehicles, at desktop and phone sizes (`track-grounding-motion-qa`
JSON/log and corresponding PNGs). An additional 32 overview/top/chase/fullscreen
states use Formula on Red Bull Ring and GT on Dev Track at 1600×1000, 1280×900,
390×844 and 780×390. Readouts and credits remain contained with no horizontal
overflow or runtime errors. Evidence: `track-grounding-rbr-initial-qa.json`,
`track-grounding-dev-gt-qa.json` and corresponding logs/images. The RBR capture's
initial label identifies its first material pass, which was retained after review.
Desktop overview, the phone hairpin and finish stripe, a Dev Track hillside and
short fullscreen views were opened and reviewed. Detail provides scale cues;
terrain cuts and generic curb locations remain visible approximations.
All 11 production browser journeys pass in 1.1 minutes on the final build
(`artifacts/track-grounding-production.log`), including attributed circuit exports
and viewer/graphics recovery. Dashboard and in-viewer playback polish follow next.

## Viewer transport and dashboard polish — 2026-09-11

Play/pause, loop and lap-position controls now sit beside the viewer readout,
remaining available in native fullscreen. They call the same PlaybackClock as the
graph transport; both sliders and time displays update together. Active interval
loops display their exact bounds, and outside seeking keeps the existing full-lap
loop behavior. Desktop uses a horizontal footer; phone places the slider below
the controls and values. Larger result metadata and corner-table text, stronger
text contrast and slightly wider desktop side panels improve the hierarchy.
No result, source, reference, setup or saved-project contract changes.

The final full gate passes lint, Ruff, strict typecheck, **267 TypeScript tests**,
**152 Python tests (42.41 seconds)** and build (`artifacts/viewer-controls-check-final.log`).
The first run hit a five-second timeout in the near-30-km road test's deep recursive
typed-array comparison while browser checks were also running. Exact Buffer byte
equality replaces that assertion and the finite check uses the typed array directly;
all data is still compared, and no deadline or input size changed. The final
TypeScript suite completes in 2.75 seconds. Entry JavaScript is 438.95 / 134.98 kB
gzip; deferred viewer is 977.70 / 262.83 kB.

All **22 relevant browser journeys pass in 2.8 minutes**
(`artifacts/viewer-controls-browser.log`). Three new journeys at desktop, phone
and short landscape exercise actual fullscreen, native keyboard play and Home,
shared sliders/readouts, interval notices, outside seeks, pause, loop toggling,
non-looping completion and replay. They preserve the same Canvas and complete
project, pending fuel and reference with zero simulation requests. Phone uses
reduced motion. Existing keyboard, fullscreen recovery, scene telemetry, interval
loop, ghost-label and zero-idle-render/buffer checks also pass. The three new
journeys are included in the production suite.

Final visual QA captures 32 states using Formula on Red Bull Ring and GT on Dev
Track with an active interval loop: overview, top, chase and fullscreen at
1600×1000, 1280×900, 390×844 and 780×390. Every control, slider, loop notice and
numerical readout remains within its footer; source credits remain within the
viewer. There is no horizontal overflow or runtime error. The full desktop
dashboard, phone overview/chase and short fullscreen interval were opened and
reviewed. Evidence: `viewer-controls-rbr-final-qa.json`,
`viewer-controls-dev-gt-interval-qa.json`, corresponding logs and scene PNGs.
The initial 16 RBR captures are retained under `viewer-controls-rbr-initial-*`.
All **14 production journeys pass in 1.4 minutes** on the final build
(`artifacts/viewer-controls-production.log`). The preceding camera/vehicle and
grounding commits also pass their full remote CI runs, including all 137 existing
development journeys; see CI.md. The implemented presentation sequence retains
both source circuits and the engineering MVP without a merge to main.

## Continuous playback and portrait camera correction — 2026-09-11

Four uninterrupted normal-phone 1× laps retain the rendered body bounds on both
circuits with both cars: 5,096 observed frames, no offscreen bound and no runtime
error (`artifacts/continuous-chase-qa.json` and its log). Extending the same sweep
to portrait fullscreen found an out-of-frustum world box near the Red Bull Ring
hairpin. World boxes are conservative, so independent composited car-visible/
car-hidden screenshots were used to establish the visible problem: the GT body
touches the left canvas edge at 27.69 seconds, while Formula has just 14 px of
clearance at 21.92 seconds. Both initial pixel cases fail the 16 px margin check
(`portrait-chase-before.log`, `portrait-chase-gt-before.png`,
`portrait-chase-formula-before.png`). The GT screenshot was opened and reviewed.

Chase now retreats from its target along the same view ray when canvas aspect
is below 0.9. Bearing, fixed 55-degree field of view and telemetry remain unchanged.
Normal wider canvases retain their exact pose. One new analytical test protects
bearing, distance, deterministic seeks and invalid aspects; the existing three
stadium-hairpin fixtures now project all car corners at four aspects down to 0.3.
Two new browser journeys verify actual car-pixel margins at 390 and 320 px, native
fullscreen entry/exit, an unchanged paused cursor and zero new solves. These are
also part of the production suite. The screenshot comparison hides HTML overlays
and checks the composited canvas, independently of the camera helper.

The final complete quality gate passes lint, Ruff, strict typecheck, **268
TypeScript tests**, **152 Python tests (49.55 seconds)** and build
(`artifacts/portrait-chase-check-final.log`). All **18 relevant browser journeys
pass in 2.3 minutes** (`portrait-chase-browser-final.log`): new pixel checks,
fullscreen recovery/layout, north orientation, shared scene telemetry, viewer
transport and zero settled frames/draws/buffer replacement. Entry JavaScript is
unchanged at 438.95 / 134.98 kB gzip; deferred viewer is 977.90 / 262.90 kB.

The 320 px visual review also found elapsed time and the seek bar outside the
footer: the elapsed row extended 19 px beyond the fullscreen panel, and 35 px in
the normal panel (`compact-viewer-before.json`, log and 320 px screenshots).
At widths up to 360 px, playback now uses three rows with controls/state, values,
then scrubbing. Both updated portrait journeys pass in 13.9 seconds and protect
footer containment before/after fullscreen with no page overflow. They wait for
the real WebGL backing size, since CSS can resize before the canvas buffer.
The continuous and layout QA scripts use the same resize check; the layout script
adds `--compact` for 320/360 px. Final compact QA passes all eight overview/top/
chase/fullscreen states on Red Bull Ring with GT, retaining contained controls,
readouts and source credits and no runtime error or horizontal overflow.
The 320 px fullscreen screenshot was opened and reviewed. Evidence:
`portrait-compact-browser.log`, `portrait-compact-qa.log`,
`portrait-compact-final-qa.json` and corresponding PNGs in `artifacts/`.

After the compact correction, the complete quality gate passes again with 268
TypeScript tests and 152 Python tests in 41.67 seconds, plus lint, Ruff, strict
typecheck and build (`artifacts/portrait-viewer-check.log`). JavaScript sizes are
unchanged from the camera correction; CSS is 58.50 / 12.27 kB gzip.

The final uninterrupted portrait-fullscreen sweep passes all four 1× laps:
1,007 Formula and 1,267 GT frames on Red Bull Ring, plus 944 Formula and 1,175 GT
frames on Dev Track. All 4,393 observed world boxes remain inside the camera
frustum, with no runtime error; the largest absolute horizontal projection is
0.782126 (the frustum edge is 1). Combined with the unchanged normal-phone poses,
the eight complete laps cover 9,489 observed frames. Each finish and the time with
the widest projected box have a retained screenshot. Both Red Bull Ring hairpins
and both Dev Track corner screenshots were opened and reviewed. Evidence:
`continuous-fullscreen-qa.json`, `continuous-fullscreen-final.log` and corresponding
`continuous-fullscreen-*.png` files. This is camera containment evidence, not a
hardware frame-rate claim or proof of collision-free scenery on arbitrary imports.

All **16 production journeys pass in 1.5 minutes** on the final compact build
(`artifacts/portrait-viewer-production.log`). A further 16 final visual states
cover Formula on Red Bull Ring with an active sector loop at 1600×1000, 1280×900,
390×844 and 780×390. All controls, readouts and source credits remain contained;
there is no page overflow or runtime error. The full desktop dashboard and short
fullscreen capture were opened and reviewed. These join the eight compact states
for 24 final layout captures (`portrait-viewer-final-qa.json`,
`portrait-viewer-layout-qa.log` and matching PNGs). The working branch retains the
same source geometry, solver and project contracts throughout this continuation.
