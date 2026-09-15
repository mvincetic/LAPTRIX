# LAPTRIX Formula 2026

The original Formula model is in review. Its editable Blender source uses
sculpted body cages, an open cockpit, halo, undercut sidepods, shaped wings,
exposed suspension and detailed slicks/rims. It is original LAPTRIX art; no team
model, manufacturer CAD, downloaded media or existing React geometry is used.

## Public design references

The [FIA's public 2026 guide, published 17 December 2025](https://www.fia.com/news/f1s-new-era-everything-you-need-know-about-how-fia-making-formula-1-more-competitive-more)
was reviewed on 15 September 2026 for broad design direction. It describes a
narrower front wing with two active flaps, a three-element rear wing, simplified
rear endplates, removal of the separate beam wing and front wheel brows, and wake
boards near the sidepod front. These factual features inform the original
silhouette. FIA illustrations, logos, model geometry and article text are not
redistributed with the asset.

This is a visual interpretation, not a homologated 2026 vehicle. The existing
`formula-development` simulation profile remains authoritative: 3.6 m wheelbase,
2.0 m profile width and 0.34 m rolling radius. The cited FIA guide describes a
3.4 m wheelbase and narrower 2026 dimensions. Changing those physics inputs is
outside this presentation milestone; the model fits the existing native wheel
positions instead of silently changing the simulated car.

Wings retain one static authored pose. The existing simulation has no active-aero
state channel; the model does not invent wing movement or a second timeline.
The unbranded rear safety lamp is static and does not claim to represent an
energy-management signal. GT braking lights retain their separate telemetry role.

## Authoring and ownership

`scripts/blender/author_formula26.py` is the original rebuild recipe. Routine
exports reopen the editable `.blend`, validate its physical rig and place
the GLB through the existing manifest pipeline. Blue, ice-white and dark carbon
surfaces form the LAPTRIX livery. Geometry remains editable by material and rig
batch. The procedural Formula stays available for unsupported dimensions and
asset delivery failure.

The source is `assets/blender/vehicles/formula26.blend` (2,964,791 bytes); its GLB
is `assets/runtime/vehicles/formula26.glb` (1,054,352 bytes). It contains 53,138
triangles, 27 material batches and nine PBR materials, with no textures. Limits
are 3 MB, 70,000 triangles and 48 meshes. Actual bounds are X ±1.016 m,
Y 0–1.100288 m and Z −2.510219–2.69 m. Native wheel centres remain X ±0.81 m,
Y 0.34 m and Z ±1.8 m. Front slicks are visually narrower than the rear pair.

The first export rejected duplicate vertices where the symmetric cockpit cut
met the monocoque crown. A 0.1-micrometre weld on that Boolean result removes the
coincident points without changing the contour; validation thresholds stay fixed.
Studio review then found a buried visor and floating nose suspension mounts.
The visor now follows the actual helmet ellipsoid and the suspension mounts
follow the tapered body surface. An independent Three.js sight ray requires the
visor to be the first surface hit. A rear gearbox casing supports the rear links.
Fitted shoulder stripes, an access-panel seam and original LAPTRIX stroke letters
complete the first livery. Four Blender exports are byte-identical locally.

The shared bounded loader validates each model against its own rig and budget,
retains separate cache entries, and gives each lap independent materials and
wheel carriers. Nine GT/Formula tests pass, including exact profile eligibility,
invalid rigs, independent materials, cache isolation and failed-download retry.
The browser now selects this model for the matching native Formula profile, with
an independent cache entry alongside GT. Category changes reset the presentation
instance; delayed delivery binds to the current telemetry frame without a new
solve. Initial browser close views and the finish-through-T1 Chase/Onboard review
show the actual exported surfaces on the source road. Eight focused browser cases
and 26 wider import/persistence/reference/custom-profile regressions pass. The
complete local quality gate passes 334 TypeScript / 162 Python tests and ten
assets. Actual QA passes 64 camera poses, 48 Formula reference states and 26
Onboard states, plus six native-GPU and three software motion samples. All 40
production-browser cases pass in 10.7 minutes. The candidate's remote CI follows
its milestone commit and push. See
VISUAL_CHECKPOINT.md for the before/after comparison and explicit visual limits.
