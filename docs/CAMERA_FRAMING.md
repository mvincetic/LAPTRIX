# Source-scaled camera framing

Orbit and top views fit the original road geometry to the current canvas aspect
ratio. **Reset camera**, changing the overview mode and resizing the canvas use the
same calculation. They do not recalculate a lap, seek playback or change project
inputs. Chase retains its existing current-telemetry position and look-ahead.

`apps/web/src/camera-framing.ts` contains the pure fit calculation. It preserves
the 45° vertical field of view, original overview directions and 1.27 fit margin.
The target is the original source bounding-box center. Every source point and both
road edges, including the viewer's four-metre shoulders, are tested in camera-space
right/up/depth coordinates. This accounts for perspective depth and horizontal
viewport proportions, not just a plan-view bounding rectangle.

The minimum orbit distance is bounded from one to forty metres according to the
3D road radius. Maximum distance covers the source span, full 3D road radius and
the fitted position with room to zoom out. This keeps the fit reachable for narrow
viewports and sources whose vertical extent exceeds their horizontal span.

The near plane retains one metre for ordinary circuits and becomes smaller for
small sources. The far plane is at least the existing 12 km, expanding to cover
maximum orbit distance plus the procedural landscape's bounded radius. The latter
includes its 0.7-span horizontal surround and vertical allowance. `CameraRig`
updates the camera projection matrix and passes the same distance limits to
OrbitControls. No depth tests are disabled and no source geometry is changed.

The bounds describe the original road and procedural context around its fitted
target. Arbitrary panning can still move the source off screen; Reset restores the
fit. Reset drains residual orbit/pan damping before applying the fitted pose, so
an unfinished drag cannot rotate the restored view. Screen-space labels can overlap
at compact sizes. Source fingerprints do not authenticate arbitrary imported
reference trajectories outside the source road.

## North direction

The viewer arrow projects world north (`-z`, with east `+x` and up `+y`) onto the
actual camera's right/up axes. It therefore follows manual orbiting, top view and
the current telemetry-driven chase pose. The fixed N identifies the arrow; it is
track-coordinate north, not a magnetic bearing or proof of source georeferencing.
Its accessible name and hover text describe one of eight screen directions. If
north lies along the viewing axis, its screen direction is undefined: the arrow
is hidden and the label explains this case. It also starts hidden while the
camera is unavailable.

`north-indicator.ts` derives the direction from the camera's unit quaternion.
CameraRig reads it after OrbitControls and the existing chase update within the
existing frame callback. DOM rotation changes only when its rounded 0.01-degree
value changes; the label changes only at direction boundaries. This creates no
additional clock, simulation request or per-frame React state.

Five unit tests compare the helper against an independent Three.js vector
rotation across azimuth, pitch and roll, including cardinal, translation,
quaternion-sign and degenerate cases. Two browser journeys use real orbit drags,
reset and chase at two shared-clock positions, retaining complete exported project
contents and pending setup. They exposed and now protect against residual damping
moving the camera after reset. `node scripts/north-indicator-qa.mjs` captures
top/orbit/reset/chase evidence at 1600, 1280 and 390 px in ignored `artifacts/`.

## Regression evidence

The previous fixed far plane clipped a valid 28,022.824 m development fixture.
It scales the original synthetic source five times, retains 720 samples, and
passes the unchanged track contract. At aspect 0.85 all original points project
beyond the former far plane. The actual 390 px browser view was blank, with zero
blue racing-line pixels in a direct WebGL readback and no WebGL error. Desktop
views of the same result were visible. The fixture is original QA data, not a
bundled or surveyed circuit.

Five math tests independently project source and rendered road vertices through
Three.js's camera matrix. They cover three scales, five aspect ratios, both
overviews, a small valid loop, a tall closed source, large 3D translation and maximum
permitted zoom. Invalid viewport proportions are rejected. The browser journey
imports the large source, resizes, changes camera modes, resets, checks rendered
line pixels and then returns to the original source. Complete project contents,
pending setup and the shared playback cursor remain unchanged by camera actions.

Pixel checks establish that the track is rendered; they are not exact image
snapshots or a substitute for geometric projection tests. The helper inspects a
composited canvas screenshot with HTML overlays temporarily hidden. This continues
to work after a demand-rendered frame is presented and the default WebGL drawing
buffer is discarded. It also retains the context's error check. See RENDERING.md.
`node --experimental-strip-types scripts/camera-framing-qa.mjs` captures original
and large source orbit/top/chase views at 1600, 1280 and 390 px. Images and numerical
findings are retained locally in ignored `artifacts/`.

## Product chase camera — 2026-09-11

The follow camera now samples the canonical racing line at a physical distance
behind the car, instead of placing it 50 m behind the instantaneous heading.
Follow distance is `10 + 2 * wheelbase` metres; the look-ahead sample is
`8 + 0.18 * speed` metres ahead (speed in m/s). Both distances are capped at 8% of
lap length and wrap over the closed source. The target blends 35% towards that
sample from the car, keeping tight hairpins from cropping it on narrow screens.
Camera height is `3.4 + 0.35 * wheelbase` above the current
sample, with at least 3.2 m clearance above its sampled rear position. The fixed
55-degree field of view and 0.2 m near plane retain the vehicle and upcoming road
in phone and landscape views. Overview modes restore their 45-degree fit.

The pose is a pure function of the installed Lap and clock time: seeking, pausing,
changing playback rate and crossing the finish need no damping history. There is
no extra clock, shake, roll, motion blur or animated field of view. Explicit Play
still works with reduced motion; opening the workspace or switching cameras does
not start playback. Four analytical checks cover physical circle positions,
translation, finish continuity, endpoint clamping, deterministic seeks and vehicle
projection at three aspect ratios and complete cars through three tight stadium
hairpins. The hairpin check fails with the initial unblended target. Existing north-direction browser checks use
the new pose and independently rotate world north through the camera quaternion.

This follows the calculated path; it is not a suspension or collision camera.
Imported trajectories outside the source road and distant terrain can still
occlude a low view. Top/3D and Reset remain available.
