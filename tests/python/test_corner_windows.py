"""Moving the lap origin must preserve physical corner events and intervals."""

import numpy as np
import pytest

from apps.simulation.main import catalog
from apps.simulation.models import Setup, Track
from apps.simulation.solver import G, analyze_corners, solve


@pytest.fixture(scope="module", params=[0, 1], ids=["formula", "gt"])
def original(request):
    tracks, vehicles = catalog()
    track, vehicle = tracks[0], vehicles[request.param]
    return track, vehicle, solve(track, vehicle, Setup(solver="centerline"))


@pytest.mark.parametrize("offset", [-3, 0, 3])
def test_closed_corner_events_survive_start_rotation(original, offset):
    track, vehicle, before = original
    count = len(track.points)
    shift = (before["corners"][1]["apexIndex"] + offset) % count
    data = track.model_dump()
    data["points"] = data["points"][shift:] + data["points"][:shift]
    after = solve(Track.model_validate(data), vehicle, Setup(solver="centerline"))
    assert after["lapTime"] == pytest.approx(before["lapTime"], abs=1e-10)
    assert len(after["corners"]) == len(before["corners"])
    by_apex = {corner["apexIndex"]: corner for corner in after["corners"]}
    for source in before["corners"]:
        rotated = by_apex[(source["apexIndex"] - shift) % count]
        for key in ["entryIndex", "exitIndex", "brakingIndex", "turnInIndex", "throttleIndex"]:
            assert rotated[key] == (source[key] - shift) % count
        for key in ["entrySpeed", "minSpeed", "exitSpeed", "lateralG", "brakingDistance", "time"]:
            assert rotated[key] == pytest.approx(source[key], abs=1e-9)
        assert rotated["direction"] == source["direction"]
        apex = rotated["apexIndex"]
        assert rotated["distance"] == after["samples"][apex]["distance"]


def event_fixture():
    index = np.arange(120)
    delta = (index + 60) % 120 - 60
    profile = {
        "ds": 5 + index / 100,
        "curvature": 0.01 * np.maximum(0, 1 - np.abs(delta) / 8),
        "brake": ((delta >= -10) & (delta < 0)).astype(float),
        "throttle": (delta >= 2).astype(float),
        "speed": 30 - np.maximum(0, 8 - np.abs(delta)),
        "lateral": np.full(120, 2 * G),
    }
    durations = 0.2 + index / 1000
    return profile, durations


def test_wrapped_metrics_sum_the_actual_nonuniform_segments():
    profile, durations = event_fixture()
    distances = np.r_[0, np.cumsum(profile["ds"])]
    times = np.r_[0, np.cumsum(durations)]
    corners, ids = analyze_corners(profile, distances, times)
    assert len(corners) == 1
    corner = corners[0]
    assert [
        corner[key] for key in ["brakingIndex", "entryIndex", "apexIndex", "throttleIndex", "exitIndex"]
    ] == [110, 114, 0, 2, 6]
    assert corner["brakingDistance"] == pytest.approx(sum(profile["ds"][110:]))
    assert corner["time"] == pytest.approx(sum(durations[114:]) + sum(durations[:6]))
    assert corner["minSpeed"] == 22
    assert corner["entrySpeed"] == corner["exitSpeed"] == 28
    assert corner["lateralG"] == 2
    assert set(np.flatnonzero(ids)) == set(range(114, 120)) | set(range(7))


def test_continuous_braking_search_is_bounded_to_one_event_lap():
    profile, durations = event_fixture()
    profile["brake"][:] = 1
    corners, _ = analyze_corners(profile, np.r_[0, np.cumsum(profile["ds"])], np.r_[0, np.cumsum(durations)])
    assert corners[0]["brakingIndex"] == 7
    assert 0 < corners[0]["brakingDistance"] < sum(profile["ds"])


@pytest.mark.parametrize("curvature", [0, 0.01])
def test_uniform_curvature_has_no_prominent_corner(curvature):
    profile, durations = event_fixture()
    profile["curvature"][:] = curvature
    corners, ids = analyze_corners(
        profile, np.r_[0, np.cumsum(profile["ds"])], np.r_[0, np.cumsum(durations)]
    )
    assert corners == []
    assert np.count_nonzero(ids) == 0
