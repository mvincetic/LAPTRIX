# Red Bull Ring regional terrain study

This bounded source package prepares distant landscape context for the existing
Blender slice. It does **not** modify the simulation track or its original 1 m
elevation crop. The regional source now drives the optional authored landscape;
see [integration and validation](../../../../docs/REGIONAL_LANDSCAPE.md).

**Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at.** The supplied
terrain contents are licensed under
[CC BY 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Retain this attribution, source link, license and description of modifications.
The complete license is [../CC-BY-4.0.txt](../CC-BY-4.0.txt). The
[official dataset](https://data.steiermark.at/cms/beitrag/12803290/97428847/)
and [provider terms](https://data.steiermark.at/cms/ziel/95633648/DE/) identify the
source and reuse terms. The provider does not endorse LAPTRIX.

## Pinned data

Retrieved 2026-09-16. `manifest.json` retains exact requests, bounds and SHA-256
hashes. `terrain-20m.tif` is the unchanged GeoTIFF part of the WCS 2.0.1 multipart
response for **Coverage4**, the terrain-height model. The request asks the service
for a 300×300 grid across easting 479000–485000 and northing 5227500–5233500 in
EPSG:32633. The actual file has 20 m pixels, float32 heights and no missing samples.
This is a service-resampled regional crop, not a claim of 20 m survey accuracy.

The envelope query in `flight-blocks.json` intersects **Judenburg 2010, Gleinalm
2011 and Seckau 2012**, adopted into the service in 2020. These are historical
terrain epochs; the 2026 retrieval date is not the survey date. The original
circuit reconstruction remains bound to its separately documented Judenburg 2010
input. `wcs-capabilities.xml` retains the service's reuse notice, whose informal
CC BY AT wording links the international license identified by the provider terms.

## Offline preparation

With the existing optional GIS environment from the parent source README:

```powershell
artifacts/geodata-env/Scripts/python.exe scripts/import_regional_terrain.py
artifacts/geodata-env/Scripts/python.exe scripts/import_regional_terrain.py --check
```

The script verifies every source hash, raster bounds/CRS/resolution and the pinned
track coordinate-frame record. It bilinearly samples pixel-centred heights into
a 55×55 grid spanning the outermost pixel centres (about 111 m between samples).
Coordinates use the existing finish origin: +X east, +Z south, +Y up, with the
same fixed absolute-height offset as the circuit. Heights are rounded to 0.1 mm
for deterministic storage; this precision does not imply comparable accuracy.

The generated `assets/blender/tracks/red-bull-ring-regional.json` stores its source
manifest hash, attribution and coordinate frame. `--check` reproduces it without
writing files or making network requests. The GIS tools are preparation-only;
the browser does not contact this service or load the GeoTIFF.

The ignored Blender/browser prototype blends distant elevations toward the
unchanged existing foreground. Its meadow/forest color variation is original
artist interpretation, not surveyed land-cover classification or aerial imagery.
The prototype established the initial visual direction. Final integrated
clearance, lifecycle, visual and production checks are recorded separately.

## Prepared authoring contract

`scripts/blender/regional_geometry.py` preserves complete foreground triangles,
keeps vertices within 320 m of the source unchanged, and requires every changed
triangle to prove at least 270 m clearance from the closed source line. Distant
heights blend to the regional grid by 700 m. Fourteen rectangular rings connect
the existing foreground to the source crop as one continuous surface. These
radii protect the original roadside vegetation and authored facilities; they do
not assert that the generic near-track ground is surveyed.

The prepared surface has 14,311 vertices and 28,240 triangles. The extracted
Blender authoring rehearsal retains all 13 original circuit nodes and 2,184
protected vertices exactly in its GLB. Its closest changed triangle has a
conservative clearance of 278.247 m. The actual editable source retains 4,161
protected faces and bounded `RegionalPalette` vertex paint. It uses the existing
grass maps; the real Three.js loader shares five texture objects and five decoded
images across the complete rehearsal package.

Independent Python and JavaScript checks bind the prepared grid to original
source bytes, credits and the existing circuit coordinate frame. Blender checks
reject stale source metadata, lost credits, moved protected ground and shader
mixes that cannot retain the same vertex-color meaning in glTF. Original distant
paint remains editable. GLB checks independently require the declared ground
mesh/material, physical UV scale and bounded vertex colors.

These source/prototype checks do not certify the integrated browser's performance.
The runtime package now includes the authored landscape, with source-track data
unchanged. Complete integrated acceptance is documented in REGIONAL_LANDSCAPE.md.
