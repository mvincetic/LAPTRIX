# Red Bull Ring regional landscape

This is the next visual iteration within the existing finish–Turn 1 slice.
The candidate is integrated and passes its local functional/asset gates;
remote acceptance remains pending. Full-circuit facility expansion
stays paused. LAPTRIX Dev Track and all simulation inputs remain unchanged.

## Source and interpretation

The pinned regional terrain comes from Land Steiermark's public DGM service,
under CC BY 4.0. See [the complete source record](../data/sources/red-bull-ring/regional/README.md)
for exact requests, hashes, provider terms, license, attribution and modifications.
The crop spans 6 × 6 km in EPSG:32633, requested at 20 m service sampling. Its
intersecting survey blocks date to 2010–2012. Neither retrieval in 2026 nor storage
precision implies current surveyed accuracy.

Offline preparation uses the existing circuit finish origin and fixed height
offset. A 55 × 55 grid samples the outer pixel centres, about 111 m apart. Blender
receives metre coordinates in the same +X east / +Z south / +Y up runtime frame.
The browser never fetches GIS services or reads raster data. Existing physical
track attribution stays separate from the optional regional landscape's record.

The near-track ground is the existing inferred surface, not a new survey.
Beyond the protected foreground it blends toward historical regional elevations.
Meadow and forest tones are original artist interpretation, not classified land
cover or aerial imagery. Original grass color art reduces visible eight-metre
repetition; normal maps retain the existing physical scale and affect shading only.

## Protected foreground and editable source

The original foreground has 8,991 vertices and 17,600 triangles. Vertices within
320 m of the exact closed source line retain their coordinates; all modified
triangles must prove a conservative clearance greater than 270 m. The transition
reaches regional elevation by 700 m, before the original grid's outer boundary.
Fourteen connected perimeter rings extend to the regional crop.

The authored surface has 14,311 vertices and 28,240 triangles, one connected disk
with only its 380-edge outer perimeter open. It preserves 2,184 nearby vertices
and 4,161 complete foreground faces. Its minimum conservative changed-triangle
clearance is 278.247 m. The additional source-derived relief cannot bury the road,
move its earthworks or shift original tree sites inside that corridor.

Blender keeps a named `REGIONAL_TERRAIN_LOD0` mesh, editable `RegionalPalette`
vertex colors, metre-scaled UVs and shared packed grass images. Export validates
the actual evaluated source mesh. Missing foreground faces, moved vertices,
additional overlapping ground, duplicate/downward faces, stale provenance and
unsupported vertex-color blending are rejected. Ordinary GLB export retains art
edits; explicit source authoring rebuilds the initial cage and palette.

## Integrated asset and budget

The **7,578,437-byte** editable source exports a **5,017,628-byte** GLB with 109,834
total triangles, twelve batches and twelve materials. The package limit is
5.25 MB; the existing 120,000-triangle and sixteen-batch limits remain adequate.
Replacing the existing 17,600-triangle contextual ground adds 10,640 visible
triangles overall. The Blender package still contains five bounded PNG images;
the actual Three.js loader shares five textures/images despite eight glTF texture
references. No additional image allocation is required for the regional palette.

Independent binary comparison preserves every transform, position, normal and
index of the thirteen existing circuit nodes. Actual exported terrain rays agree
with the existing ground at all 474 tree bases and 3,600 road-footprint probes;
maximum numerical height difference is 0.00000475 m. This is an implementation
comparison, not a claim of survey precision. Four Blender rejection probes and
three independent GLB rejection probes also pass. All four integrated production
assets reproduce byte for byte. The Blender check also rejects four deliberate
regional source defects before verifying the restored source again.

The optional source-matched package hides the original contextual terrain while
retaining its buffers for fallback. Road, shoulders, apron and tree sites keep
their existing coordinates. Original grass material is shared across the apron
and regional mesh. A scene fog matching the existing daylight background starts
at 600 m and reaches full haze at 5,500 m. It mounts with the validated scenery,
restores the previous fog on removal, and consumes no clock or animation loop.
Loading failure, Environment off, Dev Track and imported circuits retain their
generic rendering. Source records retain their distinct physical/visual meaning.

