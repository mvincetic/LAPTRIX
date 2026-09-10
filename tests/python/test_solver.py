import copy

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from apps.simulation.main import app, catalog
from apps.simulation.models import Setup, Track
from apps.simulation.solver import G, geometry, optimize_line, solve, vehicle_state


@pytest.fixture(scope="module")
def source():
    tracks, vehicles = catalog()
    return tracks[0], vehicles[0]


@pytest.fixture(scope="module")
def result(source):
    return solve(*source, Setup())


def test_track_length_closure_and_frames(source):
    track, _ = source
    p = np.array([[p.x, p.y, p.z] for p in track.points])
    ds, tangent, normal, curvature = geometry(p)
    assert 5500 < sum(ds) < 5700
    assert np.all(ds > 0)
    assert np.all(np.isfinite(curvature))
    np.testing.assert_allclose(np.linalg.norm(tangent, axis=1), 1, atol=1e-12)
    np.testing.assert_allclose(np.linalg.norm(normal, axis=1), 1, atol=1e-12)
    np.testing.assert_allclose(np.sum(tangent * normal, axis=1), 0, atol=1e-12)
    assert np.linalg.norm(tangent[-1] - tangent[0]) < 0.03


@pytest.mark.parametrize(
    "mutation", ["duplicate", "nan", "width", "sectors", "bank", "gap", "frame", "gradient"]
)
def test_schema_rejects_invalid_tracks(source, mutation):
    data = source[0].model_dump()
    if mutation == "duplicate":
        data["points"][1] = copy.deepcopy(data["points"][0])
    elif mutation == "nan":
        data["points"][0]["x"] = float("nan")
    elif mutation == "width":
        data["points"][0]["widthLeft"] = -3
    elif mutation == "sectors":
        data["sectorFractions"] = [0.7, 0.3, 1]
    elif mutation == "bank":
        data["points"][0]["banking"] = 0.1
    elif mutation == "gap":
        data["points"][5]["x"] += 1000
    elif mutation == "frame":
        data["points"][2] = copy.deepcopy(data["points"][0])
    else:
        data["points"][5]["y"] += 40
    with pytest.raises(ValidationError):
        Track.model_validate(data)


def test_optimized_line_stays_in_bounds_and_reduces_objective(source):
    track, vehicle = source
    points, offsets, info = optimize_line(track, vehicle, True)
    clearance = vehicle.width / 2 + 0.35
    assert np.all(offsets <= np.array([p.widthLeft for p in track.points]) - clearance + 1e-8)
    assert np.all(offsets >= -np.array([p.widthRight for p in track.points]) + clearance - 1e-8)
    assert info["converged"]
    assert info["curvatureObjectiveReduction"] > 0.1
    assert np.all(np.isfinite(points))


def test_telemetry_is_finite_monotonic_and_closes(result):
    s = result["samples"]
    values = np.array([[p[k] for k in s[0]] for p in s])
    assert np.isfinite(values).all()
    assert np.all(np.diff([p["time"] for p in s]) > 0)
    assert np.all(np.diff([p["distance"] for p in s]) > 0)
    assert s[0]["time"] == s[0]["distance"] == 0
    assert s[-1]["time"] == result["lapTime"]
    assert s[-1]["distance"] == result["length"]
    for key in ["x", "y", "z", "speed", "rpm", "gear"]:
        assert s[0][key] == s[-1][key]
    assert 55 < result["lapTime"] < 150  # catches the original 1 m/s envelope regression
    assert 50 < result["maxSpeed"] < 110
    assert result["samples"][0]["speed"] > 15  # flying lap, never an artificial standing start


def test_sector_times_partition_the_complete_lap(result):
    assert sum(s["time"] for s in result["sectors"]) == pytest.approx(result["lapTime"])
    assert result["sectors"][-1]["endDistance"] == result["length"]
    assert result["sectors"][-1]["split"] == result["lapTime"]


def test_lap_time_integrates_distance_over_speed(result):
    s = result["samples"]
    integrated = sum(
        2 * (b["distance"] - a["distance"]) / (a["speed"] + b["speed"]) for a, b in zip(s, s[1:])
    )
    assert integrated == pytest.approx(result["lapTime"], rel=1e-12)


def test_grip_braking_rpm_and_actuator_constraints(source, result):
    _, vehicle = source
    setup = Setup()
    mass = vehicle.mass + setup.fuel
    mu = vehicle.friction * 1.04 * (1 - 0.00018 * (setup.temperature - 28) ** 2)
    for p in result["samples"][:-1]:
        normal_weight = G * np.cos(np.arcsin(p["trackGradient"]))
        normal = (
            normal_weight
            + p["verticalG"] * G
            + setup.airDensity * vehicle.downforceArea * p["speed"] ** 2 / (2 * mass)
        )
        assert p["normalLoadG"] * G == pytest.approx(normal, rel=1e-12)
        resistance = setup.airDensity * vehicle.dragArea * p["speed"] ** 2 / (2 * mass) + 0.015 * normal
        wheel = p["longitudinalG"] * G + resistance + p["trackGradient"] * G
        assert np.hypot(p["lateralG"] * G, wheel) <= mu * normal * 1.015
        assert -wheel <= vehicle.maxBrakeG * G * 1.015
        assert 0 <= p["throttle"] <= 1 and 0 <= p["brake"] <= 1
        assert p["throttle"] * p["brake"] == 0
        assert vehicle.idleRpm <= p["rpm"] <= vehicle.maxRpm
        assert 1 <= p["gear"] <= len(vehicle.gearRatios)


