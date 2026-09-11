"""Reproduce the approximate GP circuit from licensed, pinned local source data.

See data/sources/red-bull-ring/README.md. No network requests or solver fitting.
Install optional scripts/requirements-geodata.txt in a separate environment.
"""

import argparse
import hashlib
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sources/red-bull-ring"


def reconstruct():
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    for name, info in manifest["files"].items():
        if hashlib.sha256((SOURCE / name).read_bytes()).hexdigest() != info["sha256"]:
            raise ValueError(f"Pinned source hash does not match: {name}")
    root = ET.parse(SOURCE / "osm-gp.osm").getroot()
    nodes = {e.get("id"): e for e in root.findall("node")}
    ways = {e.get("id"): e for e in root.findall("way")}
    relation = next(e for e in root.findall("relation") if e.get("id") == str(manifest["osm"]["relation"]))
    included = [
        e.get("ref")
        for e in relation.findall("member")
        if e.get("type") == "way" and e.get("ref") not in manifest["osm"]["excludedWays"]
    ]
    if included != manifest["osm"]["gpWays"]:
        raise ValueError("GP way order differs from the inspected relation")
    chain = []
    for way_id in included:
        way = ways[way_id]
        if not any(e.get("k") == "oneway" and e.get("v") == "yes" for e in way.findall("tag")):
            raise ValueError("Expected a forward-directed raceway")
        refs = [e.get("ref") for e in way.findall("nd")]
        if chain and chain[-1] != refs[0]:
            raise ValueError("GP ways do not connect in their declared direction")
        chain.extend(refs[1:] if chain else refs)
    if chain[0] != chain[-1] or len(set(chain[:-1])) != len(chain) - 1:
        raise ValueError("Expected one closed GP ring without repeated internal nodes")
    ring = chain[:-1]
    seam = ring.index(manifest["osm"]["finishNode"])
    ring = ring[seam:] + ring[:seam]
    ring.append(ring[0])
    lonlat = np.array([[float(nodes[n].get("lon")), float(nodes[n].get("lat"))] for n in ring])
    projection = Transformer.from_crs(4326, 32633, always_xy=True)
    xy = np.array(projection.transform(lonlat[:, 0], lonlat[:, 1])).T
    origin = xy[0].copy()
    local = xy - origin
    chord = np.r_[0, np.cumsum(np.linalg.norm(np.diff(local, axis=0), axis=1))]
    curve = CubicSpline(chord, local, bc_type="periodic")
    dense = curve(np.linspace(0, chord[-1], int(np.ceil(chord[-1] * 2)) + 1))
    arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(dense, axis=0), axis=1))]
    n = int(np.ceil(arc[-1] * 2))
    uniform = np.linspace(0, arc[-1], n, endpoint=False)
    horizontal = np.column_stack([np.interp(uniform, arc, dense[:, i]) for i in range(2)])
    # Bilinear DGM heights refer to pixel centres in the same UTM coordinate system.
    with rasterio.open(SOURCE / "terrain-1m.tif") as dataset:
        if dataset.crs.to_epsg() != 32633 or dataset.res != (1, 1):
            raise ValueError("Unexpected terrain CRS or pixel size")
        cols, rows = (~dataset.transform) * (horizontal[:, 0] + origin[0], horizontal[:, 1] + origin[1])
        cols, rows = cols - 0.5, rows - 0.5
        c, r = np.floor(cols).astype(int), np.floor(rows).astype(int)
        if (
            np.any(c < 0)
            or np.any(r < 0)
            or np.any(c + 1 >= dataset.width)
            or np.any(r + 1 >= dataset.height)
        ):
            raise ValueError("Route falls outside the pinned terrain crop")
        raster = dataset.read(1)
        fx, fy = cols - c, rows - r
        heights = (
            (1 - fx) * (1 - fy) * raster[r, c]
            + fx * (1 - fy) * raster[r, c + 1]
            + (1 - fx) * fy * raster[r + 1, c]
            + fx * fy * raster[r + 1, c + 1]
        )
    if not np.isfinite(heights).all() or not ((heights > 500) & (heights < 900)).all():
        raise ValueError("Terrain samples contain missing or implausible heights")
    # Contextual 2010 terrain is not a road survey. A fixed 30 m spatial Gaussian
    # suppresses pixel-scale relief; it is chosen independently of any lap time.
    filtered = gaussian_filter1d(heights, sigma=30 / (arc[-1] / n), mode="wrap", truncate=4)
    targets = np.linspace(0, arc[-1], 720, endpoint=False)
    closed_axis = np.r_[uniform, arc[-1]]
    horizontal = np.vstack([horizontal, horizontal[0]])
    xz = np.column_stack([np.interp(targets, closed_axis, horizontal[:, i]) for i in range(2)])
    absolute = np.interp(targets, closed_axis, np.r_[filtered, filtered[0]])
    relative = absolute - absolute.min()
    points = [
        dict(
            x=round(float(p[0]), 4),
            y=round(float(h), 4),
            z=round(float(-p[1]), 4),
            widthLeft=6.0,
            widthRight=6.0,
            banking=0,
        )
        for p, h in zip(xz, relative)
    ]
    for p in points:
        for key in ("x", "y", "z"):
            if p[key] == 0:
                p[key] = 0.0
    # Record source deviation against the actual mapped segments, not just nodes.
    vectors = np.diff(local, axis=0)
    residual = dense[:, None, :] - local[None, :-1, :]
    fractions = np.clip(np.sum(residual * vectors, axis=2) / np.sum(vectors * vectors, axis=1), 0, 1)
    deviation = np.linalg.norm(residual - fractions[:, :, None] * vectors, axis=2).min(axis=1)
    if deviation.max() > 5:
        raise ValueError("Interpolated route exceeds the 5 m source-deviation bound")
    xyz = np.array([[p[k] for k in ("x", "y", "z")] for p in points])
    delta = np.roll(xyz, -1, axis=0) - xyz
    ds = np.linalg.norm(delta, axis=1)
    report = {
        "format": "laptrix-red-bull-ring-reconstruction-v1",
        "samples": len(points),
        "originUtm33n": origin.tolist(),
        "finishNode": manifest["osm"]["finishNode"],
        "mappedPlanLengthMetres": float(chord[-1]),
        "reconstructedPlanLengthMetres": float(arc[-1]),
        "sourceLength3dMetres": float(ds.sum()),
        "maxPlanDeviationMetres": float(deviation.max()),
        "terrainHeightRangeMetres": [float(heights.min()), float(heights.max())],
        "filteredAbsoluteHeightRangeMetres": [float(absolute.min()), float(absolute.max())],
        "maxHeightFilterChangeMetres": float(np.abs(filtered - heights).max()),
        "sourceElevationRangeMetres": float(relative.max()),
        "sampleSpacingMetres": [float(ds.min()), float(ds.max())],
        "maxConventionalGrade": float(np.max(np.abs(delta[:, 1]) / np.linalg.norm(delta[:, [0, 2]], axis=1))),
        "signedPlanAreaSquareMetres": float(
            np.sum(local[:-1, 0] * local[1:, 1] - local[1:, 0] * local[:-1, 1]) / 2
        ),
        "elevationGaussianSigmaMetres": 30,
        "widthEachSideMetres": 6,
        "sectorFractions": [0.3333333333333333, 0.6666666666666666, 1],
    }
    track = dict(
        schemaVersion=2,
        id="red-bull-ring",
        name="Red Bull Ring",
        country="Austria · Spielberg",
        synthetic=False,
        closed=True,
        provenance=(
            "Approximate GP reconstruction: © OpenStreetMap contributors (ODbL 1.0), relation 5309181 v8. "
            "Elevation: Land Steiermark DGM, CC BY 4.0, Judenburg 2010 flight. Retrieved 2026-09-11. "
            "Widths and sectors estimated; not an official survey. See data/sources/red-bull-ring/README.md."
        ),
        attribution={
            "sources": [
                {
                    "title": "GP centerline",
                    "credit": "© OpenStreetMap contributors",
                    "url": "https://www.openstreetmap.org/relation/5309181",
                    "license": "ODbL 1.0",
                    "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
                },
                {
                    "title": "Terrain elevation · 2010",
                    "credit": "Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at",
                    "url": "https://data.steiermark.at/cms/beitrag/12803290/97428847/",
                    "license": "CC BY 4.0",
                    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                },
            ],
            "notes": (
                "Mapped GP layout, excluding pit lane and MotoGP chicanes. Periodic interpolation, "
                "720 samples, bilinear DGM heights and 30 m Gaussian height smoothing. Width 12 m and "
                "equal-distance sectors are estimates. Scenery is procedural; heights describe 2010 terrain, "
                "not a current race-surface survey."
            ),
            "documentationUrl": "https://github.com/mvincetic/LAPTRIX/blob/codex/autonomous-mvp/data/sources/red-bull-ring/README.md",
        },
        sectorFractions=report["sectorFractions"],
        points=points,
    )
    return track, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify committed outputs without writing")
    args = parser.parse_args()
    track, report = reconstruct()
    for path, value in [
        (ROOT / "data/tracks/red-bull-ring.json", track),
        (SOURCE / "reconstruction.json", report),
    ]:
        content = json.dumps(value, indent=2, ensure_ascii=False) + "\n"
        if args.check:
            if path.read_text(encoding="utf-8") != content:
                raise SystemExit(f"Reconstruction differs: {path}")
        else:
            path.write_text(content, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
