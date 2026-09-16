"""Offline provenance checks for the optional visual landscape, independent of GIS.

The caller supplies its repository-owned byte reader so Blender and ordinary
Python tests enforce the same source/frame chain without network access.
"""

import hashlib
import json
import math
from pathlib import PurePosixPath


def load_regional_source(settings, read_bytes):
    raw = read_bytes(settings["context"])
    if hashlib.sha256(raw).hexdigest() != settings["contextSha256"]:
        raise ValueError("Regional authoring context changed")
    grid = json.loads(raw)
    if grid["format"] != "laptrix-regional-terrain-grid-v1" or grid["size"] != 55:
        raise ValueError("Unsupported regional grid")
    if len(grid["heights"]) != 55 or any(
        len(row) != 55 or any(type(value) not in (int, float) or not math.isfinite(value) for value in row)
        for row in grid["heights"]
    ):
        raise ValueError("Invalid regional grid heights")
    manifest_path = PurePosixPath(grid["sourceManifest"])
    manifest_raw = read_bytes(str(manifest_path))
    if hashlib.sha256(manifest_raw).hexdigest() != grid["sourceManifestSha256"]:
        raise ValueError("Regional source manifest changed")
    manifest = json.loads(manifest_raw)
    if (
        manifest["format"] != "laptrix-regional-terrain-source-v1"
        or manifest["pixelMetres"] != 20
        or manifest["width"] != 300
        or manifest["height"] != 300
        or grid["attribution"] != manifest["attribution"]
        or manifest["attribution"]["license"] != "CC BY 4.0"
        or manifest["attribution"]["credit"]
        != "Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at"
    ):
        raise ValueError("Retain the regional sampling and complete source credits")
    if set(manifest["files"]) != {"terrain-20m.tif", "flight-blocks.json", "wcs-capabilities.xml"}:
        raise ValueError("Retain all pinned regional source files")
    for name, record in manifest["files"].items():
        data = read_bytes(str(manifest_path.parent / name))
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
            raise ValueError(f"Regional source changed: {name}")
    license_text = read_bytes(str(manifest_path.parent / manifest["licenseFile"]))
    if b"Attribution 4.0 International" not in license_text:
        raise ValueError("Retain the regional attribution license")
    frame_raw = read_bytes("data/sources/red-bull-ring/reconstruction.json")
    if hashlib.sha256(frame_raw).hexdigest() != manifest["trackReconstructionSha256"]:
        raise ValueError("Regional coordinate frame changed")
    frame = json.loads(frame_raw)
    origin = frame["originUtm33n"]
    west, south, east, north = manifest["boundsUtm33n"]
    expected_bounds = [
        round(west + 10 - origin[0], 4),
        round(origin[1] - north + 10, 4),
        round(east - 10 - origin[0], 4),
        round(origin[1] - south - 10, 4),
    ]
    if (
        grid["originUtm33n"] != origin
        or grid["heightDatumMetres"] != frame["filteredAbsoluteHeightRangeMetres"][0]
        or grid["boundsXZ"] != expected_bounds
    ):
        raise ValueError("Regional landscape must retain the circuit coordinate frame")
    return grid


def validate_regional_properties(settings, properties, read_bytes):
    grid = load_regional_source(settings, read_bytes)
    if properties.get("regional_context_sha256") != settings["contextSha256"]:
        raise ValueError("Blender landscape was authored against a different regional context")
    if json.loads(properties.get("regional_source_credit", "null")) != grid["attribution"]:
        raise ValueError("Retain the complete regional source credits in the exported landscape")
    return grid