The integrated capture pass verifies 32 camera/material states across
both cars, desktop and phone, start/finish and six seconds into the lap. The
desktop overview/chase and phone chase/onboard images were opened and reviewed.
The horizon is continuous and distant relief is visible; broad terrain remains
simplified and the near-track forest is sparse. This is an incremental slice
improvement, not acceptance of full-circuit facility expansion. All forty
production-browser journeys pass in 11.4 minutes; remote acceptance remains pending.
The retained track-information box also overlaps part of the cockpit in narrow
Onboard views. Follow with a focused presentation cleanup after this asset gate;
camera/telemetry behavior and transport controls must remain intact.

Four integrated native-GPU recordings retain actual 1× Play for both vehicles in
Chase and Onboard at 1280 × 800 fullscreen, with twenty moving frames through
eight lap seconds. These use the ordinary loaded package, with no prototype
injection. Reviewed frames show continuous road/ground contact, readable barriers
and braking boards, and distant relief through Turn 1. The Formula sample reads
298 km/h on the straight and 96 km/h during corner entry; time and speed come
from the unchanged lap. No runtime errors occur. Eight matched desktop camera
pairs preserve the preceding surface baseline and integrated regional result.
The checkpoint manifest records all source hashes and capture conditions under
`artifacts/visual-checkpoint/regional-landscape/`.

The complete local quality gate passes lint, strict types, asset/context validation,
342 TypeScript tests, 178 Python tests (47.32 seconds) and the production build.
All seventeen focused development journeys pass in 5.3 minutes: daylight source
switches and shadow reuse, foliage resources, eight GPX validation/recovery/
restoration paths, both ground-material lifecycle cases and scenery recovery.
The ground cases explicitly check regional-map sharing, retained geometry,
foreground replacement, haze cleanup, no extra solves and Dev Track isolation.
Nine broader journeys pass in 3.4 minutes, covering apex readability through
camera/playback changes, large imported-circuit framing, terrain clearance and
zero settled rendering. The original test deadlines remain unchanged.

Six native-GPU sequences record 1,076 frames at approximately 60.0–60.3 fps on
RTX 3060 Ti / ANGLE Direct3D 11, pixel ratio one. Both cars run on both tracks at
1600 × 900, with an additional 390 × 900 fullscreen pair on Red Bull Ring.
Peak Red Bull Ring submission counts are 68 calls / 457,044 triangles for Formula
and 69 / 433,976 for GT. Against the preceding material-only samples, draw calls
are unchanged and rendered triangles increase by 10,640. Fixed scenery anchors
retain zero drift and all six sequences report zero runtime errors. These are
roughly three-second desktop samples, not sustained or mobile-device guarantees.

The current integrated software-renderer probe **fails** the unchanged requirement
to advance beyond two lap seconds within twelve wall seconds: it reaches
1.549934 seconds. Retain `artifacts/regional-software.log` as a separate performance
limitation. The preceding surface candidate and isolated unchanged `12b42cb` also
missed that deadline, but those older measurements do not prove that this larger
regional scene has no additional software-renderer cost. Neither the deadline
nor the authoritative playback clock was changed.

The earlier in-browser prototype retains 24 desktop/phone camera states, four
actual Play recordings and twenty moving frames for GT/Formula Chase/Onboard.
These show a more continuous landscape and distant relief. They manually inject
the study and retain extra cached resources, so they cannot establish the final
integrated renderer's memory or performance budget. Final source isolation,
fallback, toggles, clock preservation, camera/motion review and production/CI
checks are recorded separately for the integrated candidate above.

Evidence is retained under ignored `artifacts/terrain-context-study/`: the
rehearsal `.blend`/GLB, geometry and grounding comparisons, source/GLB contract
probes, texture-sharing proof, camera screenshots and `motion/` recordings.
Integrated numerical proofs use the `integrated-geometry-proof.json` and
`integrated-ground-contact-proof.json` files in that directory. Final browser
captures and recordings are separate from the prototype as described above.
The software-motion deadline remains unresolved; neither native nor prototype
checks relabel it as passed.
