# GT rear bodywork refinement — 2026-09-16

The previous GT ended in a broad flat painted cap, with its grille and exhausts
standing in front of that surface. The revised editable Blender model rolls the
painted skin into a recessed carbon surround, seats a narrower grille inside it
and opens the actual lower shell around a shaped diffuser exit. Six solid
strakes follow the ramp's taper. Smaller exhaust outlets fit above the ramp.
The original rear lamps, wing, cabin and outer vehicle envelope remain intact.

Carbon is darker, rougher and less metallic across the existing material. This
also affects the splitter, wing, wheel centers and tread channels, so front and
side views are part of acceptance. No texture, material slot or draw batch is
added. The result is original LAPTRIX modeling, with no downloaded geometry,
manufacturer reference mesh or third-party licensing change.

## Editable source and limits

`assets/blender/vehicles/gt.blend` remains the source of truth; ordinary export
retains artist edits. `scripts/blender/author_gt.py` is the explicit reconstruction
recipe. Its rear control rings and boolean opening form the bodywork; the carbon
recess follows the same rings with a thin solid shell. Material consolidation
preserves editable mesh islands and the native named wheel/lamp rig.

| Resource | Previous | Refined | Existing limit |
| --- | ---: | ---: | ---: |
| Editable Blender bytes | 2,709,779 | 2,773,442 | Source asset |
| Runtime GLB bytes | 1,322,736 | 1,362,548 | 2,500,000 |
| Triangles | 41,630 | 42,770 | 60,000 |
| Material batches | 29 | 29 | 48 |
| Materials | 10 | 10 | 10 |
| Image textures | 0 | 0 | 0 |

Runtime size increases by 39,812 bytes (3.0%); geometry increases by 1,140
triangles (2.7%). The exact existing GLB bounds remain unchanged: minimum
`[-1.0269999504, -0.0004999936, -2.2420001030]`, maximum
`[1.0269999504, 1.3895000219, 2.1649999619]` metres. All existing node transforms
match; the four wheel assemblies and both lamp meshes retain exact geometry. The physical profile,
source tracks, native pose, steering, wheel distance and PlaybackClock do not
change. Brake-light intensity still consumes the rendered lap's brake demand.

The manifest pins source SHA-256
`b0db3fb600708f9a4cf57dad3200968608473cd98b5ee13ceb593d4778faa411`
and runtime SHA-256
`d59c4932a547c09add039b512aca9e6651c57a836bd38fbf210ac922ee7b0a1d`.

```powershell
node scripts/blender-tool.mjs export laptrix.blender-gt.v1
npm run check
npm run blender:check
```

Intentional reconstruction uses
`node scripts/blender-tool.mjs author laptrix.blender-gt.v1 --replace-source`.
It replaces artist edits; it is not required for normal export or validation.

## Browser review and verification

Two isolated original studies are retained under `artifacts/gt-fascia-study/`.
The first exposed an unfinished-looking diffuser ramp and was rejected. The
second adds a conforming carbon recess and the quieter material response.
Fourteen paired desktop captures cover front/rear/side, Chase at 0/6/8 seconds
and Onboard at 6 seconds. Four actual Play sequences compare the prior and
revised models at 1600 and 390 px, with twenty moving frames and eight separate
coast/braking views. Wheel rotation, vehicle motion, brake intensity, unchanged
lap results and zero additional solves/errors are checked on the real app.
Those captures use isolated binary routing and are labeled as studies.

The integrated source has the same positions, normals, indices, rig and materials
as the accepted study. Reauthoring changes only 56 unused body UV components by
at most `5.960464477539063e-8`; JSON structure is identical. This is recorded in
`integration-proof.json`, rather than claiming byte identity between separate
authoring runs. Exporting the final checked-in `.blend` is byte-identical.

The complete local gate passes lint, types, ten asset packages, physical context
reproduction, 342 TypeScript tests, 178 Python tests (47.01 seconds) and production
build. All four Blender sources re-export byte-identically and actual-source
rejection probes pass. Sixteen integrated browser journeys pass in 5.4 minutes:
both vehicles' delayed/failed delivery and retry, native Onboard preservation,
current/reference compositor checks, daylight/shadow reuse and imported terrain.

Thirty-six matched captures in `artifacts/gt-fascia-integrated/` compare the
previous binary with the actual integrated asset at 1600 and 390 px. The eighteen
pairs cover Overview, Top, Chase at 0/6/8 seconds, Onboard at 6 seconds and close
front/rear/side views, with exact paused cursor checks and zero runtime errors.
Only the previous binary is substituted; integrated captures load the normal
application asset. The close inspection camera is a QA orbit and retreats at
phone width to contain the full car; production camera behavior is unchanged.

Three separate native-GPU Onboard samples exercise the GT on both circuits at
desktop width and Red Bull Ring at 390 px/fullscreen. They record 537 frames at
approximately 60.1–60.2 fps on an identified RTX 3060 Ti/ANGLE Direct3D 11 at
pixel ratio 1, with zero fixed-anchor drift and runtime errors. Red Bull Ring's
desktop peak remains 69 calls, with 436,256 submitted triangles: 2,280 more than
the prior regional GT sample, including shadow submission. These are short
three-second host measurements, not sustained-lap or phone-hardware guarantees.
See `artifacts/gt-fascia-native-qa.json`. The separately recorded regional
software-motion deadline remains unmet; this pass does not claim to resolve it.

All forty production-browser cases pass in 11.6m. Six additional integrated
current/reference captures at desktop and phone widths retain the blue current
car and distinct translucent reference. The working revision is ready to commit
and push; remote acceptance must be verified for the resulting revision.

This is a bounded improvement to the GT's rear, not completion of the overall
visual quality target. The front grille and some side panel/stripe transitions
remain simplified. The environment still has sparse vegetation and approximate
facilities. Full-circuit expansion stays paused while the existing slice improves.
