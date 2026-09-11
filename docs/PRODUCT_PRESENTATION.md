# Product presentation milestones

## Premium V16 — Current/reference clarity, 2026-09-11

The opaque reference could replace the current car's blue paint at coincident
positions. Reference materials now use 28% opacity, test scene depth without
writing it, and omit contact/cast/received shadows. The current car stays opaque.
Both vehicles retain their native telemetry, independent materials and shared
clock. No geometry, texture or animation callback is added; omitting the reference
contact shade removes one draw, two triangles and one small texture.

All 96 final camera states pass across both tracks, Formula/GT, 1600/1280/390 px
and four cameras (`reference-qa.json`). Native overlapping and separated laps
retain independently checked positions, resource identities and complete saved
workspaces. Actual Chase, Onboard and overview screenshots were inspected.
The compositor regression isolates blue car paint from the racing line, requires
over 90% retention through overlap, and verifies a visible reference alone.

The complete gate passes 311 TypeScript / 152 Python tests (46.67 seconds), six
asset validators, reproducible GLB export and lint/type/build checks
(`reference-complete-check.log`). All 20 final interaction journeys pass in 7.3
minutes (`reference-final-browser.log`), including independent reference vehicles,
GT lamps, labels, playback entry, onboard framing, shadow caching, complete-image
graphics restoration with both cars visible, and zero settled rendering.
See REFERENCE_PRESENTATION.md for the treatment and its transparency limits.

At the user's request to commit promptly, the broader 37-case production run is
still finishing. Both new reference-paint checks and both complete-image graphics
restoration checks have passed in that run. Its full result is not yet claimed;
the local log is `artifacts/reference-production.log` and the working-branch push
also runs the complete Linux workflow.

The preceding vegetation commit `fafc0eb` is green on Linux with 173 development
and 35 production journeys. A measured timing study now supports five development
shards plus separate production. Discovery verifies all 175 development cases
without duplicates or omissions; assertions, workers and deadlines are unchanged.
The latest user request closes this cycle and pauses before ground-material work.

## Premium V15 — Original instanced vegetation, 2026-09-11

Uniform scenery cones are replaced by original spruce foliage and tapered trunks.
The first layered solid-cone study looked ornamental, so the final package uses
one original generated bough, with its unchanged source and full prompt recorded
in the repository. Offline encoding produces an 89.3 KiB WebP; only that runtime
image ships. Nine irregular branch tiers and a textured interior preserve the
former tree envelope, deterministic sites and road exclusions. Two draw batches,
the same source geometry and the shared playback clock remain. See FOLIAGE.md.

The first 48-camera review found flat dark interior facets in close views. A dense
needle patch and softer canopy normals resolve those facets without adding
triangles or textures. All 48 final views pass across both circuits at 1600, 1280
and 390 px, including four close angles (`foliage-final-qa.json`). Geometry and
texture identities stay stable; maximum culling-bound overflow is floating-point
roundoff below 0.001 m, with no page overflow or browser errors. The same placement
also passes 52 onboard captures across both cars and circuits
(`foliage-onboard-qa.json`).

The crown uses 348 triangles and each tapered trunk 28. There are still 383 Dev
Track trees and 474 Red Bull Ring trees. Matched paused Formula Chase captures
retain 74 / 70 draws and submit 263,812 / 279,146 triangles respectively, increases
of 127,922 / 158,316 from daylight's cone baseline. Tree geometry plus current
instance arrays total 81,988 / 94,728 bytes. One additional texture makes ten
textures in driving views and eleven in overview views. No tree shadow, frame
callback, time source or camera-facing update is added; these resource counts
are not hardware frame-rate claims.

The complete final gate passes 311 TypeScript / 152 Python tests (44.15 seconds),
six asset validators, reproducible GLB export and lint/type/build checks
(`foliage-complete-check.log`). Entry JavaScript stays 441.35 / 135.96 kB gzip,
viewer code is 1,007.46 / 272.53 kB, GLB loader 45.20 / 13.46 kB and CSS
60.84 / 12.70 kB. A local WebP re-export matches the checked-in bytes. List-only
discovery finds all 173 development journeys without a duplicate or omission.
The daylight follow-up is green, but its first development shard consumed 19.4 of
20 minutes. Four development shards now reserve headroom for the richer scene;
final discovery records 50 / 38 / 42 / 43 cases. Production remains separate,
with unchanged assertions, worker counts and deadlines.

The six final continuous onboard sequences pass at 1× playback, including both
vehicle categories and portrait fullscreen on Red Bull Ring. They record 265
rendered frames with zero world-anchor drift and visible forward parallax
(`foliage-final-motion-qa.json`). All 28 final development interaction journeys
pass in 7.8 minutes (`foliage-final-browser.log`), including optional texture and
GLB recovery, source switching, both complete-image graphics restorations,
fullscreen, close vehicle framing, layer reachability and empty-queue idle checks.
All 35 production journeys pass in 9.0 minutes (`foliage-production.log`), including
visible texture retry, both source/export licence paths, paused graphics recovery,
worker cancellation and bundled/fallback header rendering. The distribution
contains the 91,404-byte WebP and excludes the original PNG. Continue into the
current/reference overlap review after committing and pushing this milestone.

## Premium V11 — Original daylight, material depth and stable camera decay, 2026-09-11

The authored daylight environment gives the rounded bodywork and glazing sky/
ground reflections, while a fixed world sun casts the current vehicle's shadow
onto the actual road. Its 1024² map covers 24×24 m around the real playback car,
with no circuit-sized shadow allocation or additional lap clock. Current/reference
dimensions, telemetry, source identity and pending workspace remain authoritative.
The original analytic sky uses 128 KiB of CPU radiance data and no downloaded HDRI;
its recipe and resource constraints join the asset manifest. See DAYLIGHT.md.

Two initial 24-capture comparisons (`daylight-probe.json`,
`daylight-shadow-probe.json`) showed that hemisphere fill alone added little depth.
Closer reflection/shadow views clearly resolved body contours and road contact.
The implemented first 12 detail views pass (`daylight-first-qa.json`), with no
geometry changes. Unit checks independently cover radiance bounds, world sun
orientation, the texture seam, translation-invariant shadow projection and equal
camera decay across different frame intervals.

