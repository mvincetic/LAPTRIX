# GT front openings and fitted livery — 2026-09-16

The rear refinement at `22dafad` left two visible problems: the side stripe
floated outside the body, and the front grille intersected a solid painted nose.
This iteration fits the stripe to the actual shell and models three rounded
front openings with tapering carbon liners. The nose crown rises by 70 mm at
its final control station to give the openings a coherent painted surround.
The grille sits behind the opening. Hood seams now follow the same authored
skin as the fitted headlights and livery.

All modeling remains original LAPTRIX work. No manufacturer mesh, downloaded
asset, logo, image map or third-party licensing change is introduced. These are
visual surfaces; the vehicle profile and simulation inputs remain unchanged.

## Source and resource contract

The reviewed editable `assets/blender/vehicles/gt.blend` was promoted directly
from the accepted study. Its normal registered export is byte-identical to the
browser-reviewed GLB. `scripts/blender/author_gt.py` retains the explicit rebuild
recipe; ordinary export preserves changes made by an artist in Blender.

| Resource | Rear refinement | Body fitting | Existing limit |
| --- | ---: | ---: | ---: |
| Editable Blender bytes | 2,773,442 | 2,902,262 | Source asset |
| Runtime GLB bytes | 1,362,548 | 1,463,676 | 2,500,000 |
| Triangles | 42,770 | 45,122 | 60,000 |
| Material batches | 29 | 29 | 48 |
| Materials | 10 | 10 | 10 |
| Image textures | 0 | 0 | 0 |

The runtime increase is 101,128 bytes (7.4%) and 2,352 triangles (5.5%).
All existing node transforms, four wheel assemblies and both rear lamp meshes
remain exact. Total bounds stay unchanged at approximately 2.054 m wide,
4.407 m long and 1.390 m high. The native 1.9 m profile width, 2.457 m wheelbase,
0.36 m wheel radius, track pose, steering and one PlaybackClock remain authoritative.
There is no camera, physics, track-data or material-policy change in this pass.

The manifest pins source SHA-256
`7ae5e876d46a9d9e4f7df82f79db2ac88ff1299fa5b1ca702491ee7808fdd9d8`
and runtime SHA-256
`9dda545c94f417ed59ed1b31afe924054661de7a46b4efcb470ef9c03cd715f4`.

```powershell
node scripts/blender-tool.mjs export laptrix.blender-gt.v1
npm run check
npm run blender:check
```

## Independent mesh checks

Raycasts against the actual exported paint mesh find the old stripe between
25.03 and 177.73 mm outside the body. The fitted ribbon samples the authored
side skin across its length. All 324 exported vertices and triangle centroids
tested across both sides remain outside the final body by just 1.467–1.597 mm.
This small rendering offset keeps the stripe visible without the previous gap.
The proof uses exported triangles, separately from the authoring interpolation.

Seven front sample positions inspect both painted shell and carbon depth. All
three inlet centers are genuinely open through the front face, with recessed
carbon in front of the deeper painted backing. The two dividing bridges and
upper/lower lips remain. Named wheel/lamp mesh data and all node transforms are
also compared directly with the prior asset. Retained reports are under
`artifacts/gt-front-study/`: `side-fit-proof.json`, `inlet-proof.json` and
`rig-proof.json`.

## Visual review and validation

The first narrow, unlined intake study was rejected: its front looked pinched
and unfinished in the actual browser. The accepted study retains a stronger
nose surround, carbon liners, fitted stripe and a finer fitted hood seam.
Fourteen matched desktop captures cover close front/rear/side, Chase at 0/6/8
seconds and Onboard at 6 seconds. Four real Onboard Play sequences compare the
previous and revised assets at 1600 and 390 px, retaining twenty moving frames
and eight paused coast/braking views. All sequences preserve the native lap,
wheel motion and brake response, with zero added solves or runtime errors.
These are explicitly isolated study captures, separate from integrated QA.

An initial study probe read lamp values immediately after a seek and sampled
the previous rendered state on the unchanged baseline. The corrected probe
waits for both lamps to match brake intensity independently interpolated from
the exported native lap. It passes all four sequences without an application
change or altered deadline. The failed read log is retained as
`motion-first-seek-read.log`; final results are in `motion/report.json`.

The full integrated local gate passes 342 TypeScript / 178 Python tests
(47.32 seconds), lint/types, ten asset packages, physical context reproduction
and production build. Four Blender exports are byte-identical, and actual-source
rejection probes pass. Sixteen integrated browser cases pass in 5.5 minutes,
covering both cars' native Onboard view, delayed/failed asset delivery and retry,
reference compositor behavior, daylight/shadow reuse and imported terrain.
Thirty-six integrated captures retain eighteen matched pairs across all four
camera modes and close front/rear/side views at 1600 and 390 px. The prior asset
is substituted only for the before image; after images use normal application
delivery. Exact paused cursor values are checked. A phone inspection orbit that
sat behind a fence post was replaced with a view inside the fence, using a 65°
QA lens and a slightly farther side offset. Projecting every vehicle vertex now
checks that the complete model fits all close captures. Production cameras are
unchanged. Six further current/reference views preserve the blue current car
and distinct translucent reference. Evidence is retained under
`artifacts/gt-body-fitting-integrated/`.

Three native-GPU Onboard samples run the GT on both circuits at desktop width,
plus Red Bull Ring at 390 px/fullscreen. They record 538 frames at about
60.0–60.2 fps on an identified RTX 3060 Ti/ANGLE Direct3D 11 at pixel ratio 1,
with zero anchor drift or runtime errors. Red Bull Ring's desktop peak remains
69 calls, with 440,960 submitted triangles: 4,704 more than the rear refinement,
including shadow submission. These short three-second samples do not establish
sustained-lap or phone-hardware performance. See `gt-body-fitting-native-qa.json`.
The earlier regional software-renderer deadline remains unresolved.

All forty production-browser cases pass in 11.6 minutes, including imported
tracks, save/restore, references, asset recovery and narrow viewer controls.
Local acceptance is complete. Pushed revision `867fae9` has seven successful
remote jobs in run `35142086900`, with one desktop load-extrema timeout after
its application assertions pass. Forty production cases and all four exports
pass remotely. LOAD_EXTREMA_CI.md records the trace and focused stabilization;
remote acceptance remains open. The preceding rear refinement is fully green.

The model still has simplified side vents, door detailing and untextured glass
and carbon. Ground context remains sparse and facilities approximate. This pass
improves the existing GT; it does not by itself meet the full visual checkpoint
or authorize broader circuit construction.
