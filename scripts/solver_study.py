"""Reproducible grid study of the synthetic input; interpolation adds no survey accuracy."""

import argparse
import json
import platform
import sys
from pathlib import Path

import numpy as np
from scipy.interpolate import CubicSpline

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from apps.simulation.main import catalog  # noqa: E402
from apps.simulation.models import Setup, Track  # noqa: E402
from apps.simulation.solver import solve  # noqa: E402


def resample(track: Track, count: int):
    """Periodic cubic XYZ interpolation and linear widths in original sample parameter."""
    if not 40 <= count <= 2000:
        raise ValueError("Study sample count must be between 40 and 2000")
    source = track.model_dump()
    n = len(track.points)
    parameter = np.arange(n + 1) / n
    target = np.arange(count) / count
    xyz = np.array([[p.x, p.y, p.z] for p in track.points])
    spline = CubicSpline(parameter, np.vstack([xyz, xyz[0]]), bc_type="periodic")
    widths = [
        np.interp(
            target, parameter, [getattr(p, key) for p in track.points] + [getattr(track.points[0], key)]
        )
        for key in ("widthLeft", "widthRight")
    ]
    source["points"] = [
        dict(x=x, y=y, z=z, widthLeft=widths[0][i], widthRight=widths[1][i])
        for i, (x, y, z) in enumerate(spline(target))
    ]
    return Track.model_validate(source)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--counts", nargs="+", type=int, default=[180, 360, 720, 1440, 2000])
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/solver-study.json")
    args = parser.parse_args()
    track, vehicle = (items[0] for items in catalog())
    report = dict(
        trackId=track.id,
        vehicleId=vehicle.id,
        python=platform.python_version(),
        platform=platform.platform(),
        setup=Setup().model_dump(),
        note="Synthetic grid study, not real-world validation. Resampling adds no source accuracy.",
        rows=[],
    )
    print("Samples  Mode         Lap (s)  Gain (s)  Time (ms)  Seed converged  Max demand", flush=True)
    for count in args.counts:
        sampled = resample(track, count)
        for mode in ("centerline", "optimized", "lap-time"):
            lap = solve(sampled, vehicle, Setup(solver=mode))
            refinement = lap["optimization"].get("refinement", {})
            row = dict(
                samples=count,
                mode=mode,
                lapTime=lap["lapTime"],
                length=lap["length"],
                computationMs=lap["computationMs"],
                optimization=lap["optimization"],
                numericalChecks=lap["numericalChecks"],
            )
            report["rows"].append(row)
            print(
                f"{count:7}  {mode:11}  {lap['lapTime']:7.3f}  {refinement.get('gainSeconds', 0):8.3f}"
                f"  {lap['computationMs']:9.1f}  {str(lap['optimization']['converged']):14}"
                f"  {lap['numericalChecks']['maxDemandRatio']:.6f}",
                flush=True,
            )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Report: {args.output}")


if __name__ == "__main__":
    main()
