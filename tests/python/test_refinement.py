from itertools import product

import numpy as np
import pytest
from scipy.sparse import csr_matrix

from apps.simulation.main import catalog
from apps.simulation.models import Setup, Track
from apps.simulation.numerics import box_quadratic, curvature_quadratic
from apps.simulation.solver import geometry, optimize_line, refine_line, solve, speed_profile
from scripts.solver_study import resample


@pytest.mark.parametrize("seed", range(5))
def test_box_quadratic_matches_exhaustive_faces(seed):
    """An independent small exhaustive oracle catches coupled bounds and releases."""
    rng = np.random.default_rng(seed)
    a = rng.normal(size=(3, 3))
    hessian = a.T @ a + np.eye(3) * 0.1
    linear = rng.normal(size=3) * 4
    lower, upper = np.array([-1, 0.2, -0.6]), np.array([0.4, 0.8, 1])

    def objective(x):
        return 0.5 * x @ hessian @ x + linear @ x

    feasible = []
    for face in product((-1, 0, 1), repeat=3):
        face = np.array(face)
        x = np.where(face == -1, lower, np.where(face == 1, upper, 0))
        free, fixed = np.flatnonzero(face == 0), np.flatnonzero(face != 0)
        if len(free):
            x[free] = np.linalg.solve(
                hessian[np.ix_(free, free)], -linear[free] - hessian[np.ix_(free, fixed)] @ x[fixed]
            )
        if np.all(x >= lower - 1e-10) and np.all(x <= upper + 1e-10):
            feasible.append(objective(x))
    x, info = box_quadratic(csr_matrix(hessian), linear, lower, upper)
    assert info["converged"]
    assert objective(x) == pytest.approx(min(feasible), abs=1e-9)
    assert np.all(x >= lower) and np.all(x <= upper)


def test_quadratic_iteration_limit_retains_feasibility_and_reports_residual():
    x, info = box_quadratic(
        csr_matrix(np.diag([1.0, 2, 3])),
        np.array([-4.0, 5, -8]),
        np.full(3, -1.0),
        np.ones(3),
        max_iterations=1,
    )
    assert np.all(np.abs(x) <= 1)
    assert not info["converged"] and info["projectedGradient"] > 0


def test_curvature_quadratic_matches_nonuniform_spatial_objective():
    phase = np.arange(120) / 120 * 2 * np.pi
    phase += 0.3 * np.sin(phase)
    center = np.column_stack((150 * np.cos(phase), 2 * np.sin(phase), 100 * np.sin(phase)))
    ds, _, normal, _ = geometry(center)
    h, g, constant = curvature_quadratic(center, normal, ds)
    offset = 2 * np.sin(phase * 3)
    points = center + normal * offset[:, None]
    previous, weights = np.roll(ds, 1), (ds + np.roll(ds, 1)) / 2
    second = (
        (np.roll(points, -1, axis=0) - points) / ds[:, None]
        - (points - np.roll(points, 1, axis=0)) / previous[:, None]
    ) / weights[:, None]
    expected = np.sum(weights[:, None] * second**2) + 1e-8 * np.sum(weights * offset**2)
    assert 0.5 * offset @ (h @ offset) + g @ offset + constant == pytest.approx(expected, rel=1e-10)


@pytest.fixture(scope="module")
def source():
    return tuple(items[0] for items in catalog())


@pytest.fixture(scope="module")
def refined(source):
    return solve(*source, Setup(solver="lap-time"))


def test_refinement_improves_seed_with_safe_authoritative_telemetry(source, refined):
    track, vehicle = source
    seed = solve(*source, Setup())
    info = refined["optimization"]["refinement"]
    assert info["seedLapTime"] == pytest.approx(seed["lapTime"], abs=1e-10)
    assert 0.01 < info["gainSeconds"] < 1
    assert info["seedLapTime"] - refined["lapTime"] == pytest.approx(info["gainSeconds"])
    assert info["evaluations"] == info["evaluationBudget"] == 78
    assert info["acceptedSteps"] > 0
    clearance = vehicle.width / 2 + 0.35
    for point, sample in zip(track.points, refined["samples"]):
        assert clearance - point.widthRight <= sample["offset"] <= point.widthLeft - clearance
    samples = refined["samples"]
    assert np.isfinite([[s[k] for k in s] for s in samples]).all()
    assert all(b["distance"] > a["distance"] and b["time"] > a["time"] for a, b in zip(samples, samples[1:]))
    assert samples[0]["x"] == samples[-1]["x"] and samples[0]["speed"] == samples[-1]["speed"]
    assert sum(
        2 * (b["distance"] - a["distance"]) / (a["speed"] + b["speed"]) for a, b in zip(samples, samples[1:])
    ) == pytest.approx(refined["lapTime"])
    assert refined["numericalChecks"]["speedConverged"]
    assert refined["numericalChecks"]["maxDemandRatio"] <= 1.015


