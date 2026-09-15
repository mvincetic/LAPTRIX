import math

import pytest

from scripts.blender.contract import owned_path, to_blender, to_runtime


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
