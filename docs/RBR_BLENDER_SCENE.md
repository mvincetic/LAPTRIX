# Red Bull Ring Blender reconstruction

The first authored environment covers the finish approach and start/finish through
Turn 1. The `.blend` contains editable mesh islands, grouped into ten visible
material batches and one coarse shadow batch. It adds a graded pit lane, garage modules with glazed
upper floors, a neutral LAPTRIX start gantry, original grandstand seating,
corrugated barriers, fences, 150/100/50 m boards, raised alternating curbs and
runoff. Dimensions and facility arrangements are original approximate art.
They are not a survey or an official circuit model.

## Authoritative alignment

`npm run blender:context` exports an authoring reference using the same source
normalization, road, shoulders, apron and terrain functions as the browser. It
reads `data/tracks/red-bull-ring.json` and writes only
`assets/blender/tracks/red-bull-ring-context.json`. The asset configuration pins
both the source fingerprint and the SHA-256 of the complete context. The main
quality gate regenerates that reference in memory and compares its exact bytes.

Blender samples the source distance frame and raycasts the exported ground when
placing scenery. `RBR_SLICE_ROOT` retains the source world origin and identity
transform; `START_FINISH_ANCHOR` independently checks the rendered road height.
The `.blend` and GLB root retain the context hash, physical source fingerprint
and complete source credits. Validation rejects stale input, displaced anchors
and missing credits. The existing road ribbon, solver input, lap distance,
elevation, widths, timing gates, sectors and native vehicle pose are unchanged.

The reconstructed driving envelope is checked against actual exported triangles
at five lateral positions along the slice. Two metres above the road remain
clear; the intentional overhead gantry is above that envelope. This verifies
presentation clearance, not a driving collision model.

## Sources and redistribution

The committed [source package](../data/sources/red-bull-ring/README.md) retains
the original OSM snapshot, elevation raster, reproducible reconstruction scripts
and complete license texts. No new external model or proprietary circuit art was
introduced for this scene.

- GP alignment: © OpenStreetMap contributors, [relation 5309181](https://www.openstreetmap.org/relation/5309181),
  [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
- Elevation: **Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at**,
  [source catalogue](https://data.steiermark.at/cms/beitrag/12803290/97428847/),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The scene transforms source coordinates into the documented metre frame, samples
the existing inferred ground and adds approximate authored facilities. Preserve
these credits, license links and the source package when redistributing the
derived world. Original structures, stroke lettering and material art use the
repository's distribution policy; the repository does not grant an additional
blanket license for that art. No Red Bull, FIA, team or sponsor branding appears
on the authored structures.

## Source and runtime ownership

| Item                 | Path / budget                                           |
| -------------------- | ------------------------------------------------------- |
| Editable source      | `assets/blender/tracks/red-bull-ring-slice.blend`       |
| Runtime asset        | `assets/runtime/tracks/red-bull-ring-slice.glb`         |
| Authoring script     | `scripts/blender/author_rbr.py`                         |
| Exported triangles   | 81,594 / 120,000 maximum; 79,530 visible + 2,064 shadow |
| Material primitives  | 11 / 16 maximum                                         |
| GLB bytes            | 3,585,828 / 4,500,000 maximum                           |
| Materials / textures | 11 Principled PBR materials; no textures                |

Run `node scripts/blender-tool.mjs author laptrix.blender-rbr-slice.v1
--replace-source` only to intentionally rebuild the source from the authoring
script. Routine `npm run blender:export -- laptrix.blender-rbr-slice.v1` preserves
editable art changes, validates and places the GLB automatically.
`npm run blender:check` re-exports without changing committed source or runtime.

The browser fetches one bounded package only when the installed source fingerprint
matches. Pending or failed loading retains generic scenery. Successful loading
replaces generic guardrails only within the authored distance ranges. Environment
remount retries a failed fetch; successful remounts share immutable geometry and
materials through a single bounded cache. Scene instances own their hierarchy.
Mount and removal refresh cached sun shadows, including while paused. Actual
garage/grandstand roof footprints are exported before material batching; tree
crown envelopes clear those footprints. Surviving sites retain their original
indices, sizes, colors and rotations. This resolves a canopy intersection found
in the first integrated scene without shifting the surrounding forest.

`SHADOW_CASTERS_LOD0` retains simplified solid building, pit-wall, stand and gantry
silhouettes authored in Blender. Runtime disables its color/depth writes and uses
it only for shadow coverage; detailed visible meshes receive shadows. The source
shows the proxy in wire display for editing. A standalone Blender render should
hide this role. This replaces tens of thousands of repeated bevel/seat/letter
triangles in the moving sun map with 2,064 triangles. Fine fence/seat shadows are
omitted; the existing native vehicle still casts its detailed shadow. The original
12-second software-rendered motion check passes after this optimization, without
changing the clock or test deadline.

The original contextual terrain, road material, source shoulders, trees and the
remainder of the circuit remain generated in the viewer. LAPTRIX Dev Track and
custom/imported geometry retain that generic path. Main-road material detail,
vegetation and the simplified facility surfaces remain visible limitations to
evaluate at the formal GT/Formula quality checkpoint.
