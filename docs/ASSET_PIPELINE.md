# Original static asset pipeline

The Dev Track start signs are the first shipped GLB asset. Their editable source
is `assets/trackside/dev-start-pylon.json` plus `dev-start-pylon.mjs`. Dimensions,
materials and original polygonal capital outlines are authored locally; no font,
image, manufacturer model or game mesh is embedded. The existing Formula/GT and
guardrail packages remain procedural because they adapt to physical profiles and
source geometry. Track geometry remains authoritative simulation data.

## Export and validation

Run `npm run export:assets` after editing the pylon source. The builder merges
static pieces by material, then the installed Three GLTFExporter writes the local
binary. Its binary Blob reads use a small Node FileReader adapter; export requires
no browser, Blender installation, new dependency or network request.

`npm run validate:assets`, also part of `npm run check`, verifies the manifest,
owned paths, GLB header/length, embedded buffers, no images/animation/required
extensions, finite geometry, physical bounds and material/triangle/byte budgets.
It independently reloads the GLB with GLTFLoader. A second export must match the
checked-in bytes exactly, so source changes cannot silently leave a stale model.
The current file is **22,528 bytes, 386 triangles and three material batches**.
No compression runtime or LOD is warranted for this small texture-free asset.

Units are metres, +Y is up, +Z follows travel and coordinates are right handed.
The origin is ground contact beneath the base centre. Bounds are 2.6 m wide,
4.2 m high and 0.8 m deep. The two faces carry correctly oriented lettering;
independent rays verify that the D's stem covers the face while its hole exposes
the light background. Paint is offset from the face to avoid buried lettering.
Material colours use sRGB and ordinary metallic/roughness materials.

## Runtime and site placement

The manifest records the actual runtime GLB, editable source, original provenance,
budgets and placement file. Vite emits a local asset URL. `static-asset.ts` loads
GLTFLoader lazily, bakes node transforms into three reusable geometry parts and
caches the bounded original asset. Each part is instanced for the two sites;
one further instanced box batch supplies foundations. Instance transforms and
culling bounds update together before a demand-rendered frame. Geometry has no
per-frame builder and the asset introduces no clock, animation or texture.

The placement registry matches the authoritative source fingerprint, not the
display name or track ID. Renaming the same physical source retains its identity;
a changed or unrelated imported source does not receive Dev Track signage.
Source progress zero places both signs at the existing timing line, 2.5 m outside
their respective road edges. These are intentional fictional facilities, not
surveyed objects or a circuit safety specification.

The initial wide sign outside the barriers needed 1.74–1.90 m foundations on the
sloping apron. The final narrower sign stands on the shoulder. Placement clips
the actual shoulder/apron triangles against each footprint to capture every height
extremum, including interior peaks. Foundations extend 0.15 m below the lowest
contact and 0.08 m above the highest; unsupported sites, excessive foundations
and nearby roads are omitted. The road and terrain are not moved to fit the asset.
Dense independent ray probes cover both foundations at native and 90 km translated
coordinates, with source/surface immutability checks.

An optional model failure leaves the viewer, lap and engineering controls usable.
The failed cache entry is released; toggling Environment retries. Successful
geometry is reused through environment and circuit switches. Browser checks cover
one failed request followed by visible recovery, all four cameras, metre scale,
geometry retention, shared playback, pending edits and complete project exports.
The compositor recovery check also runs against the production build.

Blender was not used for this asset. A future artist-authored source must meet the
same origin, units, axes, material and validation contracts before export; Blender
must not replace source track data. Third-party artwork additionally requires
documented redistribution/modification rights and attribution. This original asset
uses the repository's distribution policy and introduces no new licence grant.
