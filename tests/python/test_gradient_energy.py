"""Independent grade/energy benchmarks for the flying-lap point-mass model."""

import numpy as np
import pytest
from scipy.optimize import brentq

from apps.simulation.main import catalog
from apps.simulation.models import PowerPoint, Setup, Track
from apps.simulation.solver import G, solve


def long_grade_loop(source, grade, count=1600):
    # Two equal, long constant-grade arcs. The rising and falling halves close exactly.
    # Horizontal chord length makes dy / 3D segment length equal the requested grade.
    radius = 2500
    phase = np.arange(count) * 2 * np.pi / count
    chord = 2 * radius * np.sin(np.pi / count)
    step = chord * grade / np.sqrt(1 - grade**2)
    height = np.minimum(np.arange(count), count - np.arange(count)) * step
    data = source.model_dump()
    data["points"] = [
        dict(x=radius * np.cos(t), y=y, z=radius * np.sin(t), widthLeft=6, widthRight=6)
        for t, y in zip(phase, height)
    ]
    return Track.model_validate(data)


@pytest.mark.parametrize("grade", [0.05, 0.2, 0.29])
def test_uphill_and_downhill_terminal_speeds_match_independent_work_balance(grade):
    track, original = catalog()[0][0], catalog()[1][1]
    vehicle = original.model_copy(
        update={
            "powerKw": 150.0,
            "dragArea": 2.0,
            "downforceArea": 0.0,
            "powerCurve": [
                PowerPoint(rpm=original.idleRpm, powerKw=150),
                PowerPoint(rpm=original.maxRpm, powerKw=150),
            ],
        }
    )
    setup = Setup(solver="centerline", temperature=28, tire="medium", fuel=0)
    lap = solve(long_grade_loop(track, grade), vehicle, setup)
    for direction, fraction in [(1, 0.3), (-1, 0.8)]:
        expected = brentq(
            lambda v: (
                0.94 * 150000
                - 0.5 * setup.airDensity * vehicle.dragArea * v**3
                - vehicle.mass * G * (0.015 * np.cos(np.arcsin(grade)) + direction * grade) * v
            ),
            1,
            110,
        )
        sample = lap["samples"][int(fraction * (len(lap["samples"]) - 1))]
        assert sample["trackGradient"] == pytest.approx(direction * grade, abs=1e-10)
        assert sample["speed"] == pytest.approx(expected, rel=0.001)
    assert lap["numericalChecks"]["speedConverged"]
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015


@pytest.mark.parametrize("vehicle", catalog()[1], ids=lambda v: v.id)
def test_exported_actuator_work_balances_resistance_over_closed_elevation_lap(vehicle):
    # Recover wheel work from exported controls and independent force equations.
    # Compare with road loss over the closed loop; net kinetic/potential changes are zero.
    setup = Setup(solver="optimized", temperature=28, tire="medium", fuel=35)
    lap = solve(catalog()[0][0], vehicle, setup)
    samples = lap["samples"]
    p = np.array([[s["x"], s["y"], s["z"]] for s in samples])
    distances = np.linalg.norm(np.diff(p, axis=0), axis=1)
    chords = np.diff(p, axis=0)
    horizontal = np.linalg.norm(chords[:, [0, 2]], axis=1)
    slope_angles = np.arctan2(chords[:, 1], horizontal)
    turn = slope_angles - np.roll(slope_angles, 1)
    long_chord = np.hypot(horizontal + np.roll(horizontal, 1), chords[:, 1] + np.roll(chords[:, 1], 1))
    # Independently reconstruct circumcircle curvature from the tangent turn and
    # opposite chord, rather than using the solver's cross-product calculation.
    vertical = 2 * np.sin(turn) / long_chord
    mass = vehicle.mass + setup.fuel
    drive_work = brake_work = resistance_work = gravity_work = 0.0
    for i, sample in enumerate(samples[:-1]):
        v = sample["speed"]
        rpm = max(
            vehicle.idleRpm,
            v
            / vehicle.wheelRadius
            * 60
            / (2 * np.pi)
            * vehicle.gearRatios[sample["gear"] - 1]
            * vehicle.finalDrive,
        )
        engine_power = np.interp(
            rpm, [p.rpm for p in vehicle.powerCurve], [p.powerKw * 1000 for p in vehicle.powerCurve]
        )
        cosine = np.linalg.norm((p[i + 1] - p[i])[[0, 2]]) / distances[i]
        normal_load = (
            mass * (G * cosine + vertical[i] * v**2) + 0.5 * setup.airDensity * vehicle.downforceArea * v**2
        )
        friction_force = vehicle.friction * normal_load
        lateral_force = mass * abs(sample["lateralG"]) * G
        longitudinal_capacity = np.sqrt(max(0, friction_force**2 - lateral_force**2))
        drive_force = min(engine_power * 0.94 / max(v, 4), longitudinal_capacity)
        brake_force = min(vehicle.maxBrakeG * mass * G, longitudinal_capacity)
        drive_work += sample["throttle"] * drive_force * distances[i]
        brake_work += sample["brake"] * brake_force * distances[i]
        resistance_work += (
            0.5 * setup.airDensity * vehicle.dragArea * v**2 + 0.015 * normal_load
        ) * distances[i]
        gravity_work += mass * G * (p[i + 1, 1] - p[i, 1])
    assert abs(gravity_work) < 1e-6
    assert drive_work > brake_work > 0
    # Limited actuator clipping and pointwise drivetrain interpolation have small residuals.
    assert abs(drive_work - brake_work - resistance_work) / drive_work < 0.001