Both shadow/resource journeys and both existing graphics-restoration journeys
passed, but desktop idle failed after an orbit drag (`daylight-browser-first.log`).
The failure repeated without parallel gate work (`daylight-recovery-first.log`).
Actual frame traces reproduced the tail with reflections removed, shadows removed
and both new lighting features disabled. Remaining invalidations came from the
controls' fixed per-frame decay, with late frames hundreds of milliseconds apart.
The shader-only timing probe did not establish a material rendering penalty and
is not used as a frame-rate claim. No lighting reduction was adopted from it.

Camera decay now preserves 0.12 at 60 Hz using elapsed renderer-frame time after
release. Active gestures retain their established input response. The idle test
requires an empty animation queue before its unchanged zero-draw/zero-callback/
buffer-retention assertions. All six corrected journeys pass in 2.0 minutes
(`daylight-browser-corrected.log`): both cars/circuits retain exact sun targets,
shadow/environment resources, camera/seek/playback state, full project exports and
pending edits. Paused camera changes perform no new shadow pass. Complete compositor
images also survive two graphics losses on desktop Formula and phone GT, without
a click to repair the view. A separate zero-time circuit-switch check then
reproduced a stale shadow target (`daylight-source-red.log`): the reused group and
unchanged clock did not reposition a dirty map. Invalidated maps now refresh their
anchor as well as their contents. Both source-switch journeys pass in 40.6 seconds
(`daylight-source-green.log`). The final complete gate passes 309 TypeScript /
152 Python tests (44.62 seconds), five asset validators, reproducible GLB export,
lint/type/build checks (`daylight-complete-check.log`). Entry JavaScript is
441.35 / 135.96 kB gzip, viewer 1,004.62 / 271.33 kB, lazy GLB loader 45.20 / 13.46
kB and CSS 60.84 / 12.70 kB.

All 128 final visual states pass: 12 close vehicle details, 52 onboard views and
64 sampled camera/motion states (`daylight-final-shape-qa.json`,
`daylight-final-onboard-qa.json`, `daylight-final-motion-qa.json`). The onboard QA
selector was scoped to playback identities after it inadvertently included hidden
Ghost Car tool labels sharing the same CSS class; failure metrics are now saved
before assertions. Its original size, sightline, horizon and tree-bound checks
remain. Reviewed GT rear/Formula side details show material highlights and cast
shadows; phone fullscreen and laptop onboard images retain forward road sight and
reachable controls. The final orbit trace records 16 post-release renders, the
last at 1.894 seconds, then no further render through the 3.5-second observation
(`daylight-idle-final.json`). This is a settling observation, not a hardware FPS claim.

A single-car scene retains nine textures in driving views and ten with overview
apex points, including the original environment and cached GPU maps. Vehicle
geometry is unchanged. A dirty shadow pass adds at most 56 / 5,406 Formula draws /
triangles or 47 / 4,910 GT draws / triangles; paused camera changes add none.
Matched paused Chase still uses 74 / 135,890 for Dev Formula, 65 / 135,394 for Dev
GT, 70 / 120,830 for Red Bull Ring Formula and 61 / 120,334 for Red Bull Ring GT.
All 24 final combined interaction journeys pass in 5.6 minutes
(`daylight-final-browser.log`), including GT brake telemetry, all fullscreen
recovery paths, source switching, asset retry, empty-queue idle behavior and
graphics restoration. All 34 production journeys pass on the final distribution
in 6.3 minutes (`daylight-production.log`), including both complete-image graphics
recovery cases. Continue directly into original vegetation presentation.

## Premium V6/V10 — Dev Track start identity and static asset pipeline, 2026-09-11

Two original signs now frame the Dev Track's existing timing stripe. The editable
mesh source exports to a real GLB, with three merged material batches, lazy local
loading and instancing. Original polygonal lettering avoids a font or texture
dependency. Source fingerprints select the site metadata, leaving Red Bull Ring
and unrelated imports free of fictional Dev Track signs. See ASSET_PIPELINE.md.

The first outside-barrier sites failed the one-metre foundation guard: exact
apron contact required 1.74–1.90 m pedestals (`pylon-placement-first.log`,
`pylon-foundation-probe.log`). Narrowing the model and placing it on the shoulder
retains road clearance and yields 0.376/0.382 m foundations. Surface triangles are
clipped against each footprint, including interior extrema, rather than moving
the track or using a centre-only ground sample. Six unit cases cover physical
identity, geometry/paint visibility from both sides, exact plane/extremum bounds,
unsupported/unsafe omission and 180 independent ground rays at native/90 km
translated coordinates (`pylon-unit.log`). Source and surface arrays remain intact.

Both native asset journeys pass in 30 seconds (`pylon-browser-first.log`), covering
four cameras, two instances per batch, metre scale, retained geometry through
environment/circuit switches, playback and complete project/pending-edit retention.
The phone case injects a 503 for the optional GLB and retries through Environment.
The independent compositor recovery journey passes in 9.1 seconds
(`pylon-delivery-first.log`) and is included in the production configuration.

All 60 camera and sign views pass on both circuits/cars at
1600/1280/390 px (`pylon-first-qa.json`): four cameras plus both close sign faces
on Dev Track. Reviewed desktop Chase and phone detail images show readable signs
and small grounded bases. Dev Track adds four draw batches and 796 triangles:
Formula 74 / 135,890, GT 65 / 135,394. Red Bull Ring retains Formula 70 / 120,830
and GT 61 / 120,334. Driving cameras retain four textures; Orbit/Top use five
including the existing apex dot. These are resource counts, not frame-rate claims.

The complete gate passes 306 TypeScript / 152 Python tests (49.40 seconds), all
lint/asset/type/build checks and byte-for-byte GLB reproducibility (`pylon-check.log`).
The GLB is 22,528 bytes; its lazy loader is 45.20 / 13.46 kB gzip. Entry JavaScript
is 441.35 / 135.95 kB, viewer 1,001.42 / 270.26 kB, and CSS 60.84 / 12.70 kB.
All 45 terrain states pass, including 9,618 road-visibility probes with no scenery
occlusion or runtime error (`pylon-terrain-qa.json`). The six continuous 1× motion
sequences pass across both circuits/cars, including portrait fullscreen: 307 real
frames and zero world-anchor drift (`pylon-motion-qa.json`). Reviewed Onboard
captures retain a clear forward road view. All 15 final interaction journeys pass
in 3.3 minutes (`pylon-browser.log`), including idle drawing and graphics-context
restoration. All 32 production journeys pass on the final distribution in 4.5
minutes (`pylon-production.log`), including the optional asset failure/retry and
composited-pixel recovery check. Continue into daylight lighting and materials.

