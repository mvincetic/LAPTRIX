# Original track vegetation

`laptrix.spruce.v1` replaces the uniform scenery cones with an original spruce
bough on static branch cards and a tapered trunk. Both circuits retain their
existing contextual tree positions. These are schematic scale cues, not surveyed
trees or a reconstruction of Red Bull Ring's actual vegetation.

## Source and runtime package

The built-in OpenAI `image_gen` tool generated one original transparent bough with
no reference images. `assets/environment/spruce-generation.json` records the
complete prompt, tool, date and absence of third-party inputs. The unchanged
1254² RGBA PNG is retained as `spruce-bough-source.png` (1,406,813 bytes). This is
an original project asset under the repository's distribution policy; the package
does not add a repository licence grant or claim third-party image rights.

`npm run export:foliage` uses the package-locked Playwright Chromium to encode a
512² WebP at quality 0.9, with high-quality resampling and alpha. It is an offline
asset conversion, with no API call or network image. The runtime file is 91,404
bytes (89.3 KiB), below its 128 KiB limit. `-- --check` compares a local re-export
with the checked-in file; encoder byte identity across operating systems is not
assumed. Normal CI validates both committed hashes, dimensions, RGBA/alpha flags,
provenance paths and geometry parameters without requiring an installed browser.
Only the WebP is imported by the viewer; the original PNG and prompt do not ship
in the browser bundle. A future re-export must update the manifest hash after QA.

## Shape, placement and lighting

Nine irregularly spaced tiers each carry seven radial boughs. Two inclined cards
per bough avoid an entirely flat silhouette from elevated and ground views. Fine
needle edges use alpha testing at 0.45, opaque depth writes and double-sided
single-pass rendering. Rounded canopy normals soften card lighting changes. A
small interior samples a dense needle patch to retain a quiet distant silhouette
after mip filtering. Soft upward lighting normals and the actual needle texture
avoid the flat dark facets found in the first close review. It uses the same
material and draw call. The crown contains
348 triangles. The seven-sided tapered trunk adds 28, for 376 triangles per tree.

The crown remains inside its former normalized radius of one and y interval
[-0.5, 0.5]. Existing 9–15 m crown heights, 0.42 radius ratio and 1.5 m crown base
remain intact. Stable instance yaw and a restrained tint vary repeated shapes.
The trunk follows the same terrain contact, embeds 0.15 m and tapers almost to zero
below the crown tip. Source road geometry, existing tree exclusion corridors,
tree seeds and rendered terrain sampling are unchanged. The Dev Track retains
383 trees; Red Bull Ring retains 474. Instance matrices, colors and culling
boxes/spheres update together after source or fallback changes.

## Loading and resource ownership

The texture is requested only when Environment mounts. One cached texture retains
its decoded image for source changes, Environment remounts and WebGL restoration.
At most one additional texture is retained per renderer. The 512² RGBA base is
1 MiB, approximately 1.33 MiB including the full mip chain, excluding driver and
decoded-image overhead. Anisotropy is bounded at four. Each mounted tree group
owns its geometry/materials and releases them on unmount. Camera movement and
ordinary UI edits reuse geometry, instance buffers and texture identity.

There are still two tree draw batches. Trees do not cast additional shadows.
The asset adds no frame callback, timer, wind simulation, camera-facing rotation
or independent playback clock. Alpha-tested cards increase vertex/fragment work;
draw counts alone are not a performance claim. Actual camera/motion and paused
resource checks accompany the visual review.

While the texture is pending or unavailable, the previous simple crown remains
visible. A failed optional load logs a concise warning, drops the rejected cache
entry and retries when Environment is toggled. The completed lap, pending edits,
reference, source provenance and playback time remain usable throughout.

## Verification

Geometry tests check the original envelope, deterministic buffers, finite
attributes, normalized lighting normals, UV bounds, nondegenerate faces and their
winding. Browser tests check alpha coverage, the dense interior sample, both
source matrix sets, refreshed culling bounds, texture/geometry reuse and optional
503 recovery against actual compositor pixels. The production delivery check
also retains the complete exported workspace and paused cursor through three
Environment cycles. Existing graphics-loss and idle checks cover the richer scene.

With LAPTRIX running, `node scripts/foliage-qa.mjs` captures both tracks at 1600,
1280 and 390 px in four real cameras and four close inspection angles. It records
instance/resource identities, buffer sizes, draw/triangle/texture counts, bounds,
page overflow and browser errors. `scripts/onboard-qa.mjs` and
`scripts/trackside-motion-qa.mjs` cover both vehicle categories and continuous
shared-clock playback. The final gate passes 311 TypeScript / 152 Python tests;
48 final foliage views, 52 onboard captures, six continuous sequences, 28 combined
development journeys and all 35 production journeys pass. See
PRODUCT_PRESENTATION.md for the measured final results.
