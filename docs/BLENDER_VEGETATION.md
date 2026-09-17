# Original Blender spruce

This iteration replaces the bundled circuits' repeated flat crown shape with an
original Blender asset: uneven whorls of curved, crossed bough clusters, an upright
leader and a tapered, slightly bent trunk. The first sparse study was rejected in
the browser. The fuller revision retains 38 isolated comparison captures across
desktop/narrow Chase, Onboard, overview, four close angles and actual playback.
The complete local quality gate, export reproduction, integrated visual/motion
review and 22 development-browser checks pass. All 42 distinct production cases
pass across the main run and focused recovery. Remote acceptance is pending.

## Editable source and texture provenance

- `assets/blender/shared/spruce.blend`: editable metre-scale crown/trunk meshes,
  packed original cutout and two exportable materials.
- `scripts/blender/author_spruce.py`: explicit original rebuild recipe; ordinary
  export preserves the editable source.
- `assets/blender/shared/spruce.json`: budgets, source identities, alpha-mask
  contract and the two instance coordinate bases.
- `assets/runtime/environment/spruce.glb`: validated runtime package.

The bough image reuses LAPTRIX's existing original generated artwork, recorded in
`assets/environment/spruce-generation.json`. No external photograph, downloaded
tree, manufacturer art or circuit vegetation survey is introduced. The existing
512 × 512 WebP was encoded as `assets/blender/shared/spruce-bough.png` for editable
Blender use. Chromium's decoded RGBA comparison reports zero different channels;
this changes the encoding, not the artwork. The PNG is 259,885 bytes with SHA-256
`c8a73827997486a511cc9655dcfd5f6a0cc80f941440f27fe98dc841f41382ee`.
The original WebP remains the fallback input. Both the image and Blender packed
file paths are relative, including their underlying fixed-size path storage.

## Placement and runtime ownership

Only the two exact bundled source fingerprints opt into this asset. Imported or
modified tracks keep the existing procedural foliage path. Both LAPTRIX Dev Track
and Red Bull Ring retain their identities and physical data. Existing sites,
source-derived ground heights, exclusion footprints, yaw, height variants and
instance tints stay unchanged. Trees retain two instanced batches with no shadows
or animation clock. Current visible counts are 383 on Dev Track and 473 on the
authored Red Bull Ring scene, bounded by the existing 512-site cap.

The source crown occupies Y 1.5–10.5 m within radius 3.78 m. Its geometry is
normalized once around Y 6 m, with height 9 m and radius 3.78 m, for the existing
crown matrices. The trunk uses Y −0.15–10.3 m, centre 5.075 m, height 10.45 m and
radius 0.28 m. Runtime validation rejects vertices outside the previous normalized
height/radius envelopes. The existing matrices retain the 0.15 m ground embed.

One lazy promise caches a bounded template and decoded image. Each mounted tree
pair owns disposable geometry/material clones. A failed or rejected GLB falls
back to the existing original textured foliage; failure of that image leaves the
existing cone fallback. Toggling Environment retries a failed request. Camera,
source and graphics-context changes must preserve shared resources and placement.

## Export contract and cost

| Resource | Previous tree | Authored tree | Authored limit |
| --- | ---: | ---: | ---: |
| Runtime GLB | None | 293,596 bytes | 393,216 bytes |
| Editable Blender source | None | 853,480 bytes | Source only |
| Crown triangles | 348 | 544 | Combined below |
| Trunk triangles | 28 | 80 | Combined below |
| Total triangles per tree | 376 | 624 | 640 |
| Material batches | 2 | 2 | 2 |
| Image dimensions | 512 × 512 | 512 × 512 | 512 × 512 |

The additional 248 triangles per tree add 117,304 submitted triangles for all
473 Red Bull Ring instances and 94,984 for Dev Track's 383 instances. Matched
integrated views confirm these exact increases and unchanged draw calls.