def test_mass_and_grip_change_lap_in_expected_direction(source):
    light = solve(*source, Setup(fuel=0))
    heavy = solve(*source, Setup(fuel=110))
    hard = solve(*source, Setup(fuel=0, tire="hard"))
    green = solve(*source, Setup(fuel=0, trackState="green"))
    assert heavy["lapTime"] > light["lapTime"] + 0.5
    assert hard["lapTime"] > light["lapTime"]
    assert green["lapTime"] > light["lapTime"]


def test_corner_events_index_canonical_samples(result):
    assert len(result["corners"]) >= 5
    for c in result["corners"]:
        assert c["brakingIndex"] <= c["turnInIndex"] <= c["apexIndex"] <= c["throttleIndex"] <= c["exitIndex"]
        assert result["samples"][c["apexIndex"]]["distance"] == c["distance"]
        assert c["minSpeed"] <= c["entrySpeed"] and c["minSpeed"] <= c["exitSpeed"]


def test_flat_circle_matches_analytical_grip_limit(source):
    track, vehicle = source
    data = track.model_dump()
    phase = np.linspace(0, 2 * np.pi, 240, endpoint=False)
    data["points"] = [
        dict(x=100 * np.cos(t), y=0, z=100 * np.sin(t), widthLeft=6, widthRight=6) for t in phase
    ]
    vehicle = vehicle.model_copy(update={"downforceArea": 0, "dragArea": 0.01})
    setup = Setup(solver="centerline", temperature=28, tire="medium")
    r = solve(Track.model_validate(data), vehicle, setup)
    expected_speed = np.sqrt(0.98 * vehicle.friction * G * 100)
    assert r["averageSpeed"] == pytest.approx(expected_speed, rel=0.003)
    assert np.ptp([s["speed"] for s in r["samples"]]) < 0.001


def test_drivetrain_uses_power_curve_and_valid_gears(source):
    vehicle = source[1]
    gears, rpm, power = vehicle_state(vehicle, np.array([10, 30, 60, 90]))
    assert np.all(gears >= 1) and np.all(gears <= 8)
    assert np.all(rpm <= vehicle.maxRpm)
    assert np.all(power > 0) and np.all(power <= vehicle.powerKw * 1000)


def test_api_catalog_health_unknown_id_and_invalid_setup():
    client = TestClient(app)
    assert client.get("/api/health").json()["status"] == "ok"
    assert len(client.get("/api/catalog").json()["tracks"]) >= 1
    assert client.post("/api/simulate", json={"trackId": "unknown"}).status_code == 404
    assert client.post("/api/simulate", json={"setup": {"fuel": -10}}).status_code == 422
    assert client.post("/api/simulate", json={"setup": {"tire": "magic"}}).status_code == 422
    assert client.get("/api/schema/track").json()["title"] == "Track"


def test_api_custom_track_and_cross_origin_protection(source):
    client = TestClient(app)
    track = source[0].model_dump()
    track["id"] = "imported-test"
    response = client.post("/api/simulate", json={"track": track})
    assert response.status_code == 200
    assert response.json()["trackId"] == "imported-test"
    assert client.post("/api/simulate", json={}, headers={"origin": "https://example.com"}).status_code == 403
    assert client.post("/api/simulate", content=b" " * 1_500_001).status_code == 413


@pytest.mark.parametrize(
    ("origin", "expected"),
    [
        ("http://127.0.0.1:5174", 200),
        ("http://localhost:5174", 200),
        ("http://127.0.0.1:5175", 403),
        ("http://localhost:5174.example.com", 403),
    ],
)
def test_api_preview_origins_remain_exact(origin, expected):
    client = TestClient(app)
    assert client.post("/api/simulate", json={}, headers={"origin": origin}).status_code == expected


def test_api_runs_are_deterministic():
    client = TestClient(app)
    a = client.post("/api/simulate", json={}).json()
    b = client.post("/api/simulate", json={}).json()
    assert a == b


def test_flying_lap_is_invariant_to_rotating_start_sample(source, result):
    track, vehicle = source
    data = track.model_dump()
    data["points"] = data["points"][180:] + data["points"][:180]
    rotated = solve(Track.model_validate(data), vehicle, Setup())
    assert rotated["lapTime"] == pytest.approx(result["lapTime"], abs=0.03)


@pytest.mark.parametrize(
    "setup",
    [
        Setup(fuel=110, tire="hard", trackState="green", temperature=5, aero=-5, brakeBias=70),
        Setup(fuel=0, tire="soft", temperature=45, aero=5, brakeBias=50),
        Setup(airDensity=0.9, aero=-5),
        Setup(airDensity=1.4, aero=5),
    ],
)
def test_setup_extremes_produce_finite_closed_laps(source, setup):
    result = solve(*source, setup)
    assert 50 < result["lapTime"] < 200
    assert all(0 <= s["throttle"] <= 1 and 0 <= s["brake"] <= 1 for s in result["samples"])
    assert np.isfinite([s["speed"] for s in result["samples"]]).all()
    assert result["samples"][0]["speed"] == result["samples"][-1]["speed"]
