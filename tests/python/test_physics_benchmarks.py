import numpy as np
import pytest
from scipy.optimize import brentq

from apps.simulation.main import catalog
from apps.simulation.models import PowerPoint, Setup, Track
from apps.simulation.solver import G, solve


@pytest.fixture(scope="module")
def source():
    return tuple(items[0] for items in catalog())


def circle(track, radius, count=240, irregular=False):
    phase = np.arange(count) / count * 2 * np.pi
    if irregular:
        phase += 0.5 * np.sin(phase)
    data = track.model_dump()
    data["points"] = [
        dict(x=radius * np.cos(t), y=0, z=radius * np.sin(t), widthLeft=6, widthRight=6) for t in phase
    ]
    return Track.model_validate(data)


@pytest.mark.parametrize("radius,lift,friction", [(50, 0, 0.9), (100, 0, 1.55), (150, 3.6, 1.55)])
def test_circle_speed_matches_independent_aerodynamic_grip_equation(source, radius, lift, friction):
    track, vehicle = source
    vehicle = vehicle.model_copy(update={"downforceArea": lift, "friction": friction, "dragArea": 0.01})
    setup = Setup(solver="centerline", sampling="3m", tire="medium", temperature=28, fuel=0)
    lap = solve(circle(track, radius), vehicle, setup)
    expected = np.sqrt(
        0.98
        * friction
        * G
        * radius
        / (1 - 0.98 * friction * setup.airDensity * lift * radius / (2 * vehicle.mass))
    )
    assert lap["averageSpeed"] == pytest.approx(expected, rel=0.001)
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015


def test_nonuniform_source_circle_becomes_uniform_without_changing_analytical_lap(source):
    track, vehicle = source
    vehicle = vehicle.model_copy(update={"downforceArea": 0, "dragArea": 0.01})
    setup = Setup(solver="centerline", sampling="3m", tire="medium", temperature=28)
    laps = [solve(circle(track, 100, irregular=irregular), vehicle, setup) for irregular in (False, True)]
    assert laps[0]["lapTime"] == pytest.approx(laps[1]["lapTime"], rel=1e-5)


def test_power_limited_terminal_speed_matches_work_balance(source):
    track, vehicle = source
    vehicle = vehicle.model_copy(
        update={
            "downforceArea": 0,
            "dragArea": 2.0,
            "powerKw": 150,
            "powerCurve": [PowerPoint(rpm=4000, powerKw=150), PowerPoint(rpm=12500, powerKw=150)],
        }
    )
    setup = Setup(solver="centerline", temperature=28, tire="medium", fuel=0)
    expected = brentq(
        lambda v: (
            150000 * 0.94 - 0.5 * setup.airDensity * vehicle.dragArea * v**3 - 0.015 * vehicle.mass * G * v
        ),
        10,
        90,
    )
    lap = solve(circle(track, 2500, count=720), vehicle, setup)
    assert lap["averageSpeed"] == pytest.approx(expected, rel=1e-5)
    assert np.ptp([s["speed"] for s in lap["samples"]]) < 0.001
    assert lap["numericalChecks"]["maxDemandRatio"] <= 1.015


def test_rigid_coordinate_transform_preserves_vehicle_aware_lap(source):
    track, vehicle = source
    angle = 0.8
    data = track.model_dump()
    for p in data["points"]:
        x, z = p["x"], p["z"]
        p["x"] = x * np.cos(angle) - z * np.sin(angle) + 1200
        p["z"] = x * np.sin(angle) + z * np.cos(angle) - 350
        p["y"] += 100
    a = solve(track, vehicle, Setup(solver="lap-time"))
    b = solve(Track.model_validate(data), vehicle, Setup(solver="lap-time"))
    assert a["lapTime"] == pytest.approx(b["lapTime"], abs=1e-5)
