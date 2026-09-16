import hashlib
import json

import pytest

from scripts.blender.contract import owned_path
from scripts.blender.regional_source import load_regional_source, validate_regional_properties

CONTEXT = "assets/blender/tracks/red-bull-ring-regional.json"


def test_offline_regional_provenance_binds_original_bytes_and_the_existing_coordinate_frame():
    raw = owned_path(CONTEXT).read_bytes()
    settings = {"context": CONTEXT, "contextSha256": hashlib.sha256(raw).hexdigest()}
    grid = load_regional_source(settings, lambda path: owned_path(path).read_bytes())
    assert grid["originUtm33n"] == [482338.48236549797, 5229671.71170846]
    assert grid["heightDatumMetres"] == 677.4140047504789


@pytest.mark.parametrize(
    "fault", ["context", "manifest", "raster", "origin", "height", "bounds", "credits", "heights"]
)
def test_changed_regional_inputs_or_a_new_visual_coordinate_frame_are_rejected(fault):
    raw = owned_path(CONTEXT).read_bytes()
    grid = json.loads(raw)
    replacements = {}
    if fault == "origin":
        grid["originUtm33n"][0] += 1
    elif fault == "height":
        grid["heightDatumMetres"] += 1
    elif fault == "bounds":
        grid["boundsXZ"][0] += 1
    elif fault == "credits":
        grid["attribution"]["credit"] = "No attribution"
    elif fault == "heights":
        grid["heights"][0][0] = float("nan")
    elif fault == "manifest":
        replacements[grid["sourceManifest"]] = b"{}"
    elif fault == "raster":
        replacements["data/sources/red-bull-ring/regional/terrain-20m.tif"] = b"changed"
    revised = json.dumps(grid).encode()
    replacements[CONTEXT] = revised
    settings = {"context": CONTEXT, "contextSha256": hashlib.sha256(revised).hexdigest()}
    if fault == "context":
        settings["contextSha256"] = "stale"

    def read(path):
        return replacements[path] if path in replacements else owned_path(path).read_bytes()

    with pytest.raises(ValueError, match="context|manifest|source|coordinate frame|grid"):
        load_regional_source(settings, read)


def test_editable_landscape_retains_its_own_context_and_credits_separately_from_the_circuit():
    raw = owned_path(CONTEXT).read_bytes()
    grid = json.loads(raw)
    settings = {"context": CONTEXT, "contextSha256": hashlib.sha256(raw).hexdigest()}
    properties = {
        "regional_context_sha256": settings["contextSha256"],
        "regional_source_credit": json.dumps(grid["attribution"]),
    }

    def reader(path):
        return owned_path(path).read_bytes()

    assert validate_regional_properties(settings, properties, reader) == grid
    with pytest.raises(ValueError, match="regional context"):
        validate_regional_properties(settings, {**properties, "regional_context_sha256": "stale"}, reader)
    with pytest.raises(ValueError, match="source credits"):
        validate_regional_properties(settings, {**properties, "regional_source_credit": "{}"}, reader)
