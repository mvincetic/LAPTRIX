import copy
import hashlib
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import pytest
from pydantic import ValidationError

from apps.simulation.main import catalog
from apps.simulation.models import Setup, Track
from apps.simulation.sampling import track_fingerprint
from apps.simulation.solver import solve

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/sources/red-bull-ring"


def test_showcase_sources_keep_exact_pinned_bytes_and_the_complete_directed_gp_ring():
    manifest = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))
    for name, info in manifest["files"].items():
        content = (SOURCE / name).read_bytes()
        assert len(content) == info["bytes"]
        assert hashlib.sha256(content).hexdigest() == info["sha256"]
    root = ET.parse(SOURCE / "osm-gp.osm").getroot()
    ways = {e.get("id"): e for e in root.findall("way")}
    chain = []
    for way_id in manifest["osm"]["gpWays"]:
        assert way_id not in manifest["osm"]["excludedWays"]
        refs = [e.get("ref") for e in ways[way_id].findall("nd")]
        if chain:
            assert chain[-1] == refs[0]
        chain.extend(refs[1:] if chain else refs)
    assert chain[0] == chain[-1]
    assert len(chain) == 248
    assert len(set(chain[:-1])) == 247
    assert manifest["osm"]["finishNode"] in chain
    assert manifest["osm"]["finishNode"] != manifest["osm"]["startNode"]


def test_both_bundled_tracks_preserve_identity_and_declared_source_assumptions():
    tracks, _ = catalog()
    dev, showcase = tracks[:2]
    assert dev.id == "ardennes-development" and dev.name == "LAPTRIX Dev Track"
    assert dev.synthetic and not showcase.synthetic
    assert track_fingerprint(dev) == "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689"
    assert showcase.id == "red-bull-ring"
    p = np.array([[v.x, v.y, v.z] for v in showcase.points])
    ds = np.linalg.norm(np.roll(p, -1, axis=0) - p, axis=1)
    assert len(p) == 720 and 4300 < ds.sum() < 4330
    assert np.all(ds > 5.9) and np.all(ds < 6.1)
    assert p[0, 0] == p[0, 2] == 0
    assert p[1, 0] < 0  # West along the mapped finish straight toward turn1.
    assert 62 < np.ptp(p[:, 1]) < 64
    signed_area = np.sum(p[:, 0] * np.roll(-p[:, 2], -1) - np.roll(p[:, 0], -1) * -p[:, 2]) / 2
    assert signed_area < 0  # Clockwise in east/north coordinates.
    assert showcase.attribution is not None
    assert showcase.country == "Austria · Spielberg"
    assert showcase.attribution.sources[0].credit == "© OpenStreetMap contributors"
    assert showcase.attribution.sources[1].title == "Terrain elevation · 2010"
    assert [s.license for s in showcase.attribution.sources] == ["ODbL 1.0", "CC BY 4.0"]
    assert "2010" in showcase.attribution.notes and "estimates" in showcase.attribution.notes
    literal = Track.model_validate_json(showcase.model_dump_json())
    assert literal.attribution == showcase.attribution
    assert track_fingerprint(literal) == track_fingerprint(showcase)
    assert track_fingerprint(showcase.model_copy(update={"attribution": None})) == track_fingerprint(showcase)


def test_track_attribution_rejects_unsafe_links_and_unbounded_metadata():
    data = json.loads((ROOT / "data/tracks/red-bull-ring.json").read_text(encoding="utf-8"))
    for key in ("url", "licenseUrl"):
        broken = copy.deepcopy(data)
        broken["attribution"]["sources"][0][key] = "javascript:alert(1)"
        with pytest.raises(ValidationError):
            Track.model_validate(broken)
    for key, value in [("notes", "x" * 1201), ("sources", []), ("documentationUrl", "file:///secret")]:
        broken = copy.deepcopy(data)
        broken["attribution"][key] = value
        with pytest.raises(ValidationError):
            Track.model_validate(broken)


@pytest.mark.parametrize("vehicle_index,mode", [(0, "centerline"), (0, "optimized"), (1, "optimized")])
def test_showcase_uses_the_existing_solver_with_closed_finite_telemetry(vehicle_index, mode):
    tracks, vehicles = catalog()
    track = next(t for t in tracks if t.id == "red-bull-ring")
    lap = solve(track, vehicles[vehicle_index], Setup(solver=mode))
    assert lap["trackId"] == track.id
    assert lap["trackAttribution"] == track.attribution.model_dump(mode="json")
    assert lap["alignment"]["trackFingerprint"] == track_fingerprint(track)
    assert 40 < lap["lapTime"] < 150
    times = np.array([s["time"] for s in lap["samples"]])
    assert np.all(np.diff(times) > 0) and times[0] == 0 and times[-1] == lap["lapTime"]
    for key in ("x", "y", "z", "speed", "normalLoadG", "trackGradient"):
        values = np.array([s[key] for s in lap["samples"]])
        assert np.isfinite(values).all()
        assert values[0] == pytest.approx(values[-1])
    assert sum(s["time"] for s in lap["sectors"]) == pytest.approx(lap["lapTime"])
    assert [s["endProgress"] for s in lap["sectors"]] == track.sectorFractions
