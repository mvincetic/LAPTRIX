# Original LAPTRIX assets

`manifest.json` describes the assets actually used by the viewer. The first
package is an original corrugated guardrail, supports and reflectors. Its metre
dimensions and colours are in `trackside/guardrail.json`; `roadside-context.ts`
constructs source-framed geometry and `Trackside.tsx` renders three static batches.
No downloaded model, photograph, texture or circuit-specific mesh is included.

Run `npm run validate:assets` to check manifest identity, local paths, provenance,
dimensions and supported parameter constraints. It is part of `npm run check`.
The geometry tests separately check support contact with real apron triangles,
road exclusions, source immutability and maximum input budgets. Asset validation
does not establish third-party licensing rights.

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

This is the first procedural package, not a completed GLB/Blender pipeline. Future
authored vehicle/environment assets should retain editable sources, validate
metre scale and pivots, normalize materials, export and optimize GLB, then record
the actual runtime resource and licence in the manifest. Add LODs only with actual
visual and performance evidence. Track geometry must continue to come from its
validated source data rather than an artist's scene.

Third-party assets require documented source, licence, modification and
redistribution rights before inclusion. This original package adds no repository
licence grant and makes no claim about third-party rights. Its circuit placements
are schematic context, not surveyed barrier locations. Track-data attribution
continues to travel with each circuit and its exports.
