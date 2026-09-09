import numpy as np
import pytest

from apps.simulation.main import catalog
from apps.simulation.models import Setup
from apps.simulation.sampling import track_fingerprint
from apps.simulation.solver import solve


@pytest.mark.parametrize(
    "solver,sampling",
    [("centerline", "source"), ("optimized", "source"), ("optimized", "3m"), ("lap-time", "5m")],
)
def test_v2_sector_gates_remain_at_the_declared_source_positions(solver, sampling):
    tracks, vehicles = catalog()
    track = tracks[0].model_copy(update={"schemaVersion": 2})
    lap = solve(track, vehicles[0], Setup(solver=solver, sampling=sampling))
    progress = np.array(lap["alignment"]["progress"])
    distances = np.array([sample["distance"] for sample in lap["samples"]])
    times = np.array([sample["time"] for sample in lap["samples"]])
    actual = np.interp([sector["endDistance"] for sector in lap["sectors"]], distances, progress)
    np.testing.assert_allclose(actual, track.sectorFractions, atol=1e-12)
    expected_splits = np.interp(track.sectorFractions, progress, times)
    np.testing.assert_allclose([sector["split"] for sector in lap["sectors"]], expected_splits, atol=1e-10)
    assert lap["sectorBasis"] == "source-progress"
    assert [sector["endProgress"] for sector in lap["sectors"]] == track.sectorFractions
    assert [sector["startProgress"] for sector in lap["sectors"]] == [0, *track.sectorFractions[:-1]]
    expected_ids = np.minimum(
        len(track.sectorFractions), np.searchsorted(track.sectorFractions, progress, side="right") + 1
    )
    np.testing.assert_array_equal([sample["sectorId"] for sample in lap["samples"]], expected_ids)


def test_legacy_tracks_keep_distance_sectors_without_changing_lap_physics_or_reference_identity():
    tracks, vehicles = catalog()
    source = tracks[0]
    legacy = source.model_copy(update={"schemaVersion": 1})
    current = source.model_copy(update={"schemaVersion": 2})
    old = solve(legacy, vehicles[1], Setup())
    new = solve(current, vehicles[1], Setup())
    assert track_fingerprint(legacy) == track_fingerprint(current)
    assert old["sectorBasis"] == "racing-line-distance"
    assert old["lapTime"] == new["lapTime"]
    assert [s["speed"] for s in old["samples"]] == [s["speed"] for s in new["samples"]]
    np.testing.assert_allclose(
        [s["endDistance"] for s in old["sectors"]], np.array(source.sectorFractions) * old["length"]
    )
    assert max(abs(a["endDistance"] - b["endDistance"]) for a, b in zip(old["sectors"], new["sectors"])) > 0.1
    assert sum(s["time"] for s in new["sectors"]) == pytest.approx(new["lapTime"])
