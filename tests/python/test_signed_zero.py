import math

import pytest
from fastapi.testclient import TestClient

from apps.simulation.main import app, catalog
from apps.simulation.models import Track
from apps.simulation.sampling import track_fingerprint

CANONICAL = "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689"


def test_signed_zero_matches_browser_hash_without_mutating_source():
    source = catalog()[0][0]
    assert track_fingerprint(source) == CANONICAL
    signed = source.model_copy(deep=True)
    signed.points[0].banking = -0.0
    signed = Track.model_validate_json(signed.model_dump_json())
    assert math.copysign(1, signed.points[0].banking) == -1
    assert track_fingerprint(signed) == CANONICAL
    assert math.copysign(1, signed.points[0].banking) == -1


@pytest.mark.parametrize("key", ["x", "y", "z"])
def test_coordinate_zero_signs_share_identity_but_subnormal_values_do_not(key):
    source = catalog()[0][0].model_copy(deep=True)
    origin = getattr(source.points[0], key)
    for point in source.points:
        setattr(point, key, getattr(point, key) - origin)
    source = Track.model_validate(source.model_dump())
    expected = track_fingerprint(source)
    setattr(source.points[0], key, -0.0)
    assert track_fingerprint(source) == expected
    setattr(source.points[0], key, math.ulp(0.0))
    assert track_fingerprint(source) != expected


def test_api_canonicalizes_literal_negative_zero_before_reference_alignment():
    source = catalog()[0][0].model_copy(deep=True)
    source.points[0].banking = -0.0
    # Python's JSON writer preserves this sign, unlike browser JSON.stringify.
    with TestClient(app) as client:
        response = client.post(
            "/api/simulate", json={"track": source.model_dump(), "setup": {"solver": "centerline"}}
        )
    assert response.status_code == 200
    lap = response.json()
    assert lap["alignment"]["trackFingerprint"] == CANONICAL
    assert math.copysign(1, lap["sampling"]["points"][0]["banking"]) == -1
