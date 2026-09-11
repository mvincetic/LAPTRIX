# Synthetic terrain clearance

Landscape is original contextual scenery derived from the displayed track. It is
not surveyed ground and has no effect on the solver, source fingerprint, lap,
camera, audio or playback clock. The road and shoulder meshes retain their source
positions, widths and display lifts.

The pure terrain builder samples the nearest projected point on every closed
source segment and interpolates that segment's elevation. It retains a 110×80
cell grid, the existing 9 m ground offset, distance falloff, muted palette and
4,200 seeded tree candidates. This removes the former lookup's height steps from
using only every third source vertex. Nearest-segment boundaries and coarse grid
triangles can still produce synthetic ridges; no smoothing of track data occurs.

Each source segment's expanded horizontal box contains its road and four-metre
shoulder quad, with an extra metre for coordinate rounding. Every overlapping
terrain cell's four corners are capped below the lower source endpoint by 9 m.
Linear terrain interpolation then stays below the road across their overlapping
footprints, including unequal-height crossings. Float32 geometry introduces small
rounding differences; large-offset tests retain at least 8.9 m clearance. The
conservative excavation can leave ground well below a road and is not a bridge,
earthworks design or guarantee against distant scenery obscuring a low camera.

Tree candidates stay outside each source segment's maximum endpoint half-width
plus 30 m. Their existing cone meshes use the final terrain triangles for base
placement. Terrain generation is memoized by track in the deferred Landscape
component; disposal and instanced trees use the existing rendering lifecycle.

The original R500 m circle with y=140 sin(theta) and 40 samples is a valid import.
The old terrain rose above its road at 56 of 400 sampled centerline positions, by
up to 12.2799 m, and visibly cut gaps through the racing line in Top and 3D views.
An 80-sample variant also exposed the problem. Both desktop/phone browser cases
fail before the correction and pass afterward, comparing line pixels with terrain
on/off using a 2% allowance for rasterization. They also retain the same Canvas,
cursor, pending fuel and lap time with no extra solve or page error.

Eight independent geometry checks cover closed-segment interpolation, road-width
tree clearance, both triangle interpolants and grid edges, sparse/sloped/wide roads,
large coordinate offsets, unequal-height crossings, deterministic bounded output,
tree bases and source immutability. `node scripts/terrain-qa.mjs` captures default
and original sparse inputs at 1600/1280/390 px in Top, 3D and Chase views.

## Road grounding and materials — 2026-09-11

The visual road now uses neutral asphalt with original static 64×64 grain,
repeated every four world metres and mipmapped for distant views. Warm shoulders
retain their four-metre width but sit 0.09 m below the asphalt. Narrow white paint
lies inside each original road edge. Schematic 0.85 m curbs sit outside it wherever
source heading curvature exceeds 1/450 m; alternating colour follows three-metre
source-distance gates and retains every source vertex. A small checker stripe
crosses the exact source start/finish. None of these positions asserts a surveyed
curb, runoff, grid or pavement specification at Red Bull Ring.

Original grassy aprons connect the outer shoulder to the existing ground mesh,
extending fourteen metres further out. They sample its actual triangles at gates
no more than six source metres apart, including original vertices; outer vertices
sit 0.1 m below the sampled ground to avoid a bright seam. This hides the former
floating shoulder edge without changing the conservative terrain caps, road
geometry or source heights. Aprons are synthetic earth surfaces, not a civil or
bridge reconstruction. Tight overlaps, unequal-height crossings and coarse terrain
can still produce artificial cuts or sight lines. The source diagnostics and
terrain toggle remain available.

A muted grass palette and static broad colour variation separate ground from road.
Seeded tree positions are unchanged. Original cone crowns now begin above visible
trunks whose bases sit on the same final terrain triangles. Geometry is memoized
by source and disposed on replacement; the two grain textures are created once
per Ribbon mount and disposed normally. There are three road-detail material
batches, one apron batch and one additional instanced trunk draw; no new clock,
runtime asset download, dynamic shadow map or postprocessing pass is introduced.

Four independent presentation tests use a regular polygon with unequal widths,
an analytical ground plane and a 2,000-point near-30-km source. They check paint
and curb placement, top-facing triangles, three-metre intervals, closed boundaries,
the finish stripe, exact apron endpoints, deterministic bounded buffers and source
immutability. Existing terrain-on/off pixel checks protect sparse/sloped road
visibility in the actual browser. See PRODUCT_PRESENTATION.md for final gates and
the desktop, phone and fullscreen visual review.
