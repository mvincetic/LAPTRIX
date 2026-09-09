import json

import numpy as np
import pytest
from fastapi.testclient import TestClient
from scipy.interpolate import CubicSpline

from apps.simulation.main import app, catalog
from apps.simulation.models import Setup, Track
from apps.simulation.sampling import prepare_track, track_fingerprint
from apps.simulation.solver import solve


@pytest.fixture(scope="module")
def source():
    return tuple(items[0] for items in catalog())


def circle(source, radius=100, count=240):
    data = source.model_dump()
    phase = np.arange(count) / count * 2 * np.pi
    data["points"] = [
        dict(x=radius * np.cos(t), y=0, z=radius * np.sin(t), widthLeft=6, widthRight=6) for t in phase
    ]
    return Track.model_validate(data)


def test_original_grid_is_immutable_and_fingerprint_ignores_descriptive_metadata(source):
    track, _ = source
    before = track.model_dump_json()
    grid, info, alignment = prepare_track(track, "source")
    assert grid is track and track.model_dump_json() == before
    assert info["pointCount"] == len(track.points) and info["targetSpacing"] is None
    assert len(alignment["progress"]) == len(track.points) + 1
    assert alignment["progress"][0] == 0 and alignment["progress"][-1] == 1
    assert (
        track_fingerprint(track.model_copy(update={"name": "A new label"})) == alignment["trackFingerprint"]
    )
    changed = track.model_copy(deep=True)
    changed.points[5].widthLeft -= 1
    assert track_fingerprint(changed) != alignment["trackFingerprint"]


@pytest.mark.parametrize("mode,spacing", [("5m", 5), ("3m", 3)])
def test_resampling_controls_spacing_alignment_and_width_without_mutating_source(source, mode, spacing):
    track, _ = source
    before = track.model_dump_json()
    grid, info, alignment = prepare_track(track, mode)
    assert track.model_dump_json() == before and grid is not track
    points = np.array([[p.x, p.y, p.z] for p in grid.points])
    ds = np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1)
    assert np.max(ds) <= spacing + 0.001
    # Arc intervals are uniform; straight chords are naturally shorter in tight bends.
    xyz = np.array([[p.x, p.y, p.z] for p in track.points])
    original_ds = np.linalg.norm(np.roll(xyz, -1, axis=0) - xyz, axis=1)
    knots = np.r_[0, np.cumsum(original_ds)]
    curve = CubicSpline(knots, np.vstack([xyz, xyz[0]]), bc_type="periodic")
    s = np.array(alignment["progress"]) * knots[-1]
    a, b = s[:-1], s[1:]
    arc_intervals = (
        (b - a)
        / 6
        * (
            np.linalg.norm(curve(a, 1), axis=1)
            + 4 * np.linalg.norm(curve((a + b) / 2, 1), axis=1)
            + np.linalg.norm(curve(b, 1), axis=1)
        )
    )
    assert np.ptp(arc_intervals) < 0.001
    assert len(grid.points) == info["pointCount"] == len(alignment["progress"]) - 1
    assert np.all(np.diff(alignment["progress"]) > 0)
    assert 0 <= info["maxSourceDeviation"] <= 0.5
    assert alignment["trackFingerprint"] == track_fingerprint(track)
    json.dumps(info)  # Native JSON types, including the point-budget flag.


def test_narrow_width_feature_survives_between_resampled_nodes(source):
    track = source[0].model_copy(deep=True)
    track.points[203].widthLeft = 2
    grid, _, alignment = prepare_track(track, "5m")
    original, _, original_alignment = prepare_track(track, "source")
    position = original_alignment["progress"][203]
    i = np.searchsorted(alignment["progress"], position) - 1
    assert grid.points[i].widthLeft == grid.points[i + 1].widthLeft == 2
    assert original.points[202].widthLeft == 8


def test_long_track_reports_budget_cap_instead_of_claiming_requested_spacing(source):
    track = circle(source[0], radius=2000, count=400)
    grid, info, _ = prepare_track(track, "3m")
    assert info["capped"] and len(grid.points) == 2000
    assert info["meanSpacing"] > 6 and info["targetSpacing"] == 3


def test_excessive_interpolation_displacement_is_a_recoverable_api_error(source):
    track = circle(source[0], radius=400, count=40)
    client = TestClient(app)
    response = client.post("/api/simulate", json={"track": track.model_dump(), "setup": {"sampling": "5m"}})
    assert response.status_code == 422
    assert "source geometry" in response.json()["detail"]
    assert client.post("/api/simulate", json={"track": track.model_dump()}).status_code == 200


def test_sampling_modes_share_source_identity_but_return_their_own_geometry(source):
    original = solve(*source, Setup())
    sampled = solve(*source, Setup(sampling="5m"))
    assert original["alignment"]["trackFingerprint"] == sampled["alignment"]["trackFingerprint"]
    assert len(original["samples"]) != len(sampled["samples"])
    assert len(sampled["sampling"]["points"]) == len(sampled["samples"]) - 1
    assert sampled["numericalChecks"]["maxDemandRatio"] <= 1.015
    assert sum(s["time"] for s in sampled["sectors"]) == pytest.approx(sampled["lapTime"])
    json.dumps(sampled)
