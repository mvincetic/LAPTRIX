"""Independent, approximate quasi-steady point-mass lap solver. No external solver code."""

import time

import numpy as np
from scipy.signal import find_peaks

from .drivetrain import available_power
from .models import Setup, Track, Vehicle
from .numerics import box_quadratic, curvature_quadratic
from .provenance import solver_provenance
from .sampling import prepare_track

G = 9.80665


def geometry(points: np.ndarray):
    forward = np.roll(points, -1, axis=0) - points
    ds = np.linalg.norm(forward, axis=1)
    tangent = np.roll(points, -1, axis=0) - np.roll(points, 1, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1)[:, None]
    normal = np.column_stack((tangent[:, 2], np.zeros(len(points)), -tangent[:, 0]))
    normal /= np.linalg.norm(normal, axis=1)[:, None]
    # Menger curvature of the horizontal projection, signed in the local lateral frame.
    a = points[:, [0, 2]] - np.roll(points[:, [0, 2]], 1, axis=0)
    b = np.roll(points[:, [0, 2]], -1, axis=0) - points[:, [0, 2]]
    cross = a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]
    denom = np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1) * np.linalg.norm(a + b, axis=1)
    curvature = -2 * cross / np.maximum(denom, 1e-10)
    return ds, tangent, normal, curvature


def optimize_line(track: Track, vehicle: Vehicle, enabled: bool):
    center = np.array([[p.x, p.y, p.z] for p in track.points])
    ds, _, normals, _ = geometry(center)
    n = len(center)
    margin = vehicle.width / 2 + 0.35
    bounds = [(margin - p.widthRight, p.widthLeft - margin) for p in track.points]
    if any(lo >= hi for lo, hi in bounds):
        raise ValueError("Vehicle does not fit within track boundaries with safety clearance")
    if not enabled:
        if any(lo > 0 or hi < 0 for lo, hi in bounds):
            raise ValueError("Vehicle does not fit on the centerline with safety clearance")
        return center, np.zeros(n), {"method": "Centerline baseline", "converged": True, "iterations": 0}

    hessian, linear, baseline = curvature_quadratic(center, normals, ds)
    lower, upper = np.array(bounds).T
    offsets, info = box_quadratic(hessian, linear, lower, upper)
    objective = float(0.5 * offsets @ (hessian @ offsets) + linear @ offsets + baseline)
    return (
        center + normals * offsets[:, None],
        offsets,
        {
            "method": "Bounded minimum-curvature approximation",
            **info,
            "curvatureObjectiveReduction": float(1 - objective / max(baseline, 1e-12)),
        },
    )


def vehicle_state(vehicle: Vehicle, speed):
    """Select the gear with highest available power, respecting redline."""
    ratios = np.array(vehicle.gearRatios) * vehicle.finalDrive
    rpm = np.maximum(
        np.asarray(speed)[..., None] / vehicle.wheelRadius * 60 / (2 * np.pi) * ratios, vehicle.idleRpm
    )
    curve_rpm = [p.rpm for p in vehicle.powerCurve]
    curve_power = [p.powerKw * 1000 for p in vehicle.powerCurve]
    power = np.interp(rpm, curve_rpm, curve_power)
    power = np.where(rpm <= vehicle.maxRpm, power, -1)
    idx = np.argmax(power, axis=-1)
    selected_rpm = np.take_along_axis(rpm, np.expand_dims(idx, -1), axis=-1)[..., 0]
    selected_power = np.take_along_axis(power, np.expand_dims(idx, -1), axis=-1)[..., 0]
    return idx + 1, np.minimum(selected_rpm, vehicle.maxRpm), np.maximum(selected_power, 0)


def line_geometry_error(points: np.ndarray, center: np.ndarray):
    """Check an offset line against the same source intervals before solving speed."""
    if not np.isfinite(points).all():
        return "Racing line contains nonfinite coordinates. Use Centerline mode or review source geometry"
    forward = np.roll(points, -1, axis=0) - points
    center_forward = np.roll(center, -1, axis=0) - center
    progress = np.sum(forward * center_forward, axis=1) / np.linalg.norm(center_forward, axis=1)
    # Small roundoff margins apply to derived geometry, not the input Track contract.
    if np.any(progress < 0.1 - 1e-9):
        return (
            "Racing line collapses or reverses a source interval. "
            "Use Centerline mode or review source geometry and widths"
        )
    if np.any(np.abs(forward[:, 1]) / np.linalg.norm(forward, axis=1) > 0.3 + 1e-9):
        return (
            "Racing line exceeds the supported slope limit (absolute rise / 3D distance <= 0.30). "
            "Use Centerline mode or review source elevations and widths"
        )
    return None