## Premium annotation follow-up — Close Orbit apex scale, 2026-09-11

The close GT lamp views exposed eight-metre green apex spheres that dominated
the vehicle. A composited-pixel regression reproduced 85 px on Dev Track desktop
and 89.5 px on Red Bull Ring phone (`apex-before.log`). The replacement uses one
static Points batch and an original circle texture, with eight-CSS-pixel size
handled by Three rather than a camera/frame callback. The native apex x/z and lap
remain intact; the rendered anchor is source y + 0.70 m, just above the road/line.
Driving cameras still hide apex annotations, and the existing layer control
retains its meaning. See RENDERING.md for depth and resource choices.

The expanded pixel journeys pass at three zoom distances on desktop DPR 1 and
phone DPR 2. They inspect every source anchor, retain geometry through camera
zoom, toggle the actual layer, switch all four cameras and exercise play/pause.
The complete exported project, pending fuel and paused cursor survive without
new simulation requests. Clean close and Top screenshots were opened and reviewed;
the green point stays small and readable without obscuring the road.

The overview sweep then found a separate crowded state: selecting Red Bull Ring
corner 3 and opening Ghost Car at 320 px omitted every sector badge. The captured
rectangles show zero overlap and no runtime error; the panel simply consumed the
remaining placement space (`apex-tools-probe-qa.json`, failed PNG). Its redundant
three-line implementation note is replaced by blue/grey dots next to the existing
checkbox labels. Reference identity and the shared-start/finish explanation remain.
All three sector badges now fit in that exact state (`apex-tools-fixed-qa.json`,
reviewed PNG). The production sector journey now exercises this combination.
The QA script also preserves measurements and a screenshot before reporting a
layout failure, making future failures reviewable without repeating the sweep.

The final complete gate passes 300 TypeScript / 152 Python tests (67.07 seconds),
lint/Ruff/three asset validators/typecheck and build (`apex-final-check.log`). Entry
JavaScript remains 441.34 / 135.95 kB gzip and CSS 60.84 / 12.70 kB; the deferred
viewer is 996.45 / 268.33 kB. All 40 final overview states pass at 1600/1280/390/320
px on both circuits, with every sector badge visible, zero overlap, no overflow
and no runtime error (`apex-final-overview-qa.json`). The six final GT close views
also pass (`apex-gt-detail-qa.json`); the reviewed rear capture directly resolves
the original green-sphere defect. Orbit uses five textures including the circle;
Chase/Onboard retain four. Together with the 14 zoom/camera pixel-journey captures,
these provide 60 final visual states. All 17 annotation/layer/reference/idle journeys
pass in 4.0 minutes (`apex-final-browser.log`), including the newly guarded narrow
ghost-panel state. All 31 production journeys pass in 4.4 minutes against the final
build (`apex-production.log`). Continue directly into the Dev Track's original
start-area identity and reusable asset export/loading work.

## Premium phase V9 — Original GT coupe surfaces, 2026-09-11

The V8 close-view baseline showed a rectangular GT shell, broad floor and dark
box-shaped cabin. The new original package adds rounded body stations, wheel wells,
a narrower central floor, separate splitters and a shaped rear wing. A continuous
painted cabin now forms the roof and pillars around six fitted glass panels.
Two rear lamps brighten with their own lap's authoritative brake demand.
Physics dimensions, parent road pose, wheel pivots, steering and the clock remain
unchanged. All three original packages have manifest/parameter validation.

The first six real close views (`gt-first-qa.json`) exposed detached-looking cabin
trim. Replacing trim with fitted glazing improved the actual front/side/rear views
(`gt-glass-qa.json`). The glass-join regression then reproduced 16 disconnected
facets where six continuous windows were intended (`gt-geometry-first.log`).
Shared offsets fix the joins; all seven Formula/GT geometry cases now pass
(`gt-geometry-final.log`). Four new GT cases cover closed oriented surfaces,
external-facing caps/sides, profile bounds, 1,536 tyre-clearance probes and six
connected windows. The original Formula helper is shared unchanged by these tests.

A live-preview hot reload retained the earlier motion-ref shape while the new
brake lamps mounted, causing repeated frame errors and an unresponsive Vite
process. The transition now tolerates the earlier object, and restarting the
local launcher restores normal requests. Fresh close-view sessions have no
runtime errors. Development output is redirected to `artifacts/dev-gt.log`.
The two brake journeys verify separate current/reference demand, seeking,
camera changes and retained material/geometry identities (`gt-brakes-final.log`,
27.7 seconds). Their fixture explicitly pins a GT reference before changing the
current setup, respecting the existing cross-vehicle reference behavior; slider
input follows the real 0.01-second control step. Live play/pause coverage has been
added for the final broader run.

All twelve final Formula/GT close views pass on both circuits
(`gt-final-shape-qa.json`). Reviewed images show continuous cabin/glass joins,
rounded wheel arches and preserved category identity. Formula remains 57 body
meshes / 5,408 triangles; GT changes from 41 / 2,930 to 48 / 4,912. Both retain
four scene textures. The complete gate passes 300 TypeScript / 152 Python tests
(55.54 seconds), all lint/type/asset checks and build (`gt-check.log`). Entry
JavaScript stays 441.34 / 135.95 kB gzip, viewer JavaScript is 995.72 / 268.18 kB,
and CSS remains 60.84 / 12.70 kB.

All 52 Onboard states pass at 1600/1280/390 px, including phone fullscreen
(`gt-onboard-qa.json`); reviewed laptop and fullscreen GT views retain the forward
road sightline above the body. All 64 sampled Chase states pass both vehicles,
circuits and desktop/phone widths (`gt-motion-qa.json`), preserving source pose,
distance/radius wheel spin, front steering and projected bounds. Matched scene
draws remain 70 for Formula and rise from 54 to 61 for GT. Dev Track submits
135,094 / 134,598 triangles; Red Bull Ring 120,830 / 120,334. These are resource
counts rather than hardware frame-rate claims.

