import copy

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from apps.simulation.main import app, catalog
from apps.simulation.models import Vehicle, VehicleProfile


@pytest.mark.parametrize("vehicle", catalog()[1], ids=lambda v: v.id)
def test_bundled_vehicle_exports_are_valid_editable_profiles(vehicle):
    exported = vehicle.model_dump(mode="json")
    assert VehicleProfile.model_validate(exported).model_dump(mode="json") == exported


def test_inline_profile_uses_its_complete_inputs_without_mutating_catalog_or_crossing_cache_keys():
    client = TestClient(app)
    before = client.get("/api/catalog").json()
    profile = copy.deepcopy(before["vehicles"][0])
    profile.update(id="user-formula", name="Original user Formula fixture", mass=950)
    profile["powerKw"] *= 0.7
    for point in profile["powerCurve"]:
        point["powerKw"] *= 0.7
    first = client.post("/api/simulate", json={"vehicle": profile})
    assert first.status_code == 200
    first = first.json()
    assert first["vehicleId"] == profile["id"]
    assert first["vehicle"] == profile
    assert first["numericalChecks"]["speedConverged"]
    assert first["numericalChecks"]["maxDemandRatio"] <= 1.015
    profile["mass"] += 200
    changed = client.post("/api/simulate", json={"vehicle": profile}).json()
    assert changed["vehicle"]["mass"] == 1150
    assert changed["lapTime"] > first["lapTime"]
    profile["mass"] -= 200
    repeated = client.post("/api/simulate", json={"vehicle": profile}).json()
    assert repeated == first
    assert client.get("/api/catalog").json() == before
    assert client.post("/api/simulate", json={"vehicleId": "user-formula"}).status_code == 404


@pytest.mark.parametrize(
    "change",
    [
        {"mass": 1e12},
        {"wheelRadius": "0.34"},
        {"assumptions": []},
        {"gearRatios": list(range(13, 0, -1))},
        {"powerKw": 600},
        {"unexpectedTuning": 1},
    ],
)
def test_profile_request_rejects_extreme_ambiguous_or_inconsistent_inputs(change):
    profile = catalog()[1][0].model_dump(mode="json") | change
    response = TestClient(app).post("/api/simulate", json={"vehicle": profile})
    assert response.status_code == 422


def test_editable_bounds_do_not_narrow_the_existing_vehicle_snapshot_reader():
    archived = catalog()[1][0].model_dump(mode="json") | {"mass": 5000}
    assert Vehicle.model_validate(archived).mass == 5000
    with pytest.raises(ValidationError):
        VehicleProfile.model_validate(archived)
    schema = TestClient(app).get("/api/schema/vehicle").json()
    assert schema["title"] == "VehicleProfile"
    assert "assumptions" in schema["required"]
    assert schema["additionalProperties"] is False
