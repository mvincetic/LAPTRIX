# Red Bull Ring GP reconstruction

This is the first real-circuit showcase for LAPTRIX, alongside the preserved
LAPTRIX Dev Track. It is an **approximate reconstruction**, not an official circuit
survey, game asset or calibrated Formula1 model. No circuit logos, proprietary
images, CAD, audio or measured racing telemetry are included.

## Sources and licenses

**GP layout: © OpenStreetMap contributors.** The pinned OSM extract and the
OSM-derived `../../tracks/red-bull-ring.json` database are made available under
the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
(ODbL). Retain this notice and license, including on redistributed derivatives.
See [OSM copyright and attribution](https://www.openstreetmap.org/copyright)
and the local `ODbL-1.0.txt`. The complete derivative, machine-readable source
extract and transformation algorithm are provided in this repository.

**Elevation: Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at.**
The terrain crop and its elevation contents are provided under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/),
with the [provider's OGD terms](https://data.steiermark.at/cms/ziel/95633648/DE/).
Retain this credit, license, source and modification information. The local
`CC-BY-4.0.txt` contains the license; the supplied raster and metadata are from the
[Steiermark terrain dataset](https://data.steiermark.at/cms/beitrag/12803290/97428847/).
The combined circuit database is distributed under ODbL; the elevation contents
retain their CC BY attribution obligations. These data licenses do not relabel
the original LAPTRIX source code, development circuit or vehicle profiles.
The sources provide data without warranties; neither provider endorses LAPTRIX.

Source credits and license links remain visible next to the viewer, including in
fullscreen. Track inspection links the data sources and explains transformations.
Track, native-lap and timing-reference JSON retain attribution. Attributed telemetry
and comparison CSV downloads are labelled **+ credits (ZIP)** and contain the
unchanged numeric CSV, `SOURCE_LICENSES.txt` and `source-attribution.json` together.
Preserve those notices when extracting or redistributing the table.

## Pinned inputs — retrieved 2026-09-11

`manifest.json` records exact requests, source versions, byte sizes and SHA256
hashes. Original network response hashes identify the inputs before subsetting.
Runtime and reconstruction use only the files here; they do not fetch map tiles,
elevation services or third-party assets while the user works.

- `osm-gp.osm`: relation **5309181 v8**, its 17 member ways and their referenced
  nodes, from the bounded OSM API map request in the manifest. The extraction keeps
  geometry, tags, IDs, versions, timestamps and membership; it omits contributor
  account fields and unrelated map objects. The snapshot's relation timestamp is
  2026-05-14. This is a focused data extract, not a copy of the OSM website.
- `terrain-1m.tif`: 1460×1000 float pixels in EPSG:32633, 1m cell size, covering
  easting481280–482740 and northing5229450–5230450. The ArcGIS WCS2.0.1 request uses
  **Coverage4**, the terrain-height model; Coverage1/2 are hillshades and were not
  interpreted as elevation. The TIFF was extracted from the response's MIME part
  and losslessly DEFLATE-compressed (predictor3). Exact pixel equality, CRS and
  transform were verified against the original TIFF before committing the crop.
- `flight-block.json`: the service's point query identifies **Judenburg, flight2010,
  block10**, adopted into the service in2020. This is the data epoch, not2026.
- `wcs-capabilities.xml`: retained service capability/license information. Its
  informal CC BY AT wording links the international license; the provider's OGD
  terms explicitly identify CC BY4.0 International.

The raw XML/metadata hashes are protected from Git line-ending conversion.
`*.tif` is marked binary. The original larger bbox/multipart responses remain in
the ignored research artifacts; all inputs required to reproduce the final track
are committed here.

## Route, origin and direction

The importer follows these 14 forward-directed GP ways in relation order:

```text
347958266 822592398 822592399 822592400 822592401 822592402 822592405
822592406 822592407 822592408 822592409 822592410 822592403 822592404
```

It excludes way289111668 (pit lane), way823820476 (MotoGP long-lap penalty) and
way1077423714 (MotoGP chicane). All connections are exact; the ring has247 unique
nodes plus its duplicated closure. The mapped one-way direction is clockwise.
The [circuit operator's GP/MotoGP explanation](https://www.redbullring.com/en/news/the-track-is-hot-f1-motogp-track/)
confirms that the extra chicane belongs to the motorcycle layout.

Lap progress0/1 uses the mapped **finish node13826152422**. The distinct mapped
start node13826152421 is about120.07m farther along the straight; it is not silently
treated as the same point. The chain is rotated to the finish vertex before
interpolation. Local x points east, z south and y up. The origin is finish easting/
northing in EPSG:32633; y is shifted by the final minimum height.

## Reproducible transformation

`scripts/import_red_bull_ring.py` verifies source hashes and the exact directed,
closed route before generating anything. In repository-root PowerShell:

```powershell
python -m venv artifacts/geodata-env
artifacts/geodata-env/Scripts/python.exe -m pip install -r scripts/requirements-geodata.txt
artifacts/geodata-env/Scripts/python.exe scripts/import_red_bull_ring.py
artifacts/geodata-env/Scripts/python.exe scripts/import_red_bull_ring.py --check
```

On macOS/Linux, use `artifacts/geodata-env/bin/python`. These optional preparation
dependencies are separate from the application runtime. The `--check` mode compares
both generated files with the committed outputs and performs no writes or network
requests. The pinned source-tool versions are NumPy2.5.3, SciPy1.18.1, pyproj3.8.0
and rasterio1.5.1.

1. Project WGS84 node longitude/latitude to UTM33N with explicit x/y axis order.
2. Fit a periodic cubic spline in mapped chord distance. Evaluate densely, then
   derive a uniform horizontal arc grid at no more than0.5m spacing. The importer
   rejects any curve exceeding5m nearest-segment deviation; the actual maximum
   is **0.865m**. It does not stretch the plan to a published lap length.
3. Bilinearly sample pixel-centred DGM heights along that grid. Reject out-of-crop,
   nonfinite or implausible height samples. Smooth periodically with a spatial
   Gaussian **sigma30m**, truncated at4sigma. This is a reconstruction assumption,
   chosen to reduce short terrain features, not to fit a lap time.
4. Resample to720 points; use x=east, y=height minus minimum, z=south. Round metric
   coordinates to0.1mm, canonicalize zero and omit the duplicated closing point.
5. Assign **6m width per side**, zero banking and sector fractions1/3,2/3,1.
   Width, banking and sectors are explicit estimates, not surveyed edge or official
   timing-loop positions. The solver uses the same generic source-gate contract.

`reconstruction.json` records the actual resulting measurements:

| Quantity | Reconstruction |
| --- | ---: |
| Mapped horizontal polyline | 4306.888m |
| Interpolated horizontal curve | 4307.620m |
| Final 3D source polyline | 4311.389m |
| Final elevation range | 63.272m |
| Final source spacing | 5.937–6.026m |
| Maximum conventional grade | 12.018% |
| Maximum height change from smoothing | 6.084m |

## Limits relevant to the showcase

The 2010 DGM contains a short negative feature about370m after the finish line.
An initial sigma10m profile still produced a local27.1% grade; the retained30m
filter reduces that feature while keeping the broader hill profile. The maximum
6.084m adjustment is significant and is **not evidence of the true road height**.
The precise cause of the source feature has not been established. Current road
surface, curbs, earthworks, track widths, barriers and scenery are not surveyed by
this reconstruction. Generated terrain/trees remain original contextual scenery.

The [operator's current circuit page](https://www.redbullring.com/en/events-tickets/formula-1/formula-1-circuit/)
reports4326m and10 official turns; its note explains a2024 change to centreline
measurement. Those values are factual comparison references, not imposed fitting
targets. LAPTRIX displays its actual geometry length and **detected** corner count;
detected features do not claim the official numbering. Vehicle physics, lap times
and scenery remain approximate development output.