Twelve closer coast/peak-brake captures on both circuits pass
(`gt-lamps-coast-qa.json`, `gt-lamps-peak-qa.json`). Actual rear images show subdued
running lamps and a clear increase during braking. `vehicle-shape-qa.mjs` now
supports `QA_DETAIL=1` and `QA_BRAKE=coast|peak`, selecting real lap samples through
the normal viewer slider. No application camera or telemetry hook is added.
This completes 140 final close/Onboard/Chase/lamp-detail visual states. The 21-case
vehicle browser suite passes in 4.3 minutes, including live play/pause lamp synchronization,
cross-vehicle reference ghosts, custom profile failures/cancellation/save/restore,
portrait body pixels and zero settled drawing/RAF (`gt-browser.log`). Final lint
and typecheck also pass after adding live playback coverage. The 31 production
journeys pass in 4.3 minutes (`gt-production.log`). This completes the GT slice;
continue directly into the close-Orbit apex annotation follow-up.

The closer peak-brake Orbit capture also makes an existing annotation problem
clear: each apex marker is an eight-metre sphere and can dominate a close view.
Driving views already hide these markers. Queue a separate immediate follow-up
to keep the analysis point readable at close Orbit scales without changing its
source position or lap. Then continue the Dev Track/asset-pipeline work.

## Premium phase V5 follow-up — Telemetry tick readability, 2026-09-11

The font review exposed a 2.59 px overlap between adjacent distance labels in the
320 px channel plot (`plot-ticks-before.log`, before PNG). The shared tick row now
measures its rendered labels and leaves a six-pixel gap, omitting crowded interior
labels while retaining their original source positions and formatting. The right
endpoint has priority; both endpoints remain wherever they fit. All six candidate
values and their full-precision titles stay in the DOM, with hidden labels excluded
from accessibility output. Curve geometry, scales, inspection coordinates and
exports are unchanged. Time Delta uses the same source-fraction positioning and
label policy.

Resize/font/label changes update visibility through a bounded ResizeObserver;
ordinary playback does not schedule label measurements. Hidden labels retain
measurable dimensions. Three numerical cases cover readable intervals, endpoint
reservation, wider precision, empty/narrow layouts and immutable inputs. The first
actual narrow browser reproduction passes after the change (`plot-ticks-after.log`),
and the before/after telemetry images were opened and reviewed.

The 0.0015-second window exposed a separate SVG paint stall: an axis-switch click
took 49.9 seconds with full-lap dashed paths transformed far beyond the viewport.
Constraining horizontal guides alone did not fix it; temporarily removing reference
dashes reduced the same interactions to 0.16–0.25 seconds. The final implementation
retains dashes, bounds horizontal guides to the view and clips only the reference
paint segments before SVG stroke generation. The original rounded vertices,
straight interpolation, vertical gear knots and data gaps are preserved. Full-lap
paths and readout eligibility remain intact; no source samples are resampled.
Clipped paths are memoized by source/axis/window, independently of playback.

Three segment-clipping cases and one telemetry-pipeline case verify crossings,
reverse/vertical segments, tiny unrounded endpoints, missing-data gaps and held
gear values. Browser-native SVG geometry checks compare the clipped reference
against the original path. Current paths still retain exact `d` values across
window selection. The expanded 18-state tick journey passes in 20.4 seconds
(`axis-clipped.log`), including desktop/phone, both axes and all three graph groups
under a 0.0015-second window. All nine final graph/reference/window/idle journeys
pass in 2.8 minutes (`axis-final-browser.log`); the tick case takes 17.6 seconds.
The complete quality gate passes 296 TypeScript / 152 Python tests (110.61 seconds),
lint, Ruff, both original assets, typecheck and build (`axis-final-check.log`).
Entry JavaScript is 441.34 / 135.95 kB gzip, viewer JavaScript remains 991.27 /
266.71 kB, and CSS is 60.84 / 12.70 kB. All eight native-scrollbar dashboards pass
on both circuits at 1600/1280/390/320 px (`axis-layout-qa.json`, 24 captures).
Desktop/laptop/phone dashboard and telemetry captures were opened and inspected;
panels and tick labels fit the usable width, including the native scrollbar.
Only the existing Three.js Clock deprecation remains. All 31 production journeys
pass in 4.3 minutes (`axis-production.log`), including the tiny-window journey in
14.4 seconds and loaded/fallback header metrics. The 26 final graph/dashboard
states complete this follow-up. Continue directly with V9 GT bodywork.

## Premium phase V8 — Original Formula contours, 2026-09-11

The real close-view baseline exposed flat rectangular bodywork and a broad floor
under the front suspension (`vehicle-shape-before-qa.json`, 12 captures). The
original Formula now has rounded chassis, sidepod and engine-cover sections,
a forward-tapered floor and shallow shaped wing planes. Smooth tyre shoulders
retain the exact rolling radius/width for both vehicles. GT bodywork remains a
separate closed coupe. No physics profile, source, parent pose or wheel pivot
changes; native reference paint retains grey. See VEHICLE_ASSETS.md.

The manifest registers authored Formula parameters alongside the guardrail.
Validation checks ordered/bounded stations and convex cross-sections. Three
numerical tests verify closed oriented triangle surfaces, six independent
raycast directions, body bounds at several profile scales and exact tyre
radius/contact/width. The tighter manifold check also passes separately after
requiring exactly two opposite faces per edge.

Twelve final close views were captured on both circuits for both vehicles
(`formula-final-shape-qa.json`); front, rear and side images were opened against
the baseline. Formula body mesh count stays 57, while triangles rise from 3,038
to 5,408. GT stays at 41 body meshes and rises from 1,266 to 2,930 triangles from
the shared tyre change. The inspected scene retains four textures. No runtime
errors occur; the existing renderer dependency's Clock deprecation is unchanged.
All 52 Onboard states pass across both cars/circuits at 1600, 1280 and 390 px,
including phone fullscreen (`formula-onboard-qa.json`). The new Formula nose and
exposed suspension remain below the forward sightline in reviewed laptop/phone
images. The models remain simplified original art, with further GT refinement
and the authored-asset pipeline continuing in subsequent milestones.

