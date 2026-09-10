"""Original analytic elevation-sampling study; no filtering or measured accuracy claims."""

import argparse
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from apps.simulation.main import catalog  # noqa: E402
from apps.simulation.models import Setup, Track  # noqa: E402
from apps.simulation.solver import solve, vertical_curvature  # noqa: E402

RADIUS = 1000.0
WAVES = 360
EVALUATION_COUNT = 14400


def analytic_source(count: int, amplitude: float, phase: float) -> Track:
    """Sample a horizontal circle and a known elevation sine at explicit source nodes."""
    theta = np.arange(count) * 2 * np.pi / count
    return Track.model_validate(
        dict(
            schemaVersion=2,
            id="analytic-elevation-sensitivity",
            name="Analytic elevation sensitivity",
            country="Synthetic",
            provenance=(
                "Original radius-1000 m circle with 360 sine elevation waves and declared amplitude/phase; "
                "not a measured road or suspension benchmark."
            ),
            synthetic=True,
            closed=True,
            sectorFractions=[1 / 3, 2 / 3, 1],
            points=[
                dict(
                    x=RADIUS * np.cos(t),
                    y=amplitude * np.sin(WAVES * t + phase),
                    z=RADIUS * np.sin(t),
                    widthLeft=6,
                    widthRight=6,
                )
                for t in theta
            ],
        )
    )


def geometry_metrics(points: np.ndarray, amplitude: float, phase: float) -> dict:
    """Compare sampled geometry with independently differentiated continuous height."""
    theta = np.unwrap(np.arctan2(points[:, 2], points[:, 0]))
    forward = np.roll(points, -1, axis=0) - points
    lengths = np.linalg.norm(forward, axis=1)
    curvature = vertical_curvature(points)
    argument = WAVES * theta + phase
    # For u = R theta, k = y''(u) / (1 + y'(u)^2)^(3/2).
    exact_curvature = (
        -amplitude
        * (WAVES / RADIUS) ** 2
        * np.sin(argument)
        / (1 + (amplitude * WAVES / RADIUS * np.cos(argument)) ** 2) ** 1.5
    )
    exact_peak = amplitude * (WAVES / RADIUS) ** 2
    dense_theta = np.arange(EVALUATION_COUNT) * 2 * np.pi / EVALUATION_COUNT
    dense_height = amplitude * np.sin(WAVES * dense_theta + phase)
    linear_height = np.interp(dense_theta, np.r_[theta, 2 * np.pi], np.r_[points[:, 1], points[0, 1]])
    sampled_peak = float(np.max(np.abs(curvature)))
    return dict(
        pointCount=len(points),
        meanSamplesPerWave=len(points) / WAVES,
        meanHorizontalSpacingM=float(np.mean(np.linalg.norm(forward[:, [0, 2]], axis=1))),
        elevationRangeM=float(np.ptp(points[:, 1])),
        maxAbsGradient=float(np.max(np.abs(forward[:, 1]) / lengths)),
        maxAbsVerticalCurvatureInvM=sampled_peak,
        analyticPeakVerticalCurvatureInvM=exact_peak,
        peakCurvatureRatio=sampled_peak / exact_peak if exact_peak else None,
        maxNodeCurvatureErrorInvM=float(np.max(np.abs(curvature - exact_curvature))),
        maxLinearElevationErrorM=float(np.max(np.abs(linear_height - dense_height))),
        elevationErrorEvaluationCount=EVALUATION_COUNT,
    )


def study() -> dict:
    _, vehicles = catalog()
    report = dict(
        format="laptrix-elevation-study-v1",
        generatedAt=datetime.now(UTC).isoformat(),
        studySourceFingerprint="sha256:"
        + hashlib.sha256(Path(__file__).read_text(encoding="utf-8").encode()).hexdigest(),
        note=(
            "Original analytic source-sensitivity study. Centerline mode isolates elevation sampling. "
            "No smoothing, source recovery, suspension model or real-world accuracy is established. "
            "Source phases are rotations of the same continuous ring, not the same sampled track. "
            "The 2000-point case is not a converged ground-truth lap."
        ),
        analytic=dict(
            radiusM=RADIUS,
            waveCount=WAVES,
            horizontalWavelengthM=2 * np.pi * RADIUS / WAVES,
            elevation="amplitudeM * sin(waveCount * theta + phaseRad)",
            curvature="-A * (w/R)^2 * sin(w*theta+p) / (1 + (A*w/R*cos(w*theta+p))^2)^(3/2)",
        ),
        vehicles={vehicle.id: vehicle.model_dump(mode="json") for vehicle in vehicles},
        sources={},
        cases=[],
    )
    source_cases = [(720, "source"), (720, "5m"), (720, "3m"), (1440, "source"), (2000, "source")]
    phases = [("flat", 0.0, 0.0), ("zero-phase", 0.1, 0.0), ("quarter-phase", 0.1, np.pi / 2)]
    for vehicle in vehicles:
        for count, sampling in source_cases:
            baseline = None
            for label, amplitude, phase in phases:
                source_key = f"{count}-{label}"
                source = analytic_source(count, amplitude, phase)
                if source_key not in report["sources"]:
                    points = np.array([[p.x, p.y, p.z] for p in source.points])
                    report["sources"][source_key] = dict(
                        amplitudeM=amplitude,
                        phaseRad=float(phase),
                        track=source.model_dump(mode="json"),
                        metrics=geometry_metrics(points, amplitude, phase),
                    )
                setup = Setup(solver="centerline", sampling=sampling)
                row = dict(sourceKey=source_key, vehicleId=vehicle.id, setup=setup.model_dump(mode="json"))
                try:
                    lap = solve(source, vehicle, setup)
                    if label == "flat":
                        baseline = lap["lapTime"]
                    points = np.array([[p[k] for k in ("x", "y", "z")] for p in lap["sampling"]["points"]])
                    checks = lap["numericalChecks"]
                    row.update(
                        lap=lap,
                        lapChangeFromFlatSeconds=lap["lapTime"] - baseline if baseline is not None else None,
                        effectiveGeometry=geometry_metrics(points, amplitude, phase),
                        numericallyEligible=(
                            checks["speedConverged"]
                            and checks["maxDemandRatio"] <= checks["demandTolerance"]
                            and checks["minNormalLoadG"] > 0
                        ),
                    )
                    print(
                        f"{vehicle.id:20} {count:4} {sampling:6} {label:13} "
                        f"lap={lap['lapTime']:.6f} s load={checks['minNormalLoadG']:.6f} "
                        f"demand={checks['maxDemandRatio']:.9f} eligible={row['numericallyEligible']}",
                        flush=True,
                    )
                except ValueError as error:
                    row.update(error=str(error), numericallyEligible=False)
                    print(f"{vehicle.id} {count} {sampling} {label}: {error}", flush=True)
                report["cases"].append(row)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/elevation-study.json")
    args = parser.parse_args()
    report = study()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    eligible = sum(row["numericallyEligible"] for row in report["cases"])
    print(f"Report: {args.output}; {eligible}/{len(report['cases'])} numerically eligible")
    if eligible != len(report["cases"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
