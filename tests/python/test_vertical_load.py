"""Independent geometry, contact and force benchmarks for crest/compression load."""

import numpy as np
import pytest

from apps.simulation.main import catalog
from apps.simulation.models import Setup, Track, Vehicle
from apps.simulation.solver import solve, vertical_curvature

GRAVITY = 9.80665


@pytest.mark.parametrize("sign", [-1, 1])
@pytest.mark.parametrize("irregular", [False, True])
@pytest.mark.parametrize("yaw", [0.0, 0.8])
def test_vertical_circular_arcs_have_exact_signed_inverse_radius(sign, irregular, yaw):
    radius = 200.0
    fraction = np.linspace(0, 1, 61)
    if irregular:
        fraction = fraction**1.3
    theta = -0.25 + 0.5 * fraction
    x = radius * np.sin(theta)
    points = np.column_stack(
        (x * np.cos(yaw) + 2300, sign * radius * (1 - np.cos(theta)) + 400, -x * np.sin(yaw) - 1500)
    )
    # The endpoints are not a periodic continuation of this analytic open arc.
    assert vertical_curvature(points)[1:-1] == pytest.approx(np.full(59, sign / radius), abs=1e-10)


@pytest.mark.parametrize("gradient", [0.0, 0.29])
def test_nonuniform_straight_grade_has_no_vertical_curvature(gradient):
    x = 500 * np.linspace(0, 1, 70) ** 1.2
    points = np.column_stack((x, x * gradient, np.zeros_like(x)))
    assert vertical_curvature(points)[1:-1] == pytest.approx(np.zeros(68), abs=1e-12)


def original_track(points):
    data = catalog()[0][0].model_dump()
    data.update(
        id="vertical-load-benchmark",
        name="Original crest/compression benchmark",
        provenance="Original analytic geometry for numerical tests; not a measured road.",
    )
    data["points"] = [dict(x=x, y=y, z=z, widthLeft=6, widthRight=6) for x, y, z in points]
    return Track.model_validate(data)


def contact_vehicle():
    data = catalog()[1][0].model_dump()
    data.update(id="contact-benchmark", downforceArea=0.0, dragArea=0.01, friction=1.2)
    return Vehicle.model_validate(data)


@pytest.mark.parametrize("count", [360, 720, 1440])
def test_smooth_height_wave_matches_analytic_vertical_load_and_all_node_force_balance(count):
    radius, height, waves = 1000.0, 75.0, 4
    phase = np.arange(count) * 2 * np.pi / count
    points = np.column_stack((radius * np.cos(phase), height * np.cos(waves * phase), radius * np.sin(phase)))
    vehicle = contact_vehicle()
    setup = Setup(solver="centerline", tire="medium", temperature=28, fuel=0)
    lap = solve(original_track(points), vehicle, setup)
    samples = lap["samples"][:-1]
    speed = np.array([s["speed"] for s in samples])
    segments = np.roll(points, -1, axis=0) - points
    ds = np.linalg.norm(segments, axis=1)
    grade = segments[:, 1] / ds
    cosine = np.sqrt(1 - grade**2)
    # Continuous derivatives of y = height cos(waves * horizontal_distance / radius).
    vertical = (
        -height
        * (waves / radius) ** 2
        * np.cos(waves * phase)
        / (1 + (height * waves / radius * np.sin(waves * phase)) ** 2) ** 1.5
    )
    normal = GRAVITY * cosine + vertical * speed**2
    assert normal.min() > 0
    expected_vertical_g = vertical * speed**2 / GRAVITY
    expected_load_g = normal / GRAVITY
    # Chord curvature approaches the continuous oracle as spacing decreases.
    # Even the coarsest 17.5 m grid stays within 0.001 vehicle weights / G.
    tolerance = 0.001 * (360 / count) ** 2
    assert np.array([s["verticalG"] for s in samples]) == pytest.approx(expected_vertical_g, abs=tolerance)
    assert np.array([s["normalLoadG"] for s in samples]) == pytest.approx(expected_load_g, abs=tolerance)
    acceleration = (np.roll(speed, -1) ** 2 - speed**2) / (2 * ds)
    drag = 0.5 * setup.airDensity * vehicle.dragArea * speed**2 / vehicle.mass
    wheel = acceleration + drag + 0.015 * normal + GRAVITY * grade
    lateral = (speed * cosine) ** 2 / radius
    assert np.max(np.hypot(lateral, wheel) / (vehicle.friction * normal)) <= 1.001
    expected_crest_speed = np.sqrt(
        0.98
        * vehicle.friction
        * GRAVITY
        / (1 / radius + 0.98 * vehicle.friction * height * (waves / radius) ** 2)
    )
    assert speed[0] == pytest.approx(expected_crest_speed, rel=0.001)
    assert lap["verticalDynamics"] == "quasi-steady-road-normal-v1"
    assert lap["numericalChecks"]["speedConverged"]
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015
    assert lap["numericalChecks"]["minNormalLoadG"] == pytest.approx(expected_load_g.min(), abs=tolerance)
    for key in ["verticalG", "normalLoadG"]:
        assert lap["samples"][0][key] == lap["samples"][-1][key]


def test_straight_crest_retains_contact_without_a_lateral_speed_constraint():
    length, radius, height, straight_count, arc_count = 1000.0, 300.0, 75.0, 400, 200
    fraction = np.arange(straight_count) / straight_count
    lower = np.column_stack(
        (
            -length / 2 + length * fraction,
            height * np.sin(np.pi * fraction) ** 2,
            np.full(straight_count, -radius),
        )
    )
    right_angle = np.linspace(-np.pi / 2, np.pi / 2, arc_count, endpoint=False)
    right = np.column_stack(
        (length / 2 + radius * np.cos(right_angle), np.zeros(arc_count), radius * np.sin(right_angle))
    )
    upper = np.column_stack(
        (length / 2 - length * fraction, np.zeros(straight_count), np.full(straight_count, radius))
    )
    left_angle = np.linspace(np.pi / 2, 3 * np.pi / 2, arc_count, endpoint=False)
    left = np.column_stack(
        (-length / 2 + radius * np.cos(left_angle), np.zeros(arc_count), radius * np.sin(left_angle))
    )
    lap = solve(
        original_track(np.vstack((lower, right, upper, left))),
        contact_vehicle(),
        Setup(solver="centerline", tire="medium", temperature=28, fuel=0),
    )
    crest = lap["samples"][straight_count // 2]
    assert crest["lateralG"] == pytest.approx(0, abs=1e-12)
    contact_speed = np.sqrt(GRAVITY / (2 * height * (np.pi / length) ** 2))
    assert crest["speed"] < contact_speed * 0.995
    assert 0.019 <= lap["numericalChecks"]["minNormalLoadG"] < 0.04
    assert lap["numericalChecks"]["speedConverged"]
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015
