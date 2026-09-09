import copy

import numpy as np
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from apps.simulation.main import app, catalog
from apps.simulation.models import Setup, Vehicle
from apps.simulation.solver import solve, vehicle_state


@pytest.mark.parametrize("mutation", ["gears", "rpm-order", "coverage", "peak", "url"])
def test_vehicle_contract_rejects_inconsistent_drivetrain_or_source(mutation):
    data = copy.deepcopy(catalog()[1][1].model_dump(mode="json"))
    if mutation == "gears":
        data["gearRatios"][1] = data["gearRatios"][0]
    elif mutation == "rpm-order":
        data["powerCurve"][1]["rpm"] = data["powerCurve"][0]["rpm"]
    elif mutation == "coverage":
        data["powerCurve"].pop()
    elif mutation == "peak":
        data["powerKw"] += 1
    else:
        data["sources"][0]["url"] = "javascript:alert(1)"
    with pytest.raises(ValidationError):
        Vehicle.model_validate(data)


def test_gt_specification_anchors_and_estimates_remain_distinct():
    vehicle = catalog()[1][1]
    point = next(p for p in vehicle.powerCurve if p.rpm == 6300)
    assert point.powerKw == pytest.approx(465 * 6300 * 2 * np.pi / 60 / 1000, abs=0.001)
    assert vehicle.synthetic and vehicle.bodyStyle == "coupe"
    assert vehicle.sources and len(vehicle.assumptions) >= 3
    assert vehicle.mass != 1450  # Published DIN mass is not the simulation's fuel-exclusive base mass.


@pytest.mark.parametrize("vehicle", catalog()[1], ids=lambda v: v.id)
def test_drivetrain_redline_and_power_at_gear_boundaries(vehicle):
    ratios = np.array(vehicle.gearRatios) * vehicle.finalDrive
    redline_speeds = vehicle.maxRpm * 2 * np.pi * vehicle.wheelRadius / (60 * ratios)
    speeds = np.r_[0.0, redline_speeds * (1 - 1e-6), redline_speeds[:-1] * (1 + 1e-6)]
    gear, rpm, power = vehicle_state(vehicle, speeds)
    assert np.all((gear >= 1) & (gear <= len(ratios)))
    expected_rpm = np.maximum(
        vehicle.idleRpm, speeds / vehicle.wheelRadius * 60 / (2 * np.pi) * ratios[gear - 1]
    )
    np.testing.assert_allclose(rpm, expected_rpm)
    assert np.all(rpm <= vehicle.maxRpm)
    assert np.all((power > 0) & (power <= vehicle.powerKw * 1000))


def test_gt_full_lap_refinement_and_cross_vehicle_comparison():
    tracks, vehicles = catalog()
    formula = solve(tracks[0], vehicles[0], Setup())
    gt = solve(tracks[0], vehicles[1], Setup(solver="lap-time"))
    assert gt["lapTime"] > formula["lapTime"] * 1.1
    assert gt["maxSpeed"] < formula["maxSpeed"]
    assert gt["alignment"] == formula["alignment"]
    assert gt["vehicle"] == vehicles[1].model_dump(mode="json")
    assert gt["optimization"]["refinement"]["status"] == "completed"
    assert gt["lapTime"] <= gt["optimization"]["refinement"]["seedLapTime"]
    assert gt["numericalChecks"]["speedConverged"]
    assert gt["numericalChecks"]["maxDemandRatio"] <= 1.015
    assert sum(s["time"] for s in gt["sectors"]) == pytest.approx(gt["lapTime"])
    for point, sample in zip(tracks[0].points, gt["samples"]):
        assert vehicles[1].width / 2 + 0.35 - point.widthRight - 1e-6 <= sample["offset"]
        assert sample["offset"] <= point.widthLeft - vehicles[1].width / 2 - 0.35 + 1e-6


def test_catalog_and_api_serialize_vehicle_provenance():
    client = TestClient(app)
    vehicles = client.get("/api/catalog").json()["vehicles"]
    assert [v["id"] for v in vehicles] == ["formula-development", "gt-development"]
    response = client.post("/api/simulate", json={"vehicleId": "gt-development"})
    assert response.status_code == 200
    assert response.json()["vehicle"] == vehicles[1]
