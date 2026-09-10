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
fit. Screen-space labels can overlap at compact sizes. Source fingerprints do not
authenticate arbitrary imported reference trajectories outside the source road.

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
snapshots or a substitute for geometric projection tests. The helper reads the
WebGL framebuffer without changing it, excluding HTML labels from the count.
`node --experimental-strip-types scripts/camera-framing-qa.mjs` captures original
and large source orbit/top/chase views at 1600, 1280 and 390 px. Images and numerical
findings are retained locally in ignored `artifacts/`.
