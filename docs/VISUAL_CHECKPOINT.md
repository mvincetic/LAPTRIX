# First Blender presentation checkpoint

This checkpoint reviews the integrated Red Bull Ring finish approach through
Turn 1, original GT and LAPTRIX Formula 2026. It gates broader content work.
The local captures and machine-specific measurements live in the ignored
`artifacts/visual-checkpoint/` directory; they are not distributed as repository
assets. The Formula milestone at `12b42cb` passes local browser/full quality gates
and all seven remote CI jobs in run `35010222217`; the visual
assessment below keeps broader rollout paused for further slice improvement.

The surface iteration of 2026-09-16 retains this original checkpoint and adds
`SURFACE_MATERIALS.md`: five packed Blender color/normal maps, coherent metre
scale on existing road/terrain and richer grass color. The updated circuit asset
is 4,224,716 bytes, with geometry and eleven batches unchanged. The table below
describes the retained **pre-material checkpoint**. New captures and playback
measurements are kept separately so the before comparison remains recoverable.

The new 32-state desktop/phone review shows clearer close-range road grain and
richer grass color. The overview still exposes broad, uniform ground and sparse
context; the material pass alone does not justify full-circuit expansion. Four
native playback clips and twenty moving frames are retained in
`artifacts/visual-checkpoint/surface-iteration/`. Six separate native-GPU samples
retain 60.0–60.2 fps and unchanged submission counts, with zero anchor drift.
The software motion deadline remains unmet on this host and also fails on an
isolated unchanged `12b42cb`; see SURFACE_MATERIALS.md for exact evidence and limits.

The subsequent regional landscape iteration retains eight matched before/after
camera pairs, 32 integrated desktop/phone states and four actual Play clips with
twenty moving frames under `artifacts/visual-checkpoint/regional-landscape/`.
The original foreground is preserved inside a continuous Blender landscape,
with pinned CC BY 4.0 historical regional relief, original vertex-painted tones,
shared grass maps and source-scoped haze. Its 5,017,628-byte GLB has 109,834
triangles and twelve batches. Six short native-GPU sequences measure about
60.0–60.3 fps, unchanged peak draw calls and 10,640 additional rendered triangles.
The current software probe still misses its deadline at 1.549934 lap seconds.
See REGIONAL_LANDSCAPE.md for exact contracts, evidence and limitations.
The committed regional revision `76248c1` passes all eight remote jobs in run
`35130855476`, including complete browser, quality and Blender-export gates.

This makes the horizon and close ground more coherent, but broad terrain and
forest remain simplified. Full-circuit construction stays paused. The observed
narrow Onboard track-information box overlaps the cockpit; the next focused
product iteration moves that caption below the canvas in Chase and Onboard,
retaining circuit identity, source access, camera controls and authoritative
transport/telemetry. Its 32-state visual review, eight actual Play sequences,
eighteen focused interactions, complete quality gate and forty production cases
pass locally. Revision `1d66369` passes all eight remote jobs in run `35133390869`.
Six matched Onboard pairs are retained under `artifacts/follow-caption-integrated/`.

The next GT iteration rolls the painted rear into a fitted carbon recess and
opens the lower shell around a tapered diffuser with solid strakes. It preserves
the exact rig and outer bounds, with the same material/draw counts. The first
isolated study was rejected for its exposed, unfinished-looking ramp; the second
was reviewed in matched close/Chase views and four real Play sequences before
integration. GT_REFINEMENT.md records the current integrated acceptance and
remaining limits. Broader rollout stays paused.

## Comparison conditions

The retained before views come from `8474e6d`, before the Blender phase. Matching
after views use Red Bull Ring at five seconds, a native overlapping reference,
1600 × 1000 viewport and the actual 3D View, Chase and Onboard controls. The GT
captures at `df0a8ba` show the same GT/circuit meshes and camera settings used by
this candidate. Formula captures use the current authored model. Capture manifests
record source files, hashes and conditions; renderer performance samples have
their own explicit conditions and must not be conflated with these screenshots.

Close views place the existing orbit camera near the actual car on its road.
The ordinary application retains its four camera choices. Studio previews help
modeling but are separate from browser acceptance. Playback measurements press
the real Play control and observe the same clock and telemetry poses.

Four local WebM recordings retain eight seconds of actual 1× Chase/Onboard
playback for both cars at 1280 × 800 fullscreen. Twenty captured frames sample
the moving sequences; `motion-videos.json` records actual cursor times, identified
GPU and zero runtime errors. The clips include initial loading/setup before Play.
They complement the independent frame/resource measurements rather than serving
as an FPS benchmark. The observed Formula straight exceeds 300 km/h before its
native braking phase; boards/fences move through the view while car scale stays
stable. The coarse road grain remains visible and motivates the next material pass.

