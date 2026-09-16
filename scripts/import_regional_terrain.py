"""Prepare a bounded visual landscape grid from pinned licensed regional DGM data.

Optional GIS preparation only; ordinary Blender export/runtime needs no GIS tools
or network. The simulation track remains untouched. See the regional source README.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sources/red-bull-ring/regional"
OUTPUT = ROOT / "assets/blender/tracks/red-bull-ring-regional.json"


def reconstruct():
    raw = (SOURCE / "manifest.json").read_bytes()
    manifest = json.loads(raw)
    for name, info in manifest["files"].items():
        data = (SOURCE / name).read_bytes()
        if len(data) != info["bytes"] or hashlib.sha256(data).hexdigest() != info["sha256"]:
            raise ValueError(f"Regional source changed: {name}")
    frame_bytes = (SOURCE.parent / "reconstruction.json").read_bytes()
    if hashlib.sha256(frame_bytes).hexdigest() != manifest["trackReconstructionSha256"]:
        raise ValueError("Track coordinate frame changed")
    frame = json.loads(frame_bytes)
    with rasterio.open(SOURCE / "terrain-20m.tif") as dataset:
        if (
            dataset.crs.to_epsg() != 32633
            or dataset.res != (20, 20)
            or dataset.shape != (300, 300)
            or list(dataset.bounds) != manifest["boundsUtm33n"]
        ):
            raise ValueError("Unexpected regional CRS, bounds or sampling")
        raster = dataset.read(1, masked=True)
        if np.any(raster.mask) or not np.isfinite(raster).all():
            raise ValueError("Missing regional heights")
        size = 55
        east = np.linspace(dataset.bounds.left + 10, dataset.bounds.right - 10, size)
        north = np.linspace(dataset.bounds.top - 10, dataset.bounds.bottom + 10, size)
        x, y = np.meshgrid(east, north)
        col, row = (x - dataset.bounds.left) / 20 - 0.5, (dataset.bounds.top - y) / 20 - 0.5
        c, r = np.clip(np.floor(col).astype(int), 0, 298), np.clip(np.floor(row).astype(int), 0, 298)
        u, v = col - c, row - r
        height = (raster[r, c] * (1 - u) + raster[r, c + 1] * u) * (1 - v)
        height += (raster[r + 1, c] * (1 - u) + raster[r + 1, c + 1] * u) * v
        if not ((height > 500) & (height < 1600)).all():
            raise ValueError("Implausible regional heights")
    origin = frame["originUtm33n"]
    return {
        "format": "laptrix-regional-terrain-grid-v1",
        "sourceManifest": "data/sources/red-bull-ring/regional/manifest.json",
        "sourceManifestSha256": hashlib.sha256(raw).hexdigest(),
        "attribution": manifest["attribution"],
        "originUtm33n": origin,
        "heightDatumMetres": frame["filteredAbsoluteHeightRangeMetres"][0],
        "size": size,
        "boundsXZ": [
            round(east[0] - origin[0], 4),
            round(origin[1] - north[0], 4),
            round(east[-1] - origin[0], 4),
            round(origin[1] - north[-1], 4),
        ],
        "heights": np.round(height - frame["filteredAbsoluteHeightRangeMetres"][0], 4).tolist(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = json.dumps(reconstruct(), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8") != content:
            raise ValueError("Prepared regional grid differs from pinned sources")
        print("Regional grid reproduces exactly from pinned 20 m terrain.")
    else:
        OUTPUT.write_text(content, encoding="utf-8", newline="\n")
        print(f"Prepared regional landscape grid: {OUTPUT.relative_to(ROOT)}")
