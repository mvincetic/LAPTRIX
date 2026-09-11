# Original LAPTRIX assets

`manifest.json` describes the assets actually used by the viewer. The guardrail
package is an original corrugated guardrail, supports and reflectors. Its metre
dimensions and colours are in `trackside/guardrail.json`; `roadside-context.ts`
constructs source-framed geometry and `Trackside.tsx` renders three static batches.
No downloaded model, photograph or texture is included.

The second package is original Formula bodywork in `vehicles/formula.json`:
rounded section contours, chassis, sidepods, engine cover and a tapered floor.
Longitudinal stations are fractions of wheelbase, half-widths are fractions of
vehicle width, and bottom/top heights are metres. `vehicle-geometry.ts` converts
these authored proportions into the selected profile's dimensions. The viewer
also uses original shallow wing sections and rounded 32-segment tyre shoulders.
The GT shares the tyre surface while using a separate authored coupe package.

The third package, `vehicles/gt.json`, defines a rounded GT shell, wheel wells,
continuous painted cabin and six fitted glass panels. `gt-geometry.ts` preserves
the physical wheel centres/radius and retains a central floor between the wells.
Body/cabin longitudinal coordinates use the visual length (wheelbase + 1.7 m),
half-widths use profile width, and heights/clearances remain metres. Window faces
have continuous shared joins. Two rear lamps consume the same lap's normalized
brake demand in the existing vehicle frame callback. See `docs/VEHICLE_ASSETS.md`
for pivots, material conventions, tests and current limits.

Run `npm run validate:assets` to check manifest identity, local paths, provenance,
dimensions and supported parameter constraints. It is part of `npm run check`.
The geometry tests separately check support contact with real apron triangles,
road exclusions, source immutability and maximum input budgets. Asset validation
does not establish third-party licensing rights.

The fourth package is the original Dev Track start pylon. Its editable dimensions,
materials and capital outlines are in `trackside/dev-start-pylon.json`, with the
builder alongside it. `npm run export:assets` produces the actual 22 KiB runtime
GLB. Validation reloads it and checks byte-for-byte export reproducibility. Two
source-bound sites use three shared material batches and grounded foundations.
See `docs/ASSET_PIPELINE.md` for export, loading, source binding and failure behavior.

## Conventions

- Metres, right-handed coordinates, +Y up and +Z forward. Source-world geometry
  uses east +X / south +Z; source coordinates remain authoritative.
- A support's origin is its ground contact. The unit box is scaled and translated
  around this contact, including the documented below-ground embed. Its local +Z
  follows the road span. Rail profile pairs are lateral offset / height in metres.
- Material colours are authored in sRGB; scalar/normal data is linear. The current
  package uses original metal and reflector materials without image textures.
- IDs are stable and versioned. Filenames are lower-case; manifest parameters and
  implementations resolve inside the repository. Do not silently change units,
  pivot, axes or an existing asset ID's meaning.
- Static rails are merged and posts/reflectors instanced. Instance matrices and
  culling sphere/box update together before presentation. Ordinary UI edits retain
  GPU resources, and source changes dispose replaced geometry.

The pylon establishes the actual static GLB export/loading pipeline; the other
three packages remain procedural. Blender is optional and was not used here.
Future authored vehicle/environment assets should retain editable sources, validate
metre scale and pivots, normalize materials, export and optimize GLB, then record
the actual runtime resource and licence in the manifest. Add LODs only with actual
visual and performance evidence. Track geometry must continue to come from its
validated source data rather than an artist's scene.

Third-party assets require documented source, licence, modification and
redistribution rights before inclusion. This original package adds no repository
licence grant and makes no claim about third-party rights. Its circuit placements
are schematic context, not surveyed barrier locations. Track-data attribution
continues to travel with each circuit and its exports.
