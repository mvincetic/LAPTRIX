# Original trackside context

Original spruce foliage now supplies more natural distant and close scale cues.
It retains the existing deterministic tree sites and road exclusion corridors,
with two instanced batches and one compact texture. The placements remain
schematic on both circuits. See FOLIAGE.md for source, shape, grounding and budgets.

The Dev Track now has two original signs beside its existing timing line. Their
placements, selected by source fingerprint, and shoulder/apron foundation fitting
are described in ASSET_PIPELINE.md. They add a small actual GLB consumer to the
procedural context below. Red Bull Ring retains its schematic generic facilities
and documented source data, without inheriting the fictional Dev Track identity.

The guardrail package adds nearby reference objects to make road scale and motion
readable in Chase and Onboard. It uses the same generic source pipeline on LAPTRIX
Dev Track, Red Bull Ring and imports. These are schematic placements, not surveyed
circuit infrastructure or safety engineering. Track-data attribution remains
visible; no source coordinates, road widths, solver values or lap samples change.

## Placement and contact

`roadside-context.ts` consumes the validated source and Landscape's existing
terrain surface. It retains every original source cross-section and the apron's
six-metre distance gates. Rail bases prefer eight metres beyond the road edge,
between the four-metre shoulder and the outer eighteen-metre earth connection.
Each base interpolates those actual apron endpoints, limiting the height change
from the shoulder crest to 0.20 m. This adapts the lateral offset between four and
eight metres on slopes while keeping the beam visible above the road edge.
Support positions therefore lie on rendered apron cross-sections; their lower
15 cm extend into the ground. The authoritative road is never moved to fit them.

The original folded rail profile runs from 0.40 to 0.72 m above its base. Posts
are 0.90 m tall with a 0.10×0.16 m section. Supports occur at six-metre source
centreline distance gates; reflectors occur every fifth support gate. Physical
spacing along an offset curve naturally differs from centreline spacing. All
dimensions and colours are in `assets/trackside/guardrail.json`.

`road-clearance.ts` indexes the original road-edge triangles in a 64 m plan-view
grid. A candidate span is omitted if its segment enters or comes within 0.8 m of
any road triangle. This checks the entire segment, not just its endpoints, and
supports asymmetric widths, nearby road sections and crossings. Exclusion is
conservative across different source heights. No bridge or barrier collision
physics is inferred. Gaps are preferable to placing visual infrastructure through
the driving surface.

## Rendering and assets

Trackside shares the already-generated TerrainSurface rather than rebuilding
terrain. It adds one merged rail mesh plus instanced posts and reflectors, with
three materials and no textures or external requests. Track-keyed memoization
retains geometry during ordinary setup/viewer changes. Replaced buffers are
disposed. Instance matrices and their culling sphere/box update together in a
layout effect, followed by demand invalidation. Paused playback introduces no
additional animation or clock.

The Environment checkbox in Analysis Layers controls terrain, trees and this
schematic infrastructure together. Source inspection is a separate disclosure;
the existing source geometry and independent layer states remain unchanged.

The first actual procedural asset is registered in `assets/manifest.json`.
`npm run validate:assets`, included in the full quality gate, checks its identity,
metre/axis conventions, paths, dimensions, supported placement gates and original
provenance declaration. See `assets/README.md` for conventions and the remaining
GLB/Blender pipeline work. No third-party model, texture or repository licence
grant is introduced by this package.

## Verification

Six numerical cases cover known asymmetric circle boundaries, segment crossings,
height-independent exclusions and 90 km translation; actual rail triangle
centroids are independently raycast against both road levels of a crossing.
Sparse-slope support bases match independently raycast apron triangles within
0.025 m, including float32 rounding at large coordinates. Checks also bound each
support's height relative to the source shoulder crest. Before
the adaptive placement fix, the sparse-slope cases failed with a 6.51 m drop;
both now satisfy the 0.20 m limit at zero and 90 km offsets. Deterministic output
retains the source and terrain arrays. A valid 2,000-point, nearly 30 km circle
bounds mesh/instance counts by physical spacing.

The desktop/phone instance regression checks all four scenery batches after
switching both bundled sources. Existing sparse-road visibility and zero-idle
draw/RAF/buffer tests exercise the richer environment. The terrain visual script
now traverses nested scenery so its independent occlusion rays include the rails,
posts and reflectors. Its depth-only comparison already covers those descendants.

`node scripts/trackside-motion-qa.mjs` records actual 1× motion at desktop and
portrait fullscreen. It tracks an existing support through the real camera while
the shared clock advances, verifies that its world position stays fixed and that
the car and projected support move, then retains before/after images. This uses
the existing after-frame callback for observation, not a second animation.
Final visual, performance and production findings belong in PRODUCT_PRESENTATION.md.
