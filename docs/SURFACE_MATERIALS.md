# Blender ground materials

The Red Bull Ring source now owns the original asphalt, grass and gravel material
art used by both its authored ground patches and the main runtime road/terrain.
This extends the existing slice package; no additional runtime download is needed.
The main road, shoulders and contextual earthworks retain their existing geometry.
The source track, elevation, timing gates, physics and PlaybackClock are unchanged.

## Editable art and scale

`scripts/blender/surface_materials.py` builds periodic, seeded original color and
normal fields, then packs five PNG images into `red-bull-ring-slice.blend`. No
photography, satellite imagery or third-party texture asset is used. Material
nodes are ordinary UV, Image Texture, Normal Map and Principled nodes that export
to web-compatible glTF PBR. Routine export retains the source images and artist
edits; only explicit authoring with `--replace-source` regenerates them.

| Image | Resolution | PNG bytes | Physical tile |
| --- | ---: | ---: | ---: |
| Asphalt color | 512 × 512 | 324,590 | 2 m |
| Asphalt normal | 256 × 256 | 58,952 | 2 m |
| Grass color | 256 × 256 | 79,535 | 8 m |
| Grass normal | 256 × 256 | 70,855 | 8 m |
| Gravel color | 256 × 256 | 90,296 | 2 m |

The five maps total 624,228 bytes; gravel shares the asphalt micro-normal map.
Blender emits six texture references to five images; Three's loader shares the
repeated source/sampler. Including mipmaps, five RGBA8 GPU images use approximately
2.67 MiB. Four-times anisotropic filtering retains detail at grazing angles,
subject to the device limit. Normal maps affect shading only, never displacement.

Blender UVs are `(world X / tile, world Z / tile)` in the source metre frame.
glTF flips V on export, so runtime UVs are `(world X / tile, 1 - world Z / tile)`.
Source and independent GLB validation check that relationship at every ground
vertex. Main road and runoff therefore share scale and phase even across separate
meshes. Terrain keeps restrained macro color variation; nearby earthworks use the
same grass map. There are no baked directional shadows or lighting in the maps.

## Delivery and ownership

The 5,299,167-byte editable source exports a 4,224,716-byte GLB within the existing
4.5 MB limit. Geometry is unchanged at 81,594 triangles and eleven batches. An
independent comparison with `12b42cb` finds exact equality of every position,
normal, triangle index and node transform (`artifacts/blender-surface-geometry-proof.json`).
Authoring context and licensed geometry provenance remain pinned and unchanged.

The optional package loads only for the matching source with Environment enabled.
One cache owns its textures and geometry. Road/terrain instances own material
clones and dispose those clones without releasing cached maps. UV/color attributes
are updated in their existing buffers when switching materials, so toggles do not
accumulate orphaned GPU attributes. Hidden scenery, loading failure, Dev Track and
imported sources retain the generic material path. Late obsolete requests cannot
attach to another source. No solve or clock update is caused by asset delivery.

Before image decoding, runtime validation rejects external dependencies, invalid
GLB/chunk bounds, invalid embedded PNG headers and oversized images. The source
allows at most five images, six texture references and 512-pixel image dimensions.
An invalid parsed package releases its geometry, materials and owned image data.
The successful cache retains the packed maps across toggles.

## Review scope

`node scripts/surface-material-qa.mjs` captures both cars in four cameras at
desktop and phone widths, at start/finish and six seconds into the lap. Existing
continuous-motion and native-video tools exercise real playback. The original
Formula checkpoint remains separate, so matched before/after images remain
available. This pass improves surface scale and color, while approximate facility
architecture, repeated forest silhouettes and sparse distant scenery remain
limitations. Broader circuit construction stays gated by the visual checkpoint.

The first completed review retains 32 actual browser states, four native Play
clips and twenty moving-frame captures. Six native-GPU motion samples record
1,072 frames at 60.0–60.2 fps on RTX 3060 Ti / ANGLE Direct3D 11, pixel ratio one.
Both cars run on both tracks at 1600 × 900, with an additional 390 × 900 fullscreen
pair on Red Bull Ring. Fixed scenery anchors have zero drift. Peak Red Bull Ring
submissions remain 68 calls / 446,404 triangles for Formula and 69 / 423,336 for GT.
These are approximately three-second samples, not sustained/mobile guarantees.

The software-rendered motion deadline is **not passed on this host in this cycle**.
The candidate advances 1.9666 seconds against the existing greater-than-two-seconds
check within twelve wall seconds. Diagnostic linear-filter and color-only probes
also miss it. An isolated checkout of the unchanged, green `12b42cb` baseline
reproduces the miss at 1.65 seconds under the same settings; only its development
server port/cache configuration differs. This does not identify a material-specific
regression. Keep the deadline and clock unchanged, retain the evidence, and track
software-renderer performance separately from native playback and functional CI.
Logs: `blender-surface-software.log`, `blender-surface-linear-probe.log`,
`blender-surface-color-only-probe.log`, `blender-surface-baseline.log`.
The isolated baseline remains under ignored `artifacts/material-baseline/`.
