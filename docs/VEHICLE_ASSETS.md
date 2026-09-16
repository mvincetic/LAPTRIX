# Original vehicle presentation

The Formula and GT are original generic category models. They contain no team
livery, manufacturer CAD, downloaded model or game geometry. Shape does not
modify the selected physics profile or claim to reproduce a particular real car.
The original project assets add no repository licence grant; the repository's
distribution policy applies. Track-data licences remain separate and unchanged.

## Blender GT — first integrated asset

`assets/blender/vehicles/gt.blend` is the editable original GT source. It uses
continuous body/cabin control surfaces, boolean wheel openings, fitted glazing,
panel seams, hood extraction, LED signatures, rear lamps, split-spoke rims,
stationary brake discs/calipers, diffuser and an aerofoil rear wing. Blue paint,
ice stripes and dark aero parts are original LAPTRIX art. Neither the old React
geometry nor any manufacturer model is imported. `scripts/blender/author_gt.py`
is an explicit rebuild recipe; ordinary `blender:export` retains edits to the
actual `.blend`. Mesh islands remain editable after material/rig consolidation.

The refined source is 2,902,262 bytes. Its GLB is **1,463,676 bytes, 45,122 triangles,
29 material batches and ten materials**, with no image textures. Budgets are
2.5 MB, 60,000 triangles and 48 batches. Dimensions include mirrors and aero:
2.054 m wide, 4.407 m long and 1.390 m high. Physical wheel centers remain at
X ±0.7695 m, Y 0.36 m and Z ±1.2285 m, matching the existing profile's 1.9 m
width, 2.457 m wheelbase and 0.36 m radius. No physics values change.

The rear skin now rolls into a carbon recess with inset grille, smaller exhausts
and an opened underbody around a tapered diffuser ramp. Its six solid strakes
follow the ramp rather than intersecting a flat rear cap. The existing carbon
material has a darker, less metallic response. See GT_REFINEMENT.md for matched
browser evidence, unchanged rig/bounds and the current validation state.

The following body-fitting pass cuts three actual front openings with shaped
carbon liners, fits the side stripe to the shell and conforms the hood seams to
the revised nose. Actual exported raycasts verify stripe clearance and inlet
depth; all wheel/lamp geometry and total bounds remain exact. See
GT_BODY_FITTING.md for the latest source hashes, evidence and acceptance state.

The bundled GT presentation loads lazily for the matching profile ID/body style
and exact physical dimensions. Custom geometry uses the existing adaptable car.
`premium-vehicle.ts` bounds downloads, rejects external dependencies/timelines,
validates the imported geometry/rig, caches one template and evicts failed requests.
Each native lap clones its hierarchy and materials while sharing immutable
geometry. Unmounting disposes instance materials; the bounded template survives
viewer remounts and graphics restoration. Failed/late loads retain the complete
procedural GT. Restoring the vehicle retries a failed download.

The existing `TelemetryGhost` still owns world pose, wheel distance/radius,
steering and brake demand on the shared clock. `WHEEL_*` carriers and `SPIN_*`
nodes consume those same values. glTF empties are Object3D nodes, which the motion
contract accepts alongside procedural groups. Exported lamp emission uses unity
strength so the existing 0.12–1.72 running/braking intensity remains authoritative.
Current meshes cast/receive shadows; late loading refreshes the cached sun shadow.
Reference meshes retain 28% opacity, no depth writes/shadows and independent lamps.

This is the first integrated authored GT, not the final quality checkpoint.
The B2 circuit slice adds source-aligned facilities and a closer/lower 58-degree
Chase camera, approximately doubling the GT's start-straight screen width. Close
views show richer silhouette, fitted glass and wheel detail. Native GPU motion,
64 camera poses and production delivery pass; see PRODUCT_PRESENTATION.md for
measurements and the remaining surface/vegetation limitations.
## Blender Formula 2026

`assets/blender/vehicles/formula26.blend` now supplies the matching native Formula
profile through the same bounded loader and telemetry rig. Its original body
cages, cockpit opening, halo, undercut sidepods, shaped wing elements, suspension,
slicks and rims replace the former bundled presentation. The blue/ice/dark
LAPTRIX livery contains no team or sponsor marks. The GLB contains 53,138 triangles
in 27 batches, nine PBR materials and no textures, occupying 1,054,352 bytes.
Public FIA design direction informs the silhouette; the model retains the existing
3.6 m native wheelbase and is not claimed as a homologated 2026 car. See
FORMULA26_BLENDER.md for sources, exact dimensions and modeling limits.

GT and Formula have independent cache entries and model-specific budgets/rig
validation. Each lap owns its mutable materials and wheel nodes. Changing category
remounts the presentation before binding a different template, while the single
native clock and pose remain authoritative. A failed request retains the working
procedural fallback and is evicted for later retry. The Formula's rear safety lamp
and wing surfaces are static; undeclared aero or energy signals are not invented.

