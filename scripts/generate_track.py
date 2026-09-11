"""Generate original synthetic data; never a surveyed or official real-world circuit."""

import json
from pathlib import Path

import numpy as np
from scipy.interpolate import CubicSpline

ROOT = Path(__file__).resolve().parents[1]
controls = np.array(
    [
        [-850, -320],
        [-350, -330],
        [200, -345],
        [610, -310],
        [850, -130],
        [780, 55],
        [520, 95],
        [310, 70],
        [230, 260],
        [115, 440],
        [-120, 505],
        [-360, 360],
        [-525, 160],
        [-325, 75],
        [-180, -40],
        [-360, -145],
        [-575, -50],
        [-730, 125],
        [-930, 85],
        [-1000, -115],
        [-850, -320],
    ],
    dtype=float,
)
chord = np.r_[0, np.cumsum(np.linalg.norm(np.diff(controls, axis=0), axis=1))]
spline = CubicSpline(chord, controls, bc_type="periodic")
dense = spline(np.linspace(0, chord[-1], 6000))
arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(dense, axis=0), axis=1))]
target = np.linspace(0, arc[-1], 720, endpoint=False)
xz = np.column_stack([np.interp(target, arc, dense[:, i]) for i in range(2)])
xz *= 5600 / arc[-1]
phase = np.arange(720) / 720 * 2 * np.pi
heights = 37 * np.sin(phase - 1) + 14 * np.sin(phase * 2 + 0.5) + 5 * np.sin(phase * 5)
heights -= min(heights)
points = [
    dict(
        x=round(float(p[0]), 4),
        y=round(float(h), 4),
        z=round(float(p[1]), 4),
        widthLeft=8.0,
        widthRight=8.0,
        banking=0,
    )
    for p, h in zip(xz, heights)
]
track = dict(
    schemaVersion=2,
    id="ardennes-development",
    name="LAPTRIX Dev Track",
    country="Synthetic · elevation study",
    synthetic=True,
    closed=True,
    provenance=(
        "Original LAPTRIX procedural development circuit. Not Spa-Francorchamps or surveyed track data."
    ),
    sectorFractions=[0.32, 0.67, 1],
    points=points,
)
(ROOT / "data/tracks").mkdir(parents=True, exist_ok=True)
(ROOT / "data/tracks/ardennes-development.json").write_text(json.dumps(track, indent=2) + "\n")
print(f"Generated {len(points)} original circuit samples")
