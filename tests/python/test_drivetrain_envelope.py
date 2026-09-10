import numpy as np
import pytest

from apps.simulation.drivetrain import available_power
from apps.simulation.main import catalog
from apps.simulation.models import Setup
from apps.simulation.solver import G, geometry, solve, vehicle_state


@pytest.mark.parametrize("vehicle_index", [0, 1])
def test_scalar_power_matches_vector_drivetrain_at_breakpoints_and_redline_sides(vehicle_index):
    vehicle = catalog()[1][vehicle_index]
    evaluate = available_power(vehicle)
    ratios = np.array(vehicle.gearRatios) * vehicle.finalDrive
    redlines = vehicle.maxRpm / ratios * 2 * np.pi / 60 * vehicle.wheelRadius
    knots = np.concatenate(
        [point.rpm / ratios * 2 * np.pi / 60 * vehicle.wheelRadius for point in vehicle.powerCurve]
    )
    speeds = np.r_[
        np.linspace(0, redlines[-1] * 1.01, 4001),
        knots,
        redlines,
        redlines * (1 - 1e-10),
        redlines * (1 + 1e-10),
    ]
    expected = vehicle_state(vehicle, speeds)[2]
    actual = np.array([evaluate(speed) for speed in speeds])
    np.testing.assert_allclose(actual, expected, rtol=1e-12, atol=1e-7)


@pytest.mark.parametrize("aero", [-5, -2, 0, 2, 5])
def test_gt_aero_study_respects_exact_power_and_force_budget(aero):
    tracks, vehicles = catalog()
    vehicle = next(vehicle for vehicle in vehicles if vehicle.id == "gt-development")
    setup = Setup(aero=aero)
    result = solve(tracks[0], vehicle, setup)
    assert result["numericalChecks"]["speedConverged"]
    assert result["numericalChecks"]["maxDemandRatio"] <= 1.015
    samples = result["samples"][:-1]
    points = np.array([[s["x"], s["y"], s["z"]] for s in samples])
    ds = geometry(points)[0]
    speeds = np.array([s["speed"] for s in samples])
    # Independent work demand from endpoint speeds and exported grade, before actuator clipping.
    mass = vehicle.mass + setup.fuel
    wheel_force = (
        mass * (np.roll(speeds, -1) ** 2 - speeds**2) / (2 * ds)
        + 0.5 * setup.airDensity * vehicle.dragArea * (1 + aero * 0.045) * speeds**2
        + mass
        * G
        * (
            0.015 * np.linalg.norm(np.roll(points, -1, axis=0)[:, [0, 2]] - points[:, [0, 2]], axis=1) / ds
            + np.array([s["trackGradient"] for s in samples])
        )
    )
    available_force = 0.94 * vehicle_state(vehicle, speeds)[2] / np.maximum(speeds, 4)
    assert np.max(np.maximum(wheel_force, 0) / available_force) <= 1 + 1e-8
