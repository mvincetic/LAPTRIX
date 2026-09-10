"""Independent constant-slope circular-ramp force and telemetry benchmarks."""

import numpy as np
import pytest
from scipy.optimize import brentq

from apps.simulation.main import catalog
from apps.simulation.models import Setup, Track
from apps.simulation.solver import solve

GRAVITY = 9.80665


@pytest.mark.parametrize("grade", [0.0, 0.2, 0.29])
@pytest.mark.parametrize("downforce", [0.0, 1.5])
def test_graded_ramps_match_independent_steady_forces_and_projected_lateral_acceleration(grade, downforce):
    # Equal uphill/downhill circular arcs close in position. Compare steady values
    # away from their joins; vertical-curvature dynamics at those joins are unmodelled.
    source, original = catalog()[0][0], catalog()[1][0]
    radius, count = 80.0, 720
    cosine = np.cos(np.arcsin(grade))
    phase = np.arange(count) * 2 * np.pi / count
    rise = 2 * radius * np.sin(np.pi / count) * grade / cosine
    heights = np.minimum(np.arange(count), count - np.arange(count)) * rise
    data = source.model_dump()
    data["points"] = [
        dict(x=radius * np.cos(t), y=h, z=radius * np.sin(t), widthLeft=6, widthRight=6)
        for t, h in zip(phase, heights)
    ]
    vehicle = original.model_copy(update={"friction": 1.2, "downforceArea": downforce, "dragArea": 0.01})
    setup = Setup(solver="centerline", temperature=28, tire="medium", fuel=0)
    lap = solve(Track.model_validate(data), vehicle, setup)
    samples = lap["samples"]

    def grip(v):
        return vehicle.friction * (
            GRAVITY * cosine + 0.5 * setup.airDensity * downforce * v**2 / vehicle.mass
        )

    def lateral(v):
        # Helix horizontal speed is road speed times cos(theta); radius is horizontal.
        return (v * cosine) ** 2 / radius

    def resistance(v):
        return 0.5 * setup.airDensity * vehicle.dragArea * v**2 / vehicle.mass + 0.015 * GRAVITY * cosine

    for sign, fraction in [(1, 0.3), (-1, 0.8)]:
        force_limit = brentq(
            lambda v: np.hypot(lateral(v), resistance(v) + sign * GRAVITY * grade) - grip(v),
            1,
            90,
        )
        reserve_limit = brentq(lambda v: lateral(v) - 0.98 * grip(v), 1, 90)
        sample = samples[int(fraction * count)]
        assert sample["speed"] == pytest.approx(min(force_limit, reserve_limit), rel=1e-5)
        assert abs(sample["lateralG"]) * GRAVITY == pytest.approx(lateral(sample["speed"]), rel=1e-8)
        assert sample["trackGradient"] == pytest.approx(sign * grade, abs=1e-10)

    # Independently reconstruct integrated force at every exported node. In the
    # steep downhill case, braking can still allow positive acceleration; clamping
    # net deceleration to zero incorrectly admits a speed above the feasible bound.
    points = np.array([[s["x"], s["y"], s["z"]] for s in samples])
    segments = np.diff(points, axis=0)
    distance = np.linalg.norm(segments, axis=1)
    speed = np.array([s["speed"] for s in samples])
    wheel = np.diff(speed**2) / (2 * distance) + resistance(speed[:-1]) + GRAVITY * segments[:, 1] / distance
    assert np.max(np.hypot(lateral(speed[:-1]), wheel) / grip(speed[:-1])) <= 1.00001
    assert lap["numericalChecks"]["speedConverged"]
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015


def test_braking_search_never_increases_a_lateral_cap_below_the_propagation_floor():
    # Unique points of a tiny star are accepted by the geometry contract. This is
    # an adversarial numerical input, not a usable road or a feasibility benchmark.
    count, radius, grade = 42, 0.12, 0.29
    phase = np.arange(count) * 2 * np.pi * 17 / count
    horizontal = np.column_stack((radius * np.cos(phase), radius * np.sin(phase)))
    chords = np.linalg.norm(np.roll(horizontal, -1, axis=0) - horizontal, axis=1)
    rises = chords * grade / np.sqrt(1 - grade**2) * np.where(np.arange(count) < count / 2, 1, -1)
    heights = np.r_[0, np.cumsum(rises)[:-1]]
    data = catalog()[0][0].model_dump()
    data["points"] = [
        dict(x=x, y=y, z=z, widthLeft=2, widthRight=2) for (x, z), y in zip(horizontal, heights)
    ]
    vehicle = catalog()[1][0].model_copy(update={"friction": 0.5, "downforceArea": 0, "dragArea": 0.01})
    setup = Setup(solver="centerline", tire="medium", temperature=28, fuel=0)
    lap = solve(Track.model_validate(data), vehicle, setup)
    cap = np.sqrt(0.98 * vehicle.friction * GRAVITY * radius / np.cos(np.arcsin(grade)))
    assert cap < 1
    assert lap["maxSpeed"] <= cap * (1 + 1e-10)
    assert np.isfinite([[s[key] for key in s] for s in lap["samples"]]).all()
    # The propagation floor still limits this unsupported operating regime;
    # retain its explicit force failure instead of presenting it as feasible.
    assert lap["numericalChecks"]["maxDemandRatio"] > 1.015