All 64 sampled Chase poses pass exact wheel-distance/steering and projected-bound
checks across both cars/circuits at 1600 and 390 px (`formula-motion-qa.json`).
Matched first frames retain 70 Formula / 54 GT draws: Dev Track submits 135,094 /
132,616 triangles and Red Bull Ring 120,830 / 118,352. These counts measure browser
scene complexity, not hardware frame rate. The complete gate passes lint, Ruff,
both asset packages, typecheck, 289 TypeScript / 152 Python tests (86.94 seconds)
and build (`formula-check.log`). Entry JavaScript stays 439.43 / 135.12 kB gzip,
viewer JavaScript is 991.27 / 266.71 kB, and CSS remains 60.74 / 12.71 kB.
All 19 focused browser journeys pass in 3.5 minutes (`formula-browser.log`):
Onboard sightlines, portrait Chase pixels, native cross-vehicle ghosts, custom
profile activation/failure/cancellation, save/restore and demand rendering.
Both settled-viewer cases retain GPU buffers through pending setup edits and
return to zero draws/animation callbacks after playback or camera movement.
All 30 production journeys pass in 3.7 minutes (`formula-production.log`). This
completes 128 final close/Onboard/Chase visual states for the original Formula
surface pass. The subsequent CI-discovered font-family/header correction is
verified separately before the next working-branch push.

## Premium phase V7 — Track-selection clarity, 2026-09-11

The native selector now groups Development Tracks, Real Circuits and Imported
Tracks while retaining existing IDs, names and activation behavior. A compact
description identifies the currently installed source as Development, Real ·
approximate or Imported · unverified. The existing custom-source registry takes
precedence over self-declared synthetic flags. Country/provenance remain in the
description's title and full source details; the licensed Red Bull Ring package
and LAPTRIX Dev Track geometry remain unchanged.

The first 12 selector/playback captures cover three origins at 1600, 1280, 390 and
320 px, including keyboard selection across native groups and a long imported
name. All status labels fit and playback works. Actual header review exposed an
existing wordmark overlap at 320 px with native scrollbars: an independent text
range measured 120.48 square CSS pixels under the actions. Intrinsic brand width,
compact Run/Cancel/Loading labels with full accessible names, and an eight-pixel
column gap correct it. The loading-state review also caught a one-row wrap, now
fixed and verified alongside ready/cancel states. Before/after header PNGs were
opened and reviewed (`track-select-compact-before.log`, `track-select-states.log`).

Seven source activation, import-failure and showcase restoration journeys pass
in 1.4 minutes. Both portable-project journeys pass in 26.3 seconds and preserve
the imported group through fresh-page import and saved reload. Three cancellation
journeys pass; the new compact-header journey passes in 7.0 seconds and also runs
against production. Evidence is in `selection-browser.log`, `selection-project.log`
and `selection-compact-cancel.log`. The latter retains the initial loading-wrap
failure; `track-select-states.log` verifies the corrected complete state sequence.

The full gate passes 286 TypeScript / 152 Python tests (80.20 seconds), lint, Ruff,
asset validation, typecheck and build (`selection-check.log`). Ten final keyboard,
project, cancellation and compact-header journeys pass in 1.3 minutes, giving
17 distinct local integration journeys. The first complete production suite passes
all 30 journeys in 3.7 minutes (`selection-production.log`). The final review then
extended to the tablet boundary and reproduced a row split at 700 px: Track could
share the action row while Car profile moved below it. The brand now combines its
intrinsic minimum with a preferred width that reserves the first row. The expanded
loading/ready/cancel regression passes both widths in 9.4 seconds, and the tablet
before/after captures were reviewed (`track-select-tablet-{before,after}.log`).

The completed 15-state sweep repeats three source origins at 1600, 1280, 700,
390 and 320 px with native scrollbars (`selection-complete-qa.json`, 30 PNGs).
Every field stays aligned, each source description fits, actual wordmark/action
overlap is zero and playback advances from the same clock. Final tablet, narrow
import and laptop playback images were opened and reviewed. No runtime errors
occur; the existing renderer dependency's `THREE.Clock` deprecation remains.
The final full gate passes all 286 TypeScript / 152 Python tests (56.93 seconds),
lint, Ruff, asset validation, typecheck and build (`selection-complete-check.log`).
Entry JavaScript is 439.43 / 135.12 kB gzip, viewer JavaScript 990.03 / 266.19 kB,
and CSS 60.74 / 12.71 kB. Geometry, textures and physical source identities are unchanged.
All 30 final production journeys pass in 3.8 minutes
(`selection-complete-production.log`), including the expanded compact/tablet
loading, ready and cancellation states. The development suite contains 158 cases.
Continue directly into V8 original Formula surface and silhouette refinement.

## Premium phase V5 — Viewer layer clarity, 2026-09-11

Analysis Layers now groups lap overlays separately from the scene environment.
Original centerline and road-edge controls sit behind Source inspection. The
Environment checkbox accurately names terrain, trees and barriers; driving views
explain where overview markers appear. All existing layer defaults and states
remain independent, with no project, source, solver or playback-clock change.

The previous panel overlapped camera actions by 2,613 square CSS pixels at 320 px
and 6,030 in 780×390 fullscreen (`layer-clearance-before.log`, before PNGs reviewed).
All viewer tool panels now stay above those actions, with internal native
scrolling, stable scroll gutters, opaque surfaces and 11 px control labels.
The initial three clearance regressions pass after the fix. The expanded journeys
also verify keyboard access to scrolled source controls, retained selections,
complete exported project/Canvas/pending setup/cursor preservation and working
playback without additional solves. They cover both bundled sources and run in
the production suite as well as development.

Seven focused integration journeys pass in 59.0 seconds, including existing
keyboard tabs and terrain visibility (`layers-browser.log`). The first visual
sweep passes all 36 states across both circuits at 1600, 1280 and 390 px: normal
overlays, expanded source inspection, Chase, Onboard, Ghost Car and Camera panels.
All panels remain inside the scene and clear of camera actions, with no horizontal
overflow, runtime errors or cursor movement (`layers-final-qa.json`). Desktop,
laptop, phone and short-fullscreen captures were opened and reviewed.

The full quality gate passes lint, Ruff, asset validation, typecheck, all **286
TypeScript / 152 Python tests (92.33 seconds)** and build (`layers-check.log`).
Entry JavaScript remains 438.62 / 134.83 kB gzip; viewer JavaScript is 990.03 /
266.18 kB and CSS is 60.36 / 12.60 kB. Scene geometry and texture counts are unchanged.
All 15 broader annotation, dashboard, key and idle-rendering journeys pass in
3.2 minutes (`layers-integration.log`), giving **22 distinct local integration
journeys** across this milestone.
Twelve additional 780×390 fullscreen states pass on both tracks with native
scrollbars visible (`layers-native-qa.json`); the Dev Track capture was reviewed.
The visual script excludes Chromium's default headless `--hide-scrollbars` flag
so overflow affordances can be assessed, and supports `QA_WIDTH` filtering.
All **29 final production journeys pass in 3.5 minutes** (`layers-production.log`),
including the three new keyboard/fullscreen/retention journeys. The development
suite now contains 157 cases. Continue directly into V7 track-selection clarity.

