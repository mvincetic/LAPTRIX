"""Identify the solver source and numerical runtime loaded by this process."""

import hashlib
import platform
from pathlib import Path

import numpy as np
import scipy

SOURCE_FILES = ("drivetrain.py", "models.py", "numerics.py", "provenance.py", "sampling.py", "solver.py")


def fingerprint_sources(sources: dict[str, str]) -> str:
    digest = hashlib.sha256(b"laptrix.solver.source.v1\0")
    for name, source in sorted(sources.items()):
        digest.update(name.encode("utf-8") + b"\0")
        digest.update(source.replace("\r\n", "\n").encode("utf-8") + b"\0")
    return "sha256:" + digest.hexdigest()


# Read once on import: later file edits do not relabel this process's cached laps.
_FINGERPRINT = fingerprint_sources(
    {name: (Path(__file__).parent / name).read_text(encoding="utf-8") for name in SOURCE_FILES}
)


def solver_provenance() -> dict:
    return {
        "sourceFingerprint": _FINGERPRINT,
        "sourceFiles": list(SOURCE_FILES),
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "platform": platform.system(),
        "machine": platform.machine(),
    }
