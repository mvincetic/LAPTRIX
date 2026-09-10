"""Controlled periodic resampling. Source geometry remains immutable and identifiable."""

import hashlib

import numpy as np
from scipy.interpolate import CubicSpline

from .models import Track


def track_fingerprint(track: Track):
    values = [len(track.points), len(track.sectorFractions), *track.sectorFractions]
    for p in track.points:
        values.extend((p.x, p.y, p.z, p.widthLeft, p.widthRight, p.banking))
    # JSON.stringify erases negative zero. Canonicalize only exact zero, preserving
    # every other little-endian double and the existing positive-zero identities.
    encoded = np.asarray(values, dtype="<f8")
    encoded[encoded == 0] = 0.0
    payload = b"laptrix.track.v1\0" + encoded.tobytes()
    return "sha256:" + hashlib.sha256(payload).hexdigest()


def prepare_track(source: Track, mode: str):
    center = np.array([[p.x, p.y, p.z] for p in source.points])
    ds = np.linalg.norm(np.roll(center, -1, axis=0) - center, axis=1)
    distance = np.r_[0, np.cumsum(ds)]
    n = len(center)
    target_spacing = {"source": None, "5m": 5.0, "3m": 3.0}.get(mode)
    if mode not in ("source", "5m", "3m"):
        raise ValueError("Unknown spatial sampling mode")
    track, progress, capped, deviation = source, distance / distance[-1], False, 0.0
    if target_spacing is not None:
        spline = CubicSpline(distance, np.vstack([center, center[0]]), bc_type="periodic")
        # Resolve each source interval for arc-length inversion and an interpolation-deviation guard.
        divisions = np.maximum(8, np.ceil(ds / 0.5).astype(int))
        parameter = np.r_[
            np.concatenate(
                [np.linspace(distance[i], distance[i + 1], divisions[i], endpoint=False) for i in range(n)]
            ),
            distance[-1],
        ]
        dense = spline(parameter)
        linear = np.column_stack(
            [np.interp(parameter, distance, np.r_[center[:, k], center[0, k]]) for k in range(3)]
        )
        deviation = float(np.max(np.linalg.norm(dense - linear, axis=1)))
        if deviation > 0.5:
            raise ValueError(
                f"Resampling would move source geometry by {deviation:.2f} m (limit 0.50 m). "
                "Use original samples or provide a denser source track."
            )
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(dense, axis=0), axis=1))]
        count = max(40, min(2000, int(np.ceil(arc[-1] / target_spacing))))
        capped = bool(arc[-1] / target_spacing > 2000)
        parameters = np.interp(np.arange(count) / count * arc[-1], arc, parameter)
        points = spline(parameters)
        # A narrow source-width feature must not disappear between the new nodes.
        # Each node takes the minimum width throughout its two adjacent source intervals.
        repeated_s = np.r_[distance[:-1] - distance[-1], distance[:-1], distance[:-1] + distance[-1]]
        previous = np.r_[parameters[-1] - distance[-1], parameters[:-1]]
        following = np.r_[parameters[1:], distance[-1]]
        widths = []
        for key in ("widthLeft", "widthRight"):
            values = np.array([getattr(p, key) for p in source.points])
            repeated_w = np.tile(values, 3)
            sampled = []
            for a, b in zip(previous, following):
                inside = repeated_w[
                    np.searchsorted(repeated_s, a) : np.searchsorted(repeated_s, b, side="right")
                ]
                edges = np.interp([a, b], repeated_s, repeated_w)
                sampled.append(float(min(np.min(edges), np.min(inside) if len(inside) else np.inf)))
            widths.append(sampled)
        data = source.model_dump()
        data["points"] = [
            dict(x=x, y=y, z=z, widthLeft=widths[0][i], widthRight=widths[1][i])
            for i, (x, y, z) in enumerate(points)
        ]
        try:
            track = Track.model_validate(data)
        except ValueError as exc:
            raise ValueError(
                "Resampled geometry fails track checks. Use original samples or improve the source."
            ) from exc
        progress = np.r_[parameters / distance[-1], 1.0]
        ds = np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1)
    sampling = dict(
        mode=mode,
        sourcePointCount=n,
        pointCount=len(track.points),
        targetSpacing=target_spacing,
        meanSpacing=float(np.mean(ds)),
        maxSpacing=float(np.max(ds)),
        capped=capped,
        maxSourceDeviation=deviation,
        points=[p.model_dump() for p in track.points],
    )
    alignment = dict(trackFingerprint=track_fingerprint(source), progress=progress.tolist())
    return track, sampling, alignment