## Premium phase V4 — Trackside scale, 2026-09-11

Original guardrails, regularly spaced supports and reflectors provide nearby
reference objects in Chase and Onboard. The same pipeline places them on Dev
Track, Red Bull Ring and imports. Bases follow actual apron cross-sections four to
eight metres beyond road edges; six-metre source-distance gates establish a consistent
visual rhythm. A spatial index over road triangles omits spans which enter or
approach the driving surface, conservatively including crossings at other heights.
Source geometry, telemetry, vehicles, cameras and the single clock remain unchanged.
See TRACKSIDE.md for exact dimensions, placement, contact and omission semantics.

The first actual procedural asset package is registered in `assets/manifest.json`.
Its parameter, origin, axis, material and provenance conventions are documented
in `assets/README.md`. `npm run validate:assets` joins the full quality gate. This
starts V10's asset work with a used, validated original package; GLB/Blender and
vehicle asset work remain. No third-party models, textures or licences are added.

Six geometry cases use analytical boundaries, independent mesh rays, source
crossings, sparse slopes, large offsets and a valid 2,000-point nearly 30 km source.
The Dev Track GT motion capture exposed a placement defect: an eight-
metre offset could put a rail below the crest of a steep embankment. The independent
sparse-slope regression reproduced a 6.51 m drop. Placement now stays on the apron
while limiting the base's height change from the shoulder crest to 0.20 m; the
six numerical cases pass, including large-coordinate contact. The corrected Dev
Track desktop and Red Bull Ring portrait captures were opened and reviewed.
Six final 1× motion sequences pass across both circuits/vehicles and showcase
portrait fullscreen (`trackside-crest-qa.json`): 312 observed frames, zero support
anchor drift, 134–202 m of car travel and clearly changing projected support
positions. These measure world-relative motion, not hardware frame rate.

Final terrain QA passes all **45 states** at 1600, 1280 and 390 px across both
bundled tracks and a sparse slope import. All **9,618 line-visibility probes** are
clear, with zero shoulder-covered road interiors. Terrain-on/off depth comparisons,
exact paused cursor, pending setup, Canvas and complete exported project checks
pass without extra solves or runtime errors (`trackside-crest-terrain-qa.json`).
The Red Bull Ring laptop overview was also opened and reviewed.

The final gate passes all 286 TypeScript / 152 Python tests (58.47 seconds),
lint, Ruff, asset validation, typecheck and build (`trackside-final-check.log`).
Entry JavaScript remains 438.62 / 134.83 kB gzip, the deferred viewer is
989.56 / 266.07 kB and CSS remains 59.74 / 12.47 kB. The environment adds three
static material batches and zero image textures, with track-keyed geometry reuse
and explicit instance-bound refreshes. Eight additional GT quarter-lap poses on
both tracks pass and the Dev Track midpoint capture was reviewed. Four matched
Chase budget captures pass: 70 Formula / 54 GT draws; Dev Track submits 132,724 /
130,952 triangles and Red Bull Ring 118,460 / 116,688 (`trackside-budget-qa.json`).
This adds 53,392 / 43,720 triangles respectively against the pavement baseline,
with unchanged vehicle transforms, telemetry-driven wheels and camera field of view.
All six final source-switching, sparse-road and zero-idle/browser-resource journeys
pass in 1.5 minutes (`trackside-final-browser.log`).
All **26 final production journeys pass in 3.4 minutes** against the completed
build (`trackside-production.log`). Continue directly into V5 layer/workflow clarity.

## Premium phase V2 — Onboard camera, 2026-09-11

Onboard now provides an original Formula roll-hoop and GT roof mount, using the
same exact yaw/pitch frame as the current telemetry vehicle. The fixed 60-degree
field of view and 8 cm near plane preserve close bodywork below the forward road
sightline. The mount is independent of camera history and playback rate. Reset,
seek and fullscreen do not introduce a second clock or change the installed lap.
Both selectors expose the mode; explicit Play respects it. The current vehicle is
revealed when entering a driving camera. Floating engineering markers, the start
flag and the current name leave this close view; identity stays in the transport.
See CAMERA_FRAMING.md for physical coordinates, imported-wheel handling and limits.

The complete local gate passes lint, Ruff, typecheck, **280 TypeScript tests**,
**152 Python tests (41.46 seconds)** and build (`artifacts/onboard-check.log`).
Five new mathematical cases compare against independently inverted Three.js body
transforms and cover slopes, translation, end/seek continuity, finite input and
large visual tyres. Four new browser journeys pass in 32.7 seconds across both
circuits and both vehicles. They cover keyboard camera selection, explicit Play,
camera/reset/rate/fullscreen changes, actual foreground car pixels, exact paused
cursor, pending setup, Canvas and complete project preservation without a new solve.
Their image helper is shared with the existing portrait chase regression.

All **14 final integration journeys pass in 2.2 minutes**. They retain north/reset,
keyboard tabs, first-Play behavior and both existing portrait chase pixel checks.
The desktop/phone idle journeys now explicitly enter Onboard, verify zero settled
draws and animation callbacks, edit pending fuel and retain the same GPU buffers
and cursor. A non-looping finish also settles in Onboard. Final browser evidence:
`artifacts/onboard-browser-final.log`.

The initial visual sweep passes **52 states**: quarter-lap poses at 1600, 1280 and
390 px for both cars and circuits, plus phone fullscreen. Actual renderer checks
confirm fixed clipping/FOV, mount distance, stable horizon, control containment and
no runtime errors. Formula desktop/phone and GT desktop/phone captures were opened.
The low view makes the next environment priority clear: nearby original trackside
objects should establish scale and speed without changing authoritative geometry.
The first sweep exposed a distracting distant start flag, which is now omitted
from Onboard. Evidence remains in `artifacts/onboard-qa.json` and `onboard-*.png`.