def vertical_curvature(points: np.ndarray):
    """Signed Menger curvature in the horizontal-distance/elevation plane.

    Positive curvature is a compression, negative curvature a crest. The closed
    incoming/outgoing chords retain the source's spacing and elevation noise.
    """
    forward = np.roll(points, -1, axis=0) - points
    longitudinal = np.column_stack((np.linalg.norm(forward[:, [0, 2]], axis=1), forward[:, 1]))
    previous = np.roll(longitudinal, 1, axis=0)
    cross = previous[:, 0] * longitudinal[:, 1] - previous[:, 1] * longitudinal[:, 0]
    denominator = (
        np.linalg.norm(previous, axis=1)
        * np.linalg.norm(longitudinal, axis=1)
        * np.linalg.norm(previous + longitudinal, axis=1)
    )
    return 2 * cross / denominator


def speed_profile(points: np.ndarray, vehicle: Vehicle, setup: Setup):
    ds, _, _, curvature = geometry(points)
    mass = vehicle.mass + setup.fuel
    mu = vehicle.friction * {"soft": 1.04, "medium": 1.0, "hard": 0.96}[setup.tire]
    mu *= (1 if setup.trackState == "optimum" else 0.92) * (1 - 0.00018 * (setup.temperature - 28) ** 2)
    rho = setup.airDensity
    lift = vehicle.downforceArea * (1 + setup.aero * 0.055)
    drag = vehicle.dragArea * (1 + setup.aero * 0.045)
    grade = (np.roll(points[:, 1], -1) - points[:, 1]) / ds
    # Grade is sin(slope). Curvature and lateral direction are horizontal;
    # road speed projects into that plane by cos(slope). Aero acts road-normal.
    cosine = np.sqrt(np.maximum(0, 1 - grade**2))
    normal_gravity = G * cosine
    vertical_curve = vertical_curvature(points)
    load_coefficient = vertical_curve + rho * lift / (2 * mass)
    k = np.abs(curvature) * cosine**2
    max_speed = (
        vehicle.maxRpm / (vehicle.gearRatios[-1] * vehicle.finalDrive) * 2 * np.pi / 60 * vehicle.wheelRadius
    )
    # Reserve 2% of lateral capacity for sustaining speed against resistance/gradient.
    limit = np.minimum(
        max_speed,
        np.sqrt(0.98 * mu * normal_gravity / np.maximum(k - 0.98 * mu * load_coefficient, 1e-6)),
    )
    # Independently retain 2% of gravity-supported contact load at a crest,
    # including straight sections with no lateral demand to impose a speed cap.
    contact_squared = np.divide(
        0.98 * normal_gravity,
        -load_coefficient,
        out=np.full_like(load_coefficient, np.inf),
        where=load_coefficient < 0,
    )
    limit = np.minimum(limit, np.sqrt(contact_squared))
    speeds = limit.copy()
    # Evaluate each gear's curve exactly, preserving discontinuities at redline.
    power_at_speed = available_power(vehicle)
    bias_efficiency = max(0.7, 1 - abs(setup.brakeBias - 56) * 0.012)

    def capacities(v, i):
        normal_load = normal_gravity[i] + load_coefficient[i] * v * v
        grip = mu * normal_load
        lateral = v * v * k[i]
        remaining = np.sqrt(max(0.0, grip * grip - lateral * lateral))
        resistance = rho * drag * v * v / (2 * mass) + 0.015 * normal_load
        drive = min(power_at_speed(v) * 0.94 / (mass * max(v, 4)), remaining)
        brake = min(vehicle.maxBrakeG * G * bias_efficiency, remaining)
        return drive - resistance - G * grade[i], brake + resistance + G * grade[i]

    # Closed-loop sweeps propagate constraints through the start/finish seam.
    for iteration in range(80):
        before = speeds.copy()
        for i in range(len(speeds) - 1, -1, -1):
            j = (i + 1) % len(speeds)
            # On a steep descent, gravity can exceed braking even at full command.
            # Negative net deceleration constrains the upstream speed too.
            available = capacities(speeds[j], j)[1]
            candidate = min(speeds[i], np.sqrt(max(1, speeds[j] ** 2 + 2 * available * ds[i])))
            # Downstream grip alone can overestimate braking at the segment's start.
            # Enforce the integrated demand against its own start-node capacity too.
            if candidate**2 - speeds[j] ** 2 > 2 * capacities(candidate, i)[1] * ds[i]:
                # A lateral cap can itself lie below the propagation floor.
                low, high = min(1.0, candidate), candidate
                for _ in range(24):
                    mid = (low + high) / 2
                    if mid**2 - speeds[j] ** 2 > 2 * capacities(mid, i)[1] * ds[i]:
                        high = mid
                    else:
                        low = mid
                candidate = low
            speeds[i] = candidate
        for i in range(len(speeds)):
            j = (i + 1) % len(speeds)
            available = capacities(speeds[i], i)[0]
            speeds[j] = min(speeds[j], np.sqrt(max(1, speeds[i] ** 2 + 2 * available * ds[i])))
        if np.max(np.abs(speeds - before)) < 1e-5:
            break
    next_speed = np.roll(speeds, -1)
    dt = 2 * ds / (speeds + next_speed)
    acceleration = (next_speed**2 - speeds**2) / (2 * ds)
    gear, rpm, power = vehicle_state(vehicle, speeds)
    normal_load = normal_gravity + load_coefficient * speeds**2
    if not np.isfinite(normal_load).all() or np.any(normal_load <= 0):
        raise ValueError("Road contact cannot be maintained; review crest geometry and source spacing")
    resistance = rho * drag * speeds**2 / (2 * mass) + 0.015 * normal_load
    wheel_acc = acceleration + resistance + G * grade
    grip = mu * normal_load
    remaining = np.sqrt(np.maximum(0, grip**2 - (speeds**2 * k) ** 2))
    drive = np.minimum(power * 0.94 / (mass * np.maximum(speeds, 4)), remaining)
    braking = np.minimum(vehicle.maxBrakeG * G * bias_efficiency, remaining)
    throttle = np.clip(wheel_acc / np.maximum(drive, 1e-5), 0, 1)
    brake = np.clip(-wheel_acc / np.maximum(braking, 1e-5), 0, 1)
    # Check the actual integrated segment demand; clipped actuators alone hide infeasibility.
    demand_ratio = float(
        max(
            np.max(np.hypot(speeds**2 * k, wheel_acc) / grip),
            np.max(np.maximum(wheel_acc, 0) / np.maximum(drive, 1e-5)),
            np.max(np.maximum(-wheel_acc, 0) / np.maximum(braking, 1e-5)),
        )
    )
    return dict(
        ds=ds,
        dt=dt,
        speed=speeds,
        curvature=curvature,
        grade=grade,
        lateral=speeds**2 * curvature * cosine**2,
        vertical=speeds**2 * vertical_curve,
        normalLoad=normal_load,
        acceleration=acceleration,
        gear=gear,
        rpm=rpm,
        throttle=throttle,
        brake=brake,
        iterations=iteration + 1,
        converged=bool(np.max(np.abs(speeds - before)) < 1e-5),
        maxDemandRatio=demand_ratio,
    )


