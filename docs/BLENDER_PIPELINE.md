# Blender presentation pipeline

Blender is the primary authoring tool for premium bundled vehicle and environment
art. Source track geometry and simulation telemetry remain authoritative. The
first content target is an original GT with Red Bull Ring start/finish through
Turn 1; Formula 2026 follows a successful GT slice. The existing procedural
presentation remains available for loading failures and unsupported/custom inputs.

## Pinned toolchain

The pipeline uses **Blender 5.2.1 LTS**, verified locally on Windows with release
build `9e2066aef7ef`. The existing installation is discovered under
`%ProgramFiles%/Blender Foundation/Blender 5.2/blender.exe`; installation was not
needed. `npm run blender:inspect` records the exact executable and build details
in ignored `artifacts/blender/toolchain-local.json`. A `BLENDER_PATH` override
supports another installation without committing a personal path.

`assets/blender/toolchain.json` pins the version, official release URLs and
Windows/Linux archive SHA-256 values from the
[official checksum file](https://download.blender.org/release/Blender5.2/blender-5.2.1.sha256).
The [official download page](https://www.blender.org/download/) identified this
as the current stable LTS when the pipeline was established on 2026-09-15.
CI downloads the pinned Linux archive, verifies its hash before extraction and
keeps it inside the disposable workspace. Blender's own Python and bundled glTF
exporter perform authoring/export; project Python packages are not installed into
that runtime.

## Source and output layout

- `assets/blender/`: editable `.blend` sources, parameter/contract JSON and the
  pinned toolchain record. Vehicles, tracks and shared assets use separate folders.
- `scripts/blender/`: Blender Python authoring helpers, coordinate conversion,
  source validation and export. Pure contract math also runs in ordinary Python.
- `assets/runtime/`: exported GLBs by category, placed automatically after validation.
- `assets/manifest.json`: asset identity, source/provenance, paths, budgets and
  source/runtime/semantic hashes.
- `artifacts/blender/`: temporary exports, validation reports and the local
  executable record. These do not enter Git or the browser distribution.

The integrated `laptrix.blender-gt.v1` source lives in `blender/vehicles/gt.blend`;
its runtime GLB is in `runtime/vehicles/gt.glb`. It retains the profile's physical
wheel rig and loads through `premium-vehicle.ts`. See VEHICLE_ASSETS.md for model
budgets, original provenance, instance ownership and the fallback lifecycle.

The initial `laptrix.blender-basis.v1` gauge retains an editable 580,754-byte
`.blend` and a 5,608-byte GLB: 36 triangles, three material primitives and no
textures. Three unequal axis bars and named endpoint pivots make swapped axes,
scale drift and lost node transforms independently testable. This is internal
pipeline verification geometry. It is excluded from the application bundle and
does not constitute a premium vehicle or environment milestone.

## Coordinates, pivots and names

The first source-aligned circuit package is documented in
[RBR_BLENDER_SCENE.md](RBR_BLENDER_SCENE.md). Its authoring reference is regenerated
from the actual source/road/terrain implementation, then pinned by source and
context hashes. Those hashes and full source credits survive `.blend` → GLB;
validation rejects stale alignment or lost attribution before delivery.

| Contract | Blender source | LAPTRIX / GLB |
| --- | --- | --- |
| Units | Metric, scale length 1 | Metres, scale 1 |
| Up | +Z | +Y |
| Vehicle forward | −Y | +Z |
| Vehicle left | +X | +X |
| Coordinate conversion | `(x, -z, y)` from runtime | `(x, z, -y)` from Blender |
| Vehicle root | Contact plane beneath wheelbase midpoint | Same origin, identity transform |
| Track root | Existing source origin, East/North/Up | Existing source origin, East/Up/South |

The conversion is a proper rotation, preserving distances and handedness. GLB
export enables Blender's +Y-up conversion; runtime code must not apply another
quarter-turn. The simulated centerline, distance, elevation, widths, timing gates,
sectors and vehicle pose never come from the visual asset. Track authoring imports
the accepted source frame. Existing road/vehicle presentation lifts remain explicit
in the scene contract; there is no artist-created replacement simulation path.

Each asset has one unparented empty root with an identity transform and an `EXPORT`
collection. Use `GT_ROOT` or `FORMULA26_ROOT` for vehicles. Meshes use descriptive
names ending in `_LOD0`; future lower-detail exports use `_LOD1`, etc., with one
selected LOD per export. Authoring guides/debug objects belong outside `EXPORT`
and may use a `REF_` prefix. Cameras, lights, colliders and debug objects are not
runtime content in the initial contract.

The circuit's `SHADOW_CASTERS_LOD0` is an explicit render role: coarse solid
silhouettes retained in the `.blend` and GLB for the moving sun map. Runtime
disables color/depth writes for that node and assigns detailed visible meshes
to receive the shadow. The authoring viewport shows the proxy as wire geometry;
hide that role for standalone Blender beauty renders. The browser remains the
acceptance target. Native vehicles keep their detailed telemetry-driven shadows.

Vehicle rigs use `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR` as wheel-center
empty nodes and nested `SPIN_FL`, `SPIN_FR`, `SPIN_RL`, `SPIN_RR` nodes. FL/FR are
at positive forward distance; left is positive X. Steering rotates the front
wheel centers about runtime Y; rolling distance/radius rotates each spin node
about runtime X. Rest transforms have unit scale and no shear. Wheel positions,
radius and wheelbase must match the selected supported profile. Body origin and
pivots are declared and independently checked in each asset's parameter JSON.
GT lamps use explicit `BRAKE_LIGHT_L` / `BRAKE_LIGHT_R` meshes/materials. Runtime
integration must populate the existing motion references and consume each native
lap's shared-clock signals, including reference vehicles; no animation timeline
is exported.

## Materials and export

Use named `LTX_` materials with a Principled metal/rough PBR graph. Base color,
roughness, metallic, normals and emissive information must survive actual GLB
import. Packed PNG sources are currently bounded to 1024 pixels on either side;
each asset also declares its texture-count and total GLB byte budgets. Unsupported
shader nodes are rejected, so procedural Blender shaders must be baked or translated.
Image textures are embedded in GLB. There are no external network buffers or images.
The gauge needs no texture; premium content budgets will be measured per asset.

The exporter selects the asset hierarchy, evaluates modifiers and preserves named
nodes. It emits normals/UVs/materials and +Y-up GLB, with no cameras, lights, skins,
morph targets, animation clips, compression runtime or experimental GPU-instancing
extension. `AUTO` image export retains the validated PNG sources in Blender 5.2.
These conventions follow the
[Blender glTF manual](https://docs.blender.org/manual/th/5.2/addons/scene_gltf2.html)
and the installed exporter's inspected API. Optional material extensions currently
cover clearcoat, IOR, specular and emissive strength.

`source_io.save_editable` saves through Blender's own writer, retaining editable
geometry and setting portable output paths. Factory workspaces can contain a
personal Documents path in an inactive Shading file browser. The helper clears
that fixed directory field and sets it to `//` before saving; asset validation
rejects remaining personal-home path prefixes. Source images must be packed and
use repository-relative paths. No raw binary editing of Blender files is used.

## Commands and validation

From the repository:

```text
npm run blender:inspect
npm run blender:export
npm run blender:check
npm run blender:export -- laptrix.blender-basis.v1
```

Ordinary export opens the existing `.blend`; it does not rerun its authoring
script. This preserves manual mesh/material edits. The source validator rejects
wrong units, transformed roots, missing/displaced pivots, nonfinite or degenerate
geometry, unbaked shaders, linked external libraries and exceeded budgets. Blender
runs headlessly with factory startup, disabled automatic scripts and a nonzero
exit code for Python failures.

Export first writes a temporary GLB/report. An independent Node reader checks the
binary layout, bounded embedded buffers, triangles, normals, finite values,
orthonormal node frames, hierarchy, pivots, physical bounds, textures and budgets.
Only validated output is placed at its manifest runtime path, and hashes are
updated automatically. Source changes during export are rejected. Paths resolve
inside the repository, including symlink checks at the final parent directory.

`blender:check` reopens the committed source and re-exports to an ignored directory
without replacing runtime assets or source. Same-machine gauge exports are
byte-identical. Cross-platform verification compares all mesh attributes, indices,
node transforms, materials and embedded images, rounding positions/UVs and transforms
to 1e-6 and normals to 1e-5. Material/texture changes are exact. This ignores tiny
floating-point differences while rejecting stale geometry, paint or rigs; it does
not claim Blender files themselves are byte-reproducible across machines.

The ordinary `npm run check` validates the registered GLB and its source/runtime
hashes without requiring Blender. A separate Linux CI job runs the pinned Blender
re-export and source rejection probes. TypeScript tests independently load the
gauge through Three's GLTFLoader and check known metre/axis/pivot expectations;
corruption cases exercise invalid data, external buffers, animation, shear and
budget failures. Python tests cover the coordinate conversion and portable paths.

Ground materials add packed original PNG color/normal maps to the editable Red
Bull Ring source. Both the Blender validator and independent GLB reader check
world-coordinate UV scale against configured tile metres. The runtime uses the
exported V convention for existing road/terrain meshes. Five images stay inside
the 4.5 MB package limit; bounded PNG headers are checked before browser decoding.
See SURFACE_MATERIALS.md for the texture/geometry ownership contract.

Authoring scripts are explicit reconstruction tools. For example:

```text
node scripts/blender-tool.mjs author laptrix.blender-basis.v1
```

An intentional rebuild of an existing editable source adds `--replace-source`.
This operation is separate from routine export, so artists' source edits remain
authoritative. Blender authoring is only the start of content acceptance: GT and
environment work must also pass real browser loading/fallback, telemetry,
playback/camera, resource and visual checks before becoming premium defaults.

## Vehicle modeling previews

`npm run blender:preview -- laptrix.blender-formula26.v1` validates one explicit
vehicle source, adds a temporary Cycles studio stage and renders front, rear and
side PNGs under `artifacts/blender/previews/<asset-id>/`. The retained JSON includes
source hash, geometry validation and camera positions. Neither the stage nor its
cameras/lights are saved; source hashes are checked before and after rendering.
The preview uses 32 samples at 1280 × 800 with denoising and eight CPU threads.
It is a modeling diagnostic. Materials, camera fit, speed and quality must still
be reviewed in the actual browser; studio renders cannot establish acceptance.
