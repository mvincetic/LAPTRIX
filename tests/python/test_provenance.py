from apps.simulation.provenance import fingerprint_sources, solver_provenance


def test_solver_identity_ignores_checkout_line_endings_but_detects_source_changes():
    sources = {"solver.py": "x = 1\ny = 2\n", "models.py": "a = 3\n"}
    original = fingerprint_sources(sources)
    assert original == fingerprint_sources(
        {name: value.replace("\n", "\r\n") for name, value in reversed(sources.items())}
    )
    assert original != fingerprint_sources({**sources, "solver.py": "x = 2\ny = 2\n"})
    assert original != fingerprint_sources({"other.py": sources["solver.py"], "models.py": "a = 3\n"})
    record = solver_provenance()
    assert record["sourceFingerprint"].startswith("sha256:")
    assert len(record["sourceFingerprint"]) == 71
    assert {"solver.py", "sampling.py", "numerics.py", "models.py"} <= set(record["sourceFiles"])