def refine_line(track: Track, vehicle: Vehicle, setup: Setup, offsets, profile):
    """Deterministic local search scored with the selected vehicle's full speed envelope.

    Three passes examine broad, periodic blends toward each safe boundary. This
    fixed candidate budget is not a claim of minimum-time convergence. Keep the
    seed unless a converged, numerically feasible candidate improves its lap time.
    """
    center = np.array([[p.x, p.y, p.z] for p in track.points])
    ds, _, normals, _ = geometry(center)
    distance = np.r_[0, np.cumsum(ds)[:-1]]
    length = float(np.sum(ds))
    margin = vehicle.width / 2 + 0.35
    bounds = (
        np.array([margin - p.widthRight for p in track.points]),
        np.array([p.widthLeft - margin for p in track.points]),
    )
    baseline_time = float(np.sum(profile["dt"]))
    best_time = baseline_time
    info = dict(
        seedLapTime=baseline_time,
        gainSeconds=0.0,
        evaluations=0,
        evaluationBudget=78,
        acceptedSteps=0,
        rejectedCandidates=0,
        status="completed",
    )
    if (
        not profile["converged"]
        or not np.isfinite(profile["maxDemandRatio"])
        or profile["maxDemandRatio"] > 1.015
    ):
        info["status"] = "seed-infeasible"
        return offsets, profile, info
    # Anchor by geometry, independent of the start index, map origin and orientation.
    centroid = np.sum((center + np.roll(center, -1, axis=0)) * 0.5 * ds[:, None], axis=0) / length
    anchor = int(np.argmax(np.sum((center[:, [0, 2]] - centroid[[0, 2]]) ** 2, axis=1)))
    weights = [np.ones(len(center))]
    for origin in (distance[anchor] + np.arange(12) * length / 12) % length:
        separation = np.abs(distance - origin)
        separation = np.minimum(separation, length - separation)
        weights.append(0.5 + 0.5 * np.cos(np.minimum(separation / (length / 12), 1) * np.pi))
    for fraction in (0.3, 0.15, 0.075):
        for weight in weights:
            for bound in bounds:
                candidate = offsets + fraction * weight * (bound - offsets)
                points = center + normals * candidate[:, None]
                info["evaluations"] += 1
                if line_geometry_error(points, center):
                    info["rejectedCandidates"] += 1
                    continue
                trial = speed_profile(points, vehicle, setup)
                lap_time = float(np.sum(trial["dt"]))
                if (
                    not np.isfinite(lap_time)
                    or not np.isfinite(trial["maxDemandRatio"])
                    or not trial["converged"]
                    or trial["maxDemandRatio"] > 1.015
                ):
                    info["rejectedCandidates"] += 1
                    continue
                if lap_time < best_time - 1e-5:
                    offsets, profile, best_time = candidate, trial, lap_time
                    info["acceptedSteps"] += 1
    info["gainSeconds"] = max(0.0, baseline_time - best_time)
    return offsets, profile, info