Four complete 1× portrait-fullscreen laps pass **4,240 presented frames**: Red Bull
Ring Formula/GT 896/1,261 and Dev Track Formula/GT 902/1,181. Inverse rendered-body
transforms place the actual camera within 4.82e-13 m of its mount, with no roll,
projection-setting error or runtime failure. Finish and maximum mount-error poses
have retained captures; both showcase peak images were opened. Evidence is
`onboard-continuous-fullscreen-qa.json`, its log and matching PNGs. Frame counts
reflect this software-rendered run and are not a hardware frame-rate claim.

One earlier GT fullscreen image appeared to crop its left transport edge. A fresh
five-state phone capture retains the complete transport; the QA now also checks
control/identity bounds against the viewport, not just their containing panel.
The final fullscreen panel measures exactly 390×844 at (0,0), with all controls
inside it. The image was opened and reviewed (`onboard-phone-final-qa.json` and
matching PNGs). No additional layout change was needed for this capture.

Comparing the same GT pose also revealed disappearing trees. Both new desktop and
phone regressions fail against the old cached instance bounds, excluding some
actual tree spheres by **1,405.88 m**. Installing matrices before presentation and
recomputing each batch's culling sphere/box fixes the issue without disabling
culling or changing placements/geometry. Both regression cases pass after the
correction. The final visual script additionally checks every tree instance's
sphere in each captured state; see TERRAIN.md. Before evidence is retained as
`landscape-bounds-before.log` and `landscape-bounds-before-1600/390.png`.

The final **52-state sweep passes after that correction** with viewport/control
containment, stable mounts and complete tree-sphere containment (maximum numerical
overflow 1.14e-13 m). The formerly empty Dev Track laptop view and Red Bull Ring
phone fullscreen now retain their trees; both final images were opened and
reviewed. Maximum observed Onboard submission is 42 draws / 78,568 triangles for
Formula and 22 draws / 76,628 triangles for GT. These reflect visible batches in
these poses, not additional geometry or hardware FPS. Final evidence:
`artifacts/onboard-final-qa.json`, `onboard-final-qa.log` and `onboard-final-*.png`.

The complete quality gate passes again after the culling correction with
280 TypeScript tests, 152 Python tests (41.94 seconds), lint/Ruff/typecheck and
build (`artifacts/onboard-check-final.log`). Six final scenery/idle browser
journeys pass in 1.3 minutes, including both failing-before bounds cases, sparse
terrain visibility and both strengthened Onboard idle checks
(`artifacts/onboard-landscape-browser.log`). Camera/clock math is unchanged by
this correction, so the four continuous laps retain their motion evidence.

All **26 production journeys pass in 2.4 minutes** against the final built assets
(`artifacts/onboard-production-final.log`), including the four new Onboard cases,
source/export preservation, loading/context recovery, fullscreen controls and
existing portrait/annotation checks. The complete development suite now contains
154 journeys; the next pushed CI run verifies that complete suite independently.

Entry JavaScript remains 438.62 / 134.83 kB gzip, the deferred viewer is
985.10 / 264.71 kB and CSS is 59.74 / 12.47 kB. Mount math lives entirely in the
deferred scene. This milestone adds no textures, vehicle geometry, external
assets, source changes, solver settings or persisted project fields.

## Premium phase V3 — Terrain and pavement, 2026-09-11

First-Play review identified the next dependency for low cameras: every road sat
over a blanket nine-metre ground offset. The terrain now retains 0.35 m below the
source, with the existing conservative footprint cap, earth aprons and finite
grid. Source positions, widths, solver inputs and telemetry do not change.

Actual sparse-slope QA found two further pavement defects. The wider shoulder
surface covered 24 of 480 interior road probes, up to 0.03782 m above asphalt.
Two separate outside strips now share the exact road edges and all 480 probes
are clear. Coarse asphalt triangulation also departed by 0.13354 m from the
interpolated source cross-section, obscuring the canonical racing line. Retaining
all source edges and adding render sections at three-metre gates reduces that
measured error to 0.00601 m. The original input stays a 40-point polygon; this is
not source smoothing or solver resampling. See TERRAIN.md.

The final complete gate passes lint, Ruff, typecheck, **275 TypeScript tests**,
**152 Python tests (39.86 seconds)** and build. Three new geometry cases cover
ground proximity, paved-surface separation, cross-section error, exact retained
source vertices/welded edges, render spacing and a 90 km coordinate translation.
All six relevant browser journeys pass in 1.2 minutes, including sparse-road
visibility, both portrait car pixel checks and zero settled draws/RAFs with stable
GPU buffers across ordinary edits. All **22 production journeys pass in 2.0
minutes** on the final build. Entry JavaScript is 438.62 / 134.83 kB gzip,
deferred viewer 983.81 / 264.29 kB and CSS 59.66 / 12.45 kB.

The final material/geometry sweep passes **45 states** across Dev Track, Red Bull
Ring and the original sparse slope at 1600, 1280 and 390 px: Top/3D with terrain
on/off and Chase. Eighteen overview checks find no occlusion among **9,618**
canonical and intermediate coarse-segment line probes. Actual asphalt triangle
centres remain clear of shoulders across all nine source/viewport combinations.
Full exported projects, pending fuel, cursor, Canvas and lap results are retained;
there are no new solves, page overflow or runtime errors. Desktop sparse Chase,
laptop Dev Track overview and phone sparse/showcase Chase images were opened and
reviewed. The former shoulder slices and buried line are visibly corrected.

A diagnostic initially found 4.7–22% fewer blue pixels against grass. No line
probes were occluded. Keeping real terrain depth while suppressing its colour
gave exactly matching narrow-view pixel counts: 2028/2028 in 3D and 1670/1670 in
Top. The QA script now uses this background-matched depth comparison with the
original 2% allowance, retains natural screenshots separately, and restores all
colour-write flags. Its additional rays include terrain, trees, aprons, asphalt
and shoulders. No app timer or alternate rendering mode was introduced.

Final evidence in ignored `artifacts/`: `pavement-check-final.log`,
`pavement-browser-final.log`, `pavement-production-final.log`,
`pavement-final-qa.json` and `pavement-final-*.png`. Before/after mesh measurements
are in `shoulder-probe-before.log`, `shoulder-probe-after.log`,
`pavement-probe-before.log` and `pavement-probe-after.log`; antialiasing findings
are in `terrain-line-probe-final.log` and `terrain-line-probe-narrow.log`.
Earlier intermediate captures are retained under `terrain-conform*` and
`terrain-shoulders*`; they document the defects found before the final correction.

