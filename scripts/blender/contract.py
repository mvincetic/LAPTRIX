"""Repository-relative metre/axis contract, also testable without Blender."""

import json
import math
from pathlib import Path, PureWindowsPath

ROOT = Path(__file__).resolve().parents[2]


def owned_path(value: str) -> Path:
    """Reject escaped, absolute and symlinked paths outside the repository."""
    if (
        not isinstance(value, str)
        or not value
        or Path(value).is_absolute()
        or PureWindowsPath(value).drive
        or "\\" in value
    ):
        raise ValueError("Expected a repository-relative asset path")
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Asset paths must stay inside the repository")
    return path


def read_json(value: str):
    return json.loads(owned_path(value).read_text(encoding="utf-8"))


def vector3(value):
    if len(value) != 3 or not all(math.isfinite(v) for v in value):
        raise ValueError("Expected three finite coordinates")
    return tuple(float(v) for v in value)


def to_blender(value):
    """LAPTRIX (+Y up, +Z forward) -> Blender (+Z up, -Y forward)."""
    x, y, z = vector3(value)
    return x, -z, y


def to_runtime(value):
    x, y, z = vector3(value)
    return x, z, -y


def asset_config(asset_id):
    manifest = read_json("assets/manifest.json")
    entry = next((a for a in manifest["assets"] if a["id"] == asset_id), None)
    if not entry or entry["format"] != "blender-glb":
        raise ValueError(f"Unregistered Blender asset: {asset_id}")
    config = read_json(entry["parameters"])
    if config["id"] != asset_id:
        raise ValueError("Asset identity differs between manifest and parameters")
    for field in ("sourceFile", "runtimeFile"):
        if entry[field] != config[field]:
            raise ValueError(f"Manifest/config disagree on {field}")
    return entry, config