def test_refinement_responds_to_setup_and_vehicle(source, refined):
    track, vehicle = source
    setup = Setup(solver="lap-time", fuel=110, tire="hard", trackState="green", temperature=5, aero=-5)
    changed = solve(track, vehicle.model_copy(update={"downforceArea": 0}), setup)
    info = changed["optimization"]["refinement"]
    assert changed["lapTime"] > refined["lapTime"]
    assert changed["lapTime"] <= info["seedLapTime"]
    assert changed["numericalChecks"]["maxDemandRatio"] <= 1.015
    assert (
        np.max(
            np.abs(
                np.array([s["offset"] for s in changed["samples"]])
                - [s["offset"] for s in refined["samples"]]
            )
        )
        > 0.01
    )


def test_refinement_is_repeatable_and_invariant_to_start_index(source, refined):
    track, vehicle = source
    again = solve(track, vehicle, Setup(solver="lap-time"))
    assert again["samples"] == refined["samples"]
    data = track.model_dump()
    data["points"] = data["points"][173:] + data["points"][:173]
    rotated = solve(Track.model_validate(data), vehicle, Setup(solver="lap-time"))
    assert rotated["lapTime"] == pytest.approx(refined["lapTime"], abs=0.01)


def test_refinement_retains_seed_when_envelope_is_infeasible(source):
    track, vehicle = source
    points, offsets, _ = optimize_line(track, vehicle, True)
    profile = speed_profile(points, vehicle, Setup())
    profile["maxDemandRatio"] = 2.0
    actual, retained, info = refine_line(track, vehicle, Setup(), offsets, profile)
    np.testing.assert_array_equal(actual, offsets)
    assert retained is profile
    assert info["status"] == "seed-infeasible" and info["evaluations"] == info["gainSeconds"] == 0


def test_refinement_retains_an_already_faster_circle_seed(source):
    track, vehicle = source
    data = track.model_dump()
    phase = np.arange(120) / 120 * 2 * np.pi
    data["points"] = [
        dict(x=100 * np.cos(t), y=0, z=100 * np.sin(t), widthLeft=6, widthRight=6) for t in phase
    ]
    circle = Track.model_validate(data)
    vehicle = vehicle.model_copy(update={"downforceArea": 0, "dragArea": 0.01})
    seed = solve(circle, vehicle, Setup())
    refined = solve(circle, vehicle, Setup(solver="lap-time"))
    assert refined["samples"] == seed["samples"]
    info = refined["optimization"]["refinement"]
    assert info["evaluations"] == 78 and info["status"] == "completed"
    assert info["gainSeconds"] == info["acceptedSteps"] == 0


def test_faster_but_infeasible_candidates_never_replace_the_seed(source, monkeypatch):
    track, vehicle = source
    points, offsets, _ = optimize_line(track, vehicle, True)
    profile = speed_profile(points, vehicle, Setup())
    impossible = {**profile, "dt": profile["dt"] / 2, "maxDemandRatio": 2.0}
    monkeypatch.setattr("apps.simulation.solver.speed_profile", lambda *_: impossible)
    actual, retained, info = refine_line(track, vehicle, Setup(), offsets, profile)
    np.testing.assert_array_equal(actual, offsets)
    assert retained is profile
    assert info["rejectedCandidates"] == info["evaluations"] == 78
    assert info["gainSeconds"] == info["acceptedSteps"] == 0


def test_fine_grid_converges_without_changing_baseline_contract(source):
    track, vehicle = source
    laps = []
    for count in (720, 1440, 2000):
        result = solve(resample(track, count), vehicle, Setup())
        assert len(result["samples"]) == count + 1
        assert result["optimization"]["converged"]
        assert result["optimization"]["projectedGradient"] < 1e-9
        assert result["numericalChecks"]["maxDemandRatio"] <= 1.015
        laps.append(result["lapTime"])
    assert abs(laps[2] - laps[1]) < 0.03
    assert abs(laps[2] - laps[1]) < abs(laps[1] - laps[0])


def test_centerline_rejects_a_vehicle_that_only_fits_with_an_offset(source):
    track, vehicle = source
    data = track.model_dump()
    data["points"][0]["widthRight"] = 2
    vehicle = vehicle.model_copy(update={"width": 4})
    with pytest.raises(ValueError, match="centerline"):
        solve(Track.model_validate(data), vehicle, Setup(solver="centerline"))