def solve(track: Track, vehicle: Vehicle, setup: Setup):
    started = time.perf_counter()
    track, sampling, alignment = prepare_track(track, setup.sampling)
    points, offsets, optimization = optimize_line(track, vehicle, setup.solver != "centerline")
    if setup.solver != "centerline":
        center = np.array([[p.x, p.y, p.z] for p in track.points])
        geometry_error = line_geometry_error(points, center)
        if geometry_error:
            raise ValueError(geometry_error)
    profile = speed_profile(points, vehicle, setup)
    if setup.solver == "lap-time":
        offsets, profile, refinement = refine_line(track, vehicle, setup, offsets, profile)
        center = np.array([[p.x, p.y, p.z] for p in track.points])
        center_ds, _, normals, _ = geometry(center)
        points = center + normals * offsets[:, None]
        hessian, linear, baseline = curvature_quadratic(center, normals, center_ds)
        objective = float(0.5 * offsets @ (hessian @ offsets) + linear @ offsets + baseline)
        optimization.update(
            method="Minimum curvature + lap-time search",
            refinement=refinement,
            curvatureObjectiveReduction=float(1 - objective / max(baseline, 1e-12)),
        )
    ds, dt = profile["ds"], profile["dt"]
    distances = np.r_[0, np.cumsum(ds)]
    times = np.r_[0, np.cumsum(dt)]
    total_length, lap_time = float(distances[-1]), float(times[-1])
    progress = np.asarray(alignment["progress"])
    if track.schemaVersion == 2:
        gate_progress = np.r_[0.0, track.sectorFractions]
        gate_distances = np.interp(gate_progress, progress, distances)
        sector_basis = "source-progress"
    else:
        # Preserve the explicitly documented v1 racing-line-distance semantics.
        gate_distances = np.r_[0.0, track.sectorFractions] * total_length
        gate_progress = np.interp(gate_distances, distances, progress)
        sector_basis = "racing-line-distance"
    n = len(points)
    corner_ids = np.zeros(n, dtype=int)
    curvature = np.abs(profile["curvature"])
    # Tile so peaks near the lap seam have the same detection behavior.
    peaks, _ = find_peaks(
        np.tile(curvature, 3),
        distance=max(8, int(100 / np.mean(ds))),
        prominence=max(0.0005, float(np.max(curvature)) * 0.08),
    )
    peaks = peaks[(peaks >= n) & (peaks < 2 * n)] - n
    corners = []
    for cid, apex in enumerate(sorted(peaks), 1):
        lo, hi = int(apex), int(apex)
        while lo > max(0, apex - n // 12) and curvature[lo] > curvature[apex] * 0.25:
            lo -= 1
        while hi < min(n - 1, apex + n // 12) and curvature[hi] > curvature[apex] * 0.25:
            hi += 1
        brake_start = lo
        while brake_start > 0 and profile["brake"][brake_start - 1] > 0.05:
            brake_start -= 1
        pickup = next((i for i in range(apex, hi + 1) if profile["throttle"][i] > 0.3), hi)
        minimum = lo + int(np.argmin(profile["speed"][lo : hi + 1]))
        corner_ids[lo : hi + 1] = cid
        corners.append(
            dict(
                id=cid,
                direction="L" if profile["curvature"][apex] > 0 else "R",
                apexIndex=int(apex),
                entryIndex=lo,
                exitIndex=hi,
                brakingIndex=brake_start,
                turnInIndex=lo,
                throttleIndex=int(pickup),
                distance=float(distances[apex]),
                entrySpeed=float(profile["speed"][lo]),
                minSpeed=float(profile["speed"][minimum]),
                exitSpeed=float(profile["speed"][hi]),
                lateralG=float(abs(profile["lateral"][apex]) / G),
                brakingDistance=float(distances[apex] - distances[brake_start]),
                time=float(times[hi] - times[lo]),
            )
        )
    samples = []
    for i in range(n + 1):
        j = i % n
        sector = min(
            len(track.sectorFractions),
            1 + int(np.searchsorted(gate_distances[1:], distances[i], side="right")),
        )
        samples.append(
            dict(
                distance=float(distances[i]),
                time=float(times[i]),
                x=float(points[j, 0]),
                y=float(points[j, 1]),
                z=float(points[j, 2]),
                speed=float(profile["speed"][j]),
                rpm=float(profile["rpm"][j]),
                gear=int(profile["gear"][j]),
                throttle=float(profile["throttle"][j]),
                brake=float(profile["brake"][j]),
                steering=float(np.arctan(vehicle.wheelbase * profile["curvature"][j])),
                longitudinalG=float(profile["acceleration"][j] / G),
                lateralG=float(profile["lateral"][j] / G),
                verticalG=float(profile["vertical"][j] / G),
                normalLoadG=float(profile["normalLoad"][j] / G),
                trackGradient=float(profile["grade"][j]),
                cornerId=int(corner_ids[j]),
                sectorId=sector,
                offset=float(offsets[j]),
            )
        )
    splits = np.interp(gate_distances[1:], distances, times)
    sectors = [
        dict(
            id=i + 1,
            time=float(t - (splits[i - 1] if i else 0)),
            split=float(t),
            startDistance=float(gate_distances[i]),
            endDistance=float(gate_distances[i + 1]),
            startProgress=float(gate_progress[i]),
            endProgress=float(gate_progress[i + 1]),
        )
        for i, t in enumerate(splits)
    ]
    warnings = [
        "Input accuracy is unverified. Approximate development physics; not validated against real telemetry."
    ]
    if not optimization["converged"]:
        warnings.append("Racing-line iteration limit reached; best feasible line retained.")
    if not profile["converged"]:
        warnings.append("Speed envelope iteration limit reached.")
    if profile["maxDemandRatio"] > 1.015:
        warnings.append("Integrated force demand exceeds numerical tolerance; refine track resolution.")
    if setup.solver == "lap-time":
        warnings.append(
            "Local lap-time search has a fixed candidate budget; no global optimum is established."
        )
    return dict(
        schemaVersion=1,
        trackId=track.id,
        vehicleId=vehicle.id,
        vehicle=vehicle.model_dump(mode="json"),
        setup=setup.model_dump(),
        model="Development Physics Model",
        verticalDynamics="quasi-steady-road-normal-v1",
        sectorBasis=sector_basis,
        solverProvenance=solver_provenance(),
        lapTime=lap_time,
        length=total_length,
        maxSpeed=float(max(profile["speed"])),
        averageSpeed=total_length / lap_time,
        elevationRange=float(np.ptp(points[:, 1])),
        samples=samples,
        sectors=sectors,
        corners=corners,
        optimization=optimization,
        sampling=sampling,
        alignment=alignment,
        numericalChecks=dict(
            speedConverged=profile["converged"],
            maxDemandRatio=profile["maxDemandRatio"],
            demandTolerance=1.015,
            minNormalLoadG=float(np.min(profile["normalLoad"]) / G),
        ),
        warnings=warnings,
        computationMs=round((time.perf_counter() - started) * 1000, 1),
    )