## Ownership and payloads

| Asset | Editable Blender bytes | GLB bytes | Triangles | Material batches | Textures |
| --- | ---: | ---: | ---: | ---: | ---: |
| GT | 2,709,779 | 1,322,736 | 41,630 | 29 | 0 |
| Formula 2026 | 2,964,791 | 1,054,352 | 53,138 | 27 | 0 |
| Red Bull Ring slice | 4,611,444 | 3,585,828 | 81,594 | 11 | 0 |

The circuit count includes 2,064 coarse shadow triangles; 79,530 triangles form
visible facilities. Vehicle budgets are 2.5/3 MB, 60,000/70,000 triangles and
48 batches. The circuit budget is 4.5 MB, 120,000 triangles and 16 batches.
The retained shared spruce texture is 512 × 512 (91,404-byte WebP), and daylight
uses a 128 × 64 generated radiance map. Those resources are separate from the
three Blender GLBs above.

Blender owns the premium vehicle surfaces, rigs and PBR materials, plus the
slice's pit structures, gantry, grandstand, barriers, fencing, curbs and runoff.
The simulation track, main road ribbon, contextual terrain/apron, generic forest,
outside-slice scenery and imported-track presentation remain procedural. Native
distance/elevation/widths, physics, lap identities and the one playback clock
remain authoritative. Matching profiles load premium vehicles; delivery failure
or custom dimensions retain their adaptable procedural counterparts.

## Visual assessment

The vehicles are materially stronger than the previous procedural models. The
GT now has coherent arches, fitted glazing, lamp signatures and detailed wheels;
Formula has an actual cockpit opening, halo, undercut sidepods, shaped multi-element
wings, suspension and original livery. Their native metre-scale wheel contacts and
poses remain intact. The closer Chase view increases readable car size, while
fences, pit-wall panels and braking boards provide useful speed references.

The environment remains visibly simplified. Large ground areas lack natural
surface variation, the circuit surroundings are approximate, and repeated neutral
facility modules do not reproduce surveyed architecture. Existing asphalt grain
looks coarse in low views. The trees have limited directional detail, and distant
vegetation density is deliberately bounded. Vehicle carbon/glass materials are
untextured, suspension is visually simplified, and Formula aero surfaces have a
fixed pose rather than an invented active-aero signal.

These limits mean the first integrated result does not yet justify full-circuit
expansion. After the current validation cycle is green, continue improving surface
materials and road/ground visual continuity within this same slice. Preserve the
source mesh and clock, and compare the resulting browser views before reconsidering
broader rollout. See FORMULA26_BLENDER.md and RBR_BLENDER_SCENE.md for provenance
and the distinction between visual interpretation and real-world accuracy.

## Validation record

Initial integration passes eight focused browser cases covering delayed delivery
during playback, failure/retry for both vehicles, paused visible replacement,
shadow coverage and resource retention. The final camera sweep passes all 64
native Formula/GT poses across both tracks and desktop/phone widths. All 48 Formula
overlap/separation reference states and 26 Onboard states pass. Four Blender assets
re-export byte-identically. The complete local quality gate passes lint, strict
types, ten asset packages, 334 TypeScript tests, 162 Python tests (40.55 seconds)
and production build. All 26 import/persistence/reference/custom-profile/audio/
idle-render regressions pass in 7.8 minutes. All 40 production-browser cases pass
in 10.7 minutes against the completed build, including visible asset delivery,
source persistence, portrait/fullscreen, reference paint and graphics recovery.

Six short native-GPU Onboard samples record 1,078 frames at approximately
60.1–60.2 frames/second on an explicitly identified RTX 3060 Ti through ANGLE
Direct3D 11, pixel ratio 1. Both cars run on both circuits at 1600 × 900; the
Red Bull Ring pair also runs at 390 × 900 with the existing fullscreen viewer.
Each sample spans about three seconds, travels 184–258 m and records zero
fixed-object drift. Formula's Red Bull Ring desktop peak is 68 submitted draw
calls and 446,404 triangles; GT's is 69 and 423,336. Those renderer totals include
the rest of the scene and shadow submission, not just the car's asset budget.
Three separate Formula software-rendered sequences also pass the unchanged motion
checks. These measurements do not establish sustained full-lap performance or
mobile hardware performance. See `blender-formula-native-qa.json`,
`blender-formula-motion-qa.json` and the retained checkpoint manifest.
