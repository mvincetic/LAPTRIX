"""A source can be valid while its offset racing line exceeds the slope contract."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from apps.simulation.main import app, catalog
from apps.simulation.models import Setup, Track
from apps.simulation.solver import line_geometry_error, optimize_line, solve


@pytest.fixture(scope="module")
def graded_source():
    count = 240
    phase = np.arange(count) * 2 * np.pi / count
    radius = 100 + 5 * np.sin(8 * phase)
    horizontal = np.column_stack((radius * np.cos(phase), radius * np.sin(phase)))
    chords = np.linalg.norm(np.roll(horizontal, -1, axis=0) - horizontal, axis=1)
    increments = chords * 0.29 / np.sqrt(1 - 0.29**2) * np.where(np.arange(count) < count / 2, 1, -1)
    heights = np.r_[0, np.cumsum(increments)[:-1]]
    data = catalog()[0][0].model_dump()
    data.update(
        id="graded-wide-development",
        name="Wide graded development loop",
        provenance="Original synthetic regression geometry. Not a surveyed circuit.",
    )
    data["points"] = [
        dict(x=x, y=y, z=z, widthLeft=40, widthRight=40) for (x, z), y in zip(horizontal, heights)
    ]
    return Track.model_validate(data)


@pytest.mark.parametrize("mode", ["optimized", "lap-time"])
def test_invalid_optimized_slope_is_rejected_before_envelope_or_refinement(graded_source, mode, monkeypatch):
    vehicle = catalog()[1][0]
    seed, _, info = optimize_line(graded_source, vehicle, True)
    forward = np.roll(seed, -1, axis=0) - seed
    assert np.max(np.abs(forward[:, 1]) / np.linalg.norm(forward, axis=1)) > 0.34
    assert info["converged"]
    monkeypatch.setattr(
        "apps.simulation.solver.speed_profile",
        lambda *_: pytest.fail("Unsupported seed reached the speed envelope"),
    )
    with pytest.raises(ValueError, match="slope"):
        solve(graded_source, vehicle, Setup(solver=mode))


def test_unchanged_source_can_still_be_solved_in_centerline_mode(graded_source):
    result = solve(graded_source, catalog()[1][0], Setup(solver="centerline"))
    assert max(abs(s["trackGradient"]) for s in result["samples"]) == pytest.approx(0.29, abs=1e-10)
    assert result["numericalChecks"]["speedConverged"]
    assert result["numericalChecks"]["maxDemandRatio"] <= 1.015


def test_api_returns_a_recoverable_geometry_error_for_unsupported_optimized_slope(graded_source):
    response = TestClient(app).post(
        "/api/simulate", json={"track": graded_source.model_dump(), "setup": {"solver": "optimized"}}
    )
    assert response.status_code == 422
    assert "slope" in response.json()["detail"]
    assert "Centerline" in response.json()["detail"]


@pytest.mark.parametrize("mode", ["optimized", "lap-time"])
def test_a_converged_but_reversed_seed_is_rejected(graded_source, mode):
    data = graded_source.model_dump()
    for i, point in enumerate(data["points"]):
        angle = i * 2 * np.pi / len(data["points"])
        radius = 100 + 30 * np.sin(8 * angle)
        point.update(x=radius * np.cos(angle), y=0, z=radius * np.sin(angle))
    track = Track.model_validate(data)
    vehicle = catalog()[1][0]
    center = np.array([[p.x, p.y, p.z] for p in track.points])
    seed, _, info = optimize_line(track, vehicle, True)
    sf, cf = np.roll(seed, -1, axis=0) - seed, np.roll(center, -1, axis=0) - center
    assert np.min(np.sum(sf * cf, axis=1) / np.linalg.norm(cf, axis=1)) < -0.9
    assert info["converged"]
    with pytest.raises(ValueError, match="reverses"):
        solve(track, vehicle, Setup(solver=mode))


def test_derived_slope_boundary_accepts_roundoff_but_rejects_meaningful_excess():
    center = np.array([[0.0, 0, 0], [10.0, 0, 0], [10.0, 0, 10], [0.0, 0, 10]])
    for grade, accepted in [(0.3, True), (0.3 + 0.5e-9, True), (0.3 + 1e-7, False)]:
        points = center.copy()
        points[1:3, 1] = 10 * grade / np.sqrt(1 - grade**2)
        error = line_geometry_error(points, center)
        if accepted:
            assert error is None
        else:
            assert "slope" in error


def test_derived_forward_progress_boundary_is_stable_to_roundoff():
    center = np.array([[0.0, 0, 0], [10.0, 0, 0], [10.0, 0, 10], [0.0, 0, 10]])
    for progress, accepted in [(0.1, True), (0.1 - 0.5e-9, True), (0.1 - 1e-7, False)]:
        points = center.copy()
        points[1, 0] = progress
        error = line_geometry_error(points, center)
        if accepted:
            assert error is None
        else:
            assert "collapses" in error
