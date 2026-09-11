# Original vehicle presentation

The Formula and GT are original generic category models. They contain no team
livery, manufacturer CAD, downloaded model or game geometry. Shape does not
modify the selected physics profile or claim to reproduce a particular real car.
The original project assets add no repository licence grant; the repository's
distribution policy applies. Track-data licences remain separate and unchanged.

## Formula bodywork

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
