"""Independent source-aliasing and exact chord checks for the original study."""

import numpy as np
import pytest

from apps.simulation.sampling import prepare_track
from scripts.elevation_study import analytic_source, geometry_metrics


def coordinates(track):
    return np.array([[point.x, point.y, point.z] for point in track.points])


def test_coarse_phase_pair_samples_zero_crossings_or_alternating_extrema_of_the_same_wave():
    zeros = coordinates(analytic_source(720, 0.1, 0))
    peaks = coordinates(analytic_source(720, 0.1, np.pi / 2))
    assert zeros[:, 1] == pytest.approx(np.zeros(720), abs=1e-12)
    assert peaks[:, 1] == pytest.approx(0.1 * (-1.0) ** np.arange(720), abs=1e-12)
    assert zeros[:, [0, 2]] == pytest.approx(peaks[:, [0, 2]], abs=1e-12)
    assert np.linalg.norm(zeros[:, [0, 2]], axis=1) == pytest.approx(np.full(720, 1000.0), abs=1e-10)
    absent = geometry_metrics(zeros, 0.1, 0)
    assert absent["maxLinearElevationErrorM"] == pytest.approx(0.1, abs=1e-12)
    assert absent["maxNodeCurvatureErrorInvM"] < 1e-12
    # Agreement at all source nodes alone misses the complete inter-node wave.
    assert absent["peakCurvatureRatio"] < 1e-10
    assert absent["analyticPeakVerticalCurvatureInvM"] == pytest.approx(0.01296, abs=1e-14)


def test_alternating_height_chords_match_exact_triangle_curvature_and_slope():
    metrics = geometry_metrics(coordinates(analytic_source(720, 0.1, np.pi / 2)), 0.1, np.pi / 2)
    horizontal = 2000 * np.sin(np.pi / 720)
    exact_chord_curvature = 0.4 / (horizontal**2 + 0.2**2)
    exact_slope = 0.2 / np.sqrt(horizontal**2 + 0.2**2)
    assert metrics["maxAbsVerticalCurvatureInvM"] == pytest.approx(exact_chord_curvature, abs=1e-12)
    assert metrics["maxAbsGradient"] == pytest.approx(exact_slope, abs=1e-12)
    assert metrics["peakCurvatureRatio"] == pytest.approx(exact_chord_curvature / 0.01296, abs=1e-10)
    assert metrics["meanSamplesPerWave"] == 2


@pytest.mark.parametrize("mode", ["source", "5m", "3m"])
def test_densifying_zero_crossing_source_cannot_recover_the_missing_wave(mode):
    source = analytic_source(720, 0.1, 0)
    before = source.model_dump()
    effective, metadata, _ = prepare_track(source, mode)
    metrics = geometry_metrics(coordinates(effective), 0.1, 0)
    assert metrics["elevationRangeM"] < 1e-12
    assert metrics["maxLinearElevationErrorM"] == pytest.approx(0.1, abs=1e-12)
    assert metrics["maxAbsVerticalCurvatureInvM"] < 1e-12
    assert source.model_dump() == before
    if mode == "3m":
        assert metadata["capped"]
        assert metadata["pointCount"] == 2000
        assert metadata["meanSpacing"] > 3


def test_a_denser_source_captures_extrema_omitted_by_the_coarse_source():
    points = coordinates(analytic_source(1440, 0.1, 0))
    assert points[0, 1] == pytest.approx(0, abs=1e-12)
    assert points[1, 1] == pytest.approx(0.1, abs=1e-12)
    assert points[2, 1] == pytest.approx(0, abs=1e-12)
    assert points[3, 1] == pytest.approx(-0.1, abs=1e-12)
    metrics = geometry_metrics(points, 0.1, 0)
    assert metrics["elevationRangeM"] == pytest.approx(0.2, abs=1e-12)
    assert metrics["meanSamplesPerWave"] == 4
    assert 0.8 < metrics["peakCurvatureRatio"] < 0.82
    assert 0.02 < metrics["maxLinearElevationErrorM"] < 0.022