Four final first-frame vehicle/camera probes retain metre scale, wheel/steering
alignment and viewport containment on both circuits and cars. Draw calls remain
67 for Formula and 51 for GT. The finer pavement increases submitted triangles:
Dev Track 66,684→79,332 (Formula), 64,912→77,560 (GT); Red Bull Ring
64,678→74,740 (Formula), 62,906→72,968 (GT). This is a bounded static geometry
cost, not a frame-rate claim. `pavement-budget-qa.json` records the final probes;
`track-grounding-motion-qa.json` is the previous matching baseline. The existing
vehicle script accepts `QA_WIDTH` and `QA_FRACTION` for focused comparisons.

## Premium phase V1 — Playback entry, 2026-09-11

The expanded product brief starts a new sequence in ROADMAP.md. The initial
paused overview remains useful for engineering. First Play from either transport
now follows the current car automatically, while later explicit camera/reset
choices persist. Follow current car reveals and frames it without seeking or
starting playback. The viewer transport identifies the current/reference vehicles
and offers restart and rate alongside existing synchronized controls.

The complete quality gate passes lint, Ruff, typecheck, 272 TypeScript and
152 Python tests (41.10 seconds), then builds successfully. A final build includes
the distinct Viewer playback rate label; it avoids ambiguous matching with the
existing graph selector. Final entry JavaScript is 438.96 / 134.99 kB gzip,
deferred viewer 983.55 / 264.13 kB and CSS 59.66 / 12.45 kB.
Thirteen distinct nearby browser journeys pass: entry/explicit-mode behavior,
ghost identity, portrait car pixels, viewer transport/fullscreen, telemetry
readouts and zero settled draw/RAF behavior. The initial selector ambiguity
failed two readout cases; both and the new entry cases pass after correction.
All 22 production journeys pass in 2.0 minutes on the final build.

Actual first-Play and subsequent Top/Chase/fullscreen captures pass 24 states:
GT at Red Bull Ring at 1600, 1280, 390 and 780 px, and Formula at Dev Track at
320/360 px. Controls, vehicle identities, readouts and source credits stay inside
their panel with no page overflow or runtime errors. Desktop entry, laptop Top,
phone fullscreen and compact Formula entry PNGs were opened and reviewed. The
car is centered immediately. Eight additional 320/360 px Red Bull Ring states
with both GT/current and Formula/reference pass; the compact fullscreen image was
opened and reviewed. Both identities remain readable as groups and each car keeps
its own blue/grey label. These bring the layout review to 32 states, recorded in
`playback-entry-reference-qa.json` and matching PNGs.
The visible raised-road appearance identifies V3
grounding as the next dependency before tuning lower onboard cameras.

Evidence under ignored `artifacts/`: `playback-entry-check.log`,
`playback-entry-build-final.log`, `playback-entry-browser.log`,
`playback-entry-browser-final.log`, `playback-entry-production.log`,
`playback-entry-showcase-qa.json`, `playback-entry-dev-compact-qa.json` and matching
PNGs. `presentation-playback-qa.mjs --entry` reproduces the first-Play capture;
`--reference` also displays the reference vehicle and its identity.

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

## Readable sector annotations — 2026-09-11

Review of the compact Red Bull Ring overview found corner circles covering digits
in sector times (`portrait-compact-final-scene-320-overview.png`). Sector badges
now find free screen space and connect to their own canonical interval midpoints.
Their narrow headings increase from 6 to 8 px. A single ordered after-frame pass
places the interactive event group first, timing badges next and ghost names last.
Each changed upstream layout refreshes downstream placement immediately, including
after portal remounts. This keeps source intervals, times, vehicle anchors, clock
and complete project data unchanged; see SECTOR_LABELS.md.

The first browser checks found that the global hidden rule prevented badge
measurement. A scoped invisible-but-measurable rule fixes initial placement.
A selected Dev Track corner at 320 px then exposed the need to reserve room for
the event group before placing individual timing badges. The final ordering fixes
that overlap and retains native event controls. Four pure geometry tests pass for
independent anchors, differently sized/coincident badges, corner/key/caption
obstacles, viewport bounds, deterministic unchanged inputs and omission limits.
The final complete gate passes lint, Ruff, strict typecheck, **272 TypeScript
tests**, **152 Python tests (44.34 seconds)** and build
(`artifacts/sector-labels-check-final.log`). Entry JavaScript is unchanged at
438.95 / 134.98 kB gzip; deferred viewer is 981.58 / 263.66 kB and CSS is
58.76 / 12.31 kB. The preceding portrait commit passes its complete remote CI
with 142 development and 16 production journeys; see CI.md.

All **10 annotation/rendering browser journeys pass in 1.8 minutes**
(`artifacts/sector-labels-browser-release.log`). The four new sector journeys
exercise both circuits at desktop and 320 px, while existing event, ghost-name and
zero-idle-frame/draw/buffer checks protect their integration. They preserve exact
displayed times, full exported projects, pending fuel and the shared paused cursor
with no new simulation requests.

The visual sweep passes **40 states** across both circuits and 1600, 1280, 390 and
320 px: orbit, top, selected corner, open ghost tools and return from chase, with
GT/current and Formula/reference enabled. Every visible badge remains contained
and separate from other labels and controls, with no page overflow or runtime
error. All three badges remain visible in 39 states. The 320 px Dev Track tools
panel leaves room for two; Sector 3 is omitted there and restored on closing the
panel, while Lap Analysis retains its value. The Red Bull Ring compact overview,
Dev Track selected corner and desktop tools screenshots were opened and reviewed.
Evidence is `artifacts/sector-labels-qa.json`, `sector-labels-qa.log` and matching
`sector-labels-*.png` files. This documents the crowded-view fallback explicitly.

All **20 production journeys pass in 1.8 minutes** on the final build
(`artifacts/sector-labels-production.log`), including all four new annotation
cases, actual car-pixel checks, fullscreen transport, source persistence/licensed
exports and graphics/module recovery. No source geometry, numerical model or
project-format change is included in this presentation milestone.
The final full Red Bull Ring dashboard capture was also opened and reviewed
(`sector-labels-showcase-red-bull-ring-dashboard.png`), with five focused desktop
annotation states passing under the `sector-labels-showcase` artifact prefix.
