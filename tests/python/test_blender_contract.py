import json
import math

import pytest

from scripts.blender.contract import owned_path, read_json, to_blender, to_runtime, validate_source_context


def test_vehicle_and_track_axis_contract_preserves_metres_and_handedness():
    assert to_blender((1, 0, 0)) == (1, 0, 0)
    assert to_blender((0, 1, 0)) == (0, 0, 1)
    assert to_blender((0, 0, 1)) == (0, -1, 0)
    assert to_runtime((0, -3, 2)) == (0, 2, 3)
    for point in [(0, 0, 0), (1.25, 0.36, -2.457), (90000, -17.25, 4311.389)]:
        assert to_runtime(to_blender(point)) == point
        assert math.dist(to_blender(point), (0, 0, 0)) == math.dist(point, (0, 0, 0))
    # Blender X cross forward(-Y) equals down(-Z), matching runtime X cross Z = -Y.
    assert to_blender((0, -1, 0)) == (0, 0, -1)


@pytest.mark.parametrize("point", [(0, math.nan, 0), (math.inf, 1, 1), (0, 1)])
def test_invalid_authoring_coordinates_are_rejected(point):
    with pytest.raises(ValueError):
        to_blender(point)


@pytest.mark.parametrize("path", ["../outside.blend", "C:\\Users\\Example\\car.blend"])
def test_authoring_paths_cannot_escape_the_repository(path):
    with pytest.raises(ValueError, match="relative|inside"):
        owned_path(path)


@pytest.mark.parametrize("fault", [None, "context", "fingerprint", "credits"])
def test_scenery_source_cannot_silently_change_alignment_or_lose_attribution(fault):
    config = read_json("assets/blender/tracks/red-bull-ring-slice.json")
    context = read_json(config["authoringContext"])
    properties = {
        "authoring_context_sha256": config["authoringContextSha256"],
        "source_fingerprint": config["sourceFingerprint"],
        "source_credits": json.dumps(context["attribution"]["sources"]),
    }
    if fault == "context":
        properties["authoring_context_sha256"] = "outdated"
    elif fault == "fingerprint":
        properties["source_fingerprint"] = "different-track"
    elif fault == "credits":
        properties["source_credits"] = "[]"
    if fault:
        with pytest.raises(ValueError, match="context|fingerprint|credits"):
            validate_source_context(config, properties)
    else:
        validate_source_context(config, properties)
