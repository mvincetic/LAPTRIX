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
separate wings and mirrors. The GT retains its distinct closed coupe body, roof,
glass, lamps and rear wing. Its larger body presentation is the next refinement.
The original model's readable category silhouette is the target of this pass;
these assets remain simplified and are not high-detail production car art.

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
Opaque standard materials separate paint, dark floor/wing elements, rubber,
glass and metal. The existing small generated contact-shade texture is retained.
The new contours and tyres introduce no image textures or extra draw batches.
Each tyre uses 32 circumferential segments and eight section spans, 512 triangles.
Memoized vehicles retain geometry during normal parent/UI edits; replaced custom
geometries dispose their GPU resources on cleanup. See PRODUCT_PRESENTATION.md
for actual before/after browser geometry counts and visual evidence.

`npm run validate:assets` verifies manifest ownership, convex section winding,
bounded/ordered stations, sidepod width, heights and local paths. Numerical tests
check watertight oriented surfaces, raycast-facing caps, bounds and exact tyre
dimensions at several profile scales. Actual close, Chase and Onboard browser
captures check both vehicles on both bundled tracks. No Blender or GLB export
pipeline is claimed by this procedural milestone; that remains V10.