## Procedural Formula fallback

`assets/vehicles/formula.json` is the authored source for the chassis, sidepods,
engine cover, floor and convex rounded cross-section. It is registered as
`laptrix.formula-body.v1` in the asset manifest. Stations run rear to front;
longitudinal positions scale with wheelbase and half-widths with vehicle width.
Vertical dimensions remain metres. The procedural builder shares side vertices
for smooth normals and duplicates cap vertices for flat, outward-facing ends.
The floor narrows ahead of the sidepods to reveal the front suspension.
Original shallow lofts also shape both front and rear wing planes.

Formula remains an open cockpit with a helmet, visor, halo, suspension members,
separate wings and mirrors. The GT uses the separately authored coupe package below.
The original model's readable category silhouette is the target of this pass;
these assets remain simplified and are not high-detail production car art.

## GT bodywork

`assets/vehicles/gt.json`, registered as `laptrix.gt-body.v1`, owns the coupe's
body stations, wheel-well clearances, cabin section and window intervals. Body
stations use fractions of the existing wheelbase-plus-1.7 m visual length and
vehicle width. Floors and cabin heights remain metres. The original rounded
shell narrows at the nose and tail and raises its outer lower edge around each
physical wheel centre. A narrower central floor and separate end splitters avoid
the former wide plate through the tyre envelopes. Curved deck surfaces stay above
the wheel-well ceiling for the tested custom radii. No physics dimensions change.

The continuous painted cabin forms the roof and pillars. Six inset glass panels
follow the same skin, with shared offsets at adjoining facets to prevent cracks.
The current car's glass adds no transparency sorting or image textures. The geometry builder caps
concave body sections with triangulated faces and keeps cap normals independent
from smooth side normals. Shared original loft/strut/wing primitives supply
mirrors and restrained aero details; the GT does not borrow a manufacturer model.

Both rear lamps brighten from 0.12 to 1.72 emissive intensity with the normalized
brake demand of their own rendered lap. This happens in the existing vehicle
frame callback alongside wheel spin and steering, using the same PlaybackClock.
Seeking sets lamp intensity immediately; no timer or afterglow is introduced.
Each replaced geometry has independent disposal cleanup, and light references
are cleared when their materials unmount. Live development also tolerates an
older hot-reloaded motion object while the new lamp references mount.

Four GT numerical cases check closed surfaces and bounds at three profile sizes,
six external ray directions, 1,536 tyre-envelope rays, central floor retention
and exactly six connected glass panels. All 140 final close/Onboard/Chase/lamp-detail
states pass on both circuits, alongside 21 vehicle journeys and all 31 production
journeys. The complete quality gate passes 300 TypeScript / 152 Python tests;
see PRODUCT_PRESENTATION.md for resource counts and the final evidence.

## Scale, pivots and motion

Both use metres, +Y up, +Z forward and a right-handed frame. Local origin is the
road-contact plane under the wheelbase midpoint. The unchanged parent vehicle
frame follows the authoritative interpolated position, heading and pitch, with
the existing 0.58 m source-surface lift. Road presentation uses 0.55 m lift.

Four wheel centres remain at ±half wheelbase, at the profile's wheel radius above
the local contact plane. Their lateral centres preserve the original overall tyre
envelope. Rounded tyre shoulders retain exact radius and width; they do not alter
solver rolling radius. The existing telemetry distance/radius rotates the spin
groups and telemetry steering rotates the two front pivots. There is no second
clock, suspension simulation or independent animation timeline.

## Materials and resources

Current body paint retains LAPTRIX blue; native reference bodywork retains grey.
The current car uses opaque standard materials for paint, dark floor/wing
elements, rubber, glass and metal, plus the existing small contact-shade texture.
The reference uses 28% opacity without depth writing or a contact shade, so
overlapping surfaces preserve the current car's blue silhouette. Each vehicle
keeps its own material instances. See REFERENCE_PRESENTATION.md for the comparison
treatment, depth/shadow policy and actual compositor regressions.
The Formula contours and tyres introduce no image textures or extra draw batches.
Each tyre uses 32 circumferential segments and eight section spans, 512 triangles.
Memoized vehicles retain geometry during normal parent/UI edits; replaced custom
geometries dispose their GPU resources on cleanup. See PRODUCT_PRESENTATION.md
for actual before/after browser geometry counts and visual evidence.

`npm run validate:assets` verifies all three packages, manifest ownership, convex
section winding, bounded/ordered stations, GT window intervals, sidepod width,
heights and local paths. Numerical tests
check watertight oriented surfaces, raycast-facing caps, bounds and exact tyre
dimensions at several profile scales. Actual close, Chase and Onboard browser
captures check both vehicles on both bundled tracks. No Blender or GLB export
pipeline is claimed by this procedural milestone; that remains V10.