The foliage shader uses one image, one explicit `GREATER_THAN` alpha threshold at
0.45, one Principled shader and one output. Only this declared, validated chain
permits a Math node in the pipeline. The packed PNG must match its pinned bytes.
The independent GLB checker requires the same image and double-sided `MASK`
material. Browser validation rejects external dependencies, oversized PNGs and
vertex allocations before loading, then verifies actual bounds and materials.

```powershell
node scripts/blender-tool.mjs export laptrix.blender-spruce.v1
node scripts/blender-tool.mjs check laptrix.blender-spruce.v1
```

The registered export retains the accepted study's geometry, material and image
bytes exactly; only root descriptive metadata and copyright differ. Source checks
reject wrong threshold operators, changed cutoffs, alpha bypass, wrong color
space and missing UVs. Twelve focused unit cases pass. The 22 integrated browser
cases pass in 8.1 minutes, covering unavailable/malformed delivery and retry,
both vehicles/tracks Onboard, source switching, instance bounds, lighting,
reference appearance, load extrema, imported terrain and graphics recovery.
Three Environment unmount/remount cycles at each width retain exact placement,
shared texture identity and stable renderer geometry/texture counts while
allocating fresh owned geometry.
The full local gate passes 354 TypeScript / 178 Python tests (46.70 seconds),
lint/types, eleven asset packages, source-context reproduction and build (878 ms).
All five Blender packages re-export byte-identically with the existing rejection
probes and five new cutout-source probes. The overnight production run passes
forty cases and records one 60-second timeout with a reported 12.7-hour duration
during the interrupted session. That unchanged showcase JSON/CSV case passes on
focused rerun. The original image-failure recovery journey is also retained and
passes with the authored GLB unavailable, covering the cone-to-textured fallback.
Together these checks cover all 42 distinct production cases; this is not a
single uninterrupted green run. The two focused cases are recorded in
`artifacts/spruce-study/final-production-recovery.log`. Remote acceptance is pending.

The integrated comparison retains 160 camera/motion captures across both cars,
both circuits and 1600/390 px widths: 56 matched static pairs plus 48 moving
frames from sixteen real Onboard Play sequences. The before state deliberately
uses the unchanged textured fallback; after states use normal GLB delivery.
All paired crown/trunk placement matrices match exactly. No extra solve, changed
lap result or runtime error is observed. Evidence is under
`artifacts/spruce-integrated/`; isolated prototype images remain separate.

Six additional native-GPU Onboard samples record 1,079 frames at about 60.0–60.2
fps on an identified RTX 3060 Ti/ANGLE Direct3D 11 at pixel ratio 1. Both cars run
on both tracks at desktop width, plus Red Bull Ring in narrow fullscreen. There
is zero measured anchor drift or runtime error. Red Bull Ring peaks at 68 calls /
574,348 submitted triangles for Formula and 69 / 558,264 for GT. Draw counts
remain unchanged. These roughly three-second samples do not establish sustained
lap or phone-hardware performance.

A separate 1600 px Red Bull Ring GT comparison uses the same SwiftShader renderer
and pixel ratio 1. The unchanged GT-body baseline at `867fae9` records 40 frames,
1.916634 lap seconds and 440,960 peak submitted triangles; the authored foliage
records 39 frames, 1.500034 lap seconds and 558,264 triangles. Both retain 69 peak
calls, zero anchor drift and zero runtime errors. Both fail the unchanged
requirement of more than two lap seconds within twelve wall-clock seconds.
These are single short samples, not a sustained benchmark or a claim of unchanged
performance. The triangle increase is explicit and software playback remains a
limitation. Baseline and integrated JSON/log evidence uses `spruce-software-*`.
Early baseline probe setup attempts imported the wrong isolated Vite cache and
are excluded; the recorded comparison uses the correct module instance.

## Remaining limitations

This is a shared alpha-card conifer with repeated structure, static foliage and
simplified bark. It improves nearby tree shape but does not create a surveyed
forest, seasonal variation or a complete circuit environment. Sparse placement
and approximate facilities remain visible. Broader circuit construction stays
paused until the existing slice meets the visual checkpoint.
