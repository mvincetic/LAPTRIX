"""Original continuous landscape cage, with a conservative unchanged foreground.

Pure authoring math: no Blender, network, solver writes or runtime clock. Heights
outside the protected corridor are an explicitly blended visual reconstruction.
"""

import math

import numpy as np


def source_distances(positions, source_points):
    source = np.array([[p["x"], p["z"]] for p in source_points], dtype=np.float64)
    segment = np.roll(source, -1, axis=0) - source
    length2 = np.sum(segment * segment, axis=1)
    if not np.isfinite(source).all() or np.any(length2 <= 0):
        raise ValueError("Regional ground needs finite, nondegenerate source segments")
    result = np.empty(len(positions), dtype=np.float64)
    for start in range(0, len(positions), 256):
        chunk = positions[start : start + 256]
        offset = chunk[:, None, [0, 2]] - source[None, :, :]
        t = np.clip(np.sum(offset * segment, axis=2) / length2, 0, 1)
        result[start : start + len(chunk)] = np.sqrt(
            np.min(np.sum((offset - t[:, :, None] * segment) ** 2, axis=2), axis=1)
        )
    return result


class RegionalHeightfield:
    def __init__(self, data):
        self.bounds = np.asarray(data["boundsXZ"], dtype=np.float64)
        self.heights = np.asarray(data["heights"], dtype=np.float64)
        size = data["size"]
        if (
            not isinstance(size, int)
            or not 2 <= size <= 128
            or self.heights.shape != (size, size)
            or self.bounds.shape != (4,)
            or not np.isfinite(self.bounds).all()
            or not np.isfinite(self.heights).all()
            or np.any(self.bounds[2:] <= self.bounds[:2])
        ):
            raise ValueError("Invalid prepared regional heightfield")
        self.size = size

    def sample(self, xz):
        points = np.asarray(xz, dtype=np.float64)
        if (
            points.ndim != 2
            or points.shape[1] != 2
            or not np.isfinite(points).all()
            or np.any(points < self.bounds[:2] - 0.001)
            or np.any(points > self.bounds[2:] + 0.001)
        ):
            raise ValueError("Landscape sample lies outside the prepared source")
        uv = (points - self.bounds[:2]) / (self.bounds[2:] - self.bounds[:2]) * (self.size - 1)
        uv = np.clip(uv, 0, self.size - 1)
        cell = np.minimum(np.floor(uv).astype(int), self.size - 2)
        blend = uv - cell
        c, r, u, v = cell[:, 0], cell[:, 1], blend[:, 0], blend[:, 1]
        h = self.heights
        return (h[r, c] * (1 - u) + h[r, c + 1] * u) * (1 - v) + (
            h[r + 1, c] * (1 - u) + h[r + 1, c + 1] * u
        ) * v


def landscape_colors(points, distances):
    """Original vertex-painted meadow/forest palette; not measured land cover."""
    x, y, z = points.T
    patch = 0.5 + 0.22 * np.sin(x * 0.004 + np.sin(z * 0.003)) + 0.12 * np.cos(z * 0.007 - x * 0.002)
    forest = np.clip((y - 85) / 140, 0, 1) * np.clip((distances - 300) / 250, 0, 1)
    variation = np.clip((distances - 18) / 140, 0, 1)
    tone = 1 - ((np.sin(x / 73) * np.cos(z / 89) + 1) * 0.1) * 0.35
    tone -= np.minimum(1, distances / 280) * 0.04
    meadow = tone * (1 - variation + (0.80 + patch * 0.22) * variation)
    colors = meadow[:, None] * (1 - forest[:, None]) + np.array([0.58, 0.82, 0.85]) * forest[:, None]
    return np.clip(colors, 0, 1)


def landscape_geometry(context, regional, settings):
    field = RegionalHeightfield(regional)
    native = np.array(context["terrain"]["positions"], dtype=np.float64).reshape(-1, 3)
    faces = np.array(context["terrain"]["indices"], dtype=np.int32).reshape(-1, 3)
    xs, zs = np.unique(native[:, 0]), np.unique(native[:, 2])
    columns, rows = len(xs) - 1, len(zs) - 1
    if columns < 1 or rows < 1 or len(native) != len(xs) * len(zs):
        raise ValueError("Expected the existing rectangular terrain grid")
    if not np.array_equal(native[:, 0].reshape(len(zs), len(xs)), np.tile(xs, (len(zs), 1))):
        raise ValueError("Unexpected terrain column order")
    if not np.array_equal(native[:, 2].reshape(len(zs), len(xs)), np.tile(zs[:, None], (1, len(xs)))):
        raise ValueError("Unexpected terrain row order")
    protected = settings["protectedDistance"]
    preserve = settings["preserveVerticesWithin"]
    blend_end = settings["blendToSurveyAt"]
    rings = settings["outerRings"]
    max_edge = math.hypot(np.max(np.diff(xs)), np.max(np.diff(zs)))
    if not 0 <= protected < preserve < blend_end or preserve - max_edge <= protected:
        raise ValueError("The full changed triangle must stay outside the protected foreground")
    if not isinstance(rings, int) or not 1 <= rings <= 32:
        raise ValueError("Bound the regional transition rings")
    distances = source_distances(native, context["points"])
    vertices = native.copy()
    blend = np.clip((distances - preserve) / (blend_end - preserve), 0, 1)
    blend = blend * blend * (3 - 2 * blend)
    vertices[:, 1] = native[:, 1] * (1 - blend) + field.sample(native[:, [0, 2]]) * blend

    boundary = list(range(columns + 1))
    boundary.extend(row * (columns + 1) + columns for row in range(1, rows + 1))
    boundary.extend(rows * (columns + 1) + col for col in range(columns - 1, -1, -1))
    boundary.extend(row * (columns + 1) for row in range(rows - 1, 0, -1))
    if np.any(distances[boundary] < blend_end):
        raise ValueError("The foreground grid must meet the survey before its outer boundary")
    perimeter = native[boundary][:, [0, 2]]
    uv = (perimeter - [xs[0], zs[0]]) / [xs[-1] - xs[0], zs[-1] - zs[0]]
    outer = field.bounds[:2] + uv * (field.bounds[2:] - field.bounds[:2])
    if np.any(field.bounds[:2] >= [xs[0], zs[0]]) or np.any(field.bounds[2:] <= [xs[-1], zs[-1]]):
        raise ValueError("The regional source must surround the complete foreground grid")
    blocks, face_blocks = [vertices], [faces]
    previous = np.asarray(boundary)
    for step in range(1, rings + 1):
        t = step / rings
        xz = perimeter * (1 - t) + outer * t
        block = np.column_stack([xz[:, 0], field.sample(xz), xz[:, 1]])
        current = np.arange(len(native) + (step - 1) * len(boundary), len(native) + step * len(boundary))
        following = np.roll(np.arange(len(boundary)), -1)
        quads = np.column_stack([previous, current, previous[following], current[following]])
        face_blocks.append(quads[:, [0, 2, 1, 2, 3, 1]].reshape(-1, 3))
        blocks.append(block)
        previous = current
    vertices, faces = np.vstack(blocks), np.vstack(face_blocks)
    colors = landscape_colors(vertices, source_distances(vertices, context["points"]))
    return vertices, faces, colors


def validate_foreground(vertices, faces, context, settings):
    """Reject holes, moved ground or new triangles inside the protected corridor.

    Exact retained faces cover the corridor. Every other face must prove its
    complete extent lies outside it using the distance field's Lipschitz bound.
    Artists may edit the distant cage; they cannot cover or move the foreground.
    """
    native = np.asarray(context["terrain"]["positions"]).reshape(-1, 3)
    original_faces = np.asarray(context["terrain"]["indices"]).reshape(-1, 3)
    vertices, faces = np.asarray(vertices), np.asarray(faces)
    if (
        vertices.ndim != 2
        or vertices.shape[1] != 3
        or faces.ndim != 2
        or faces.shape[1] != 3
        or not np.issubdtype(faces.dtype, np.integer)
        or not np.isfinite(vertices).all()
        or np.any(faces < 0)
        or np.any(faces >= len(vertices))
    ):
        raise ValueError("Invalid landscape geometry")
    edge_a = vertices[faces[:, 1]] - vertices[faces[:, 0]]
    edge_b = vertices[faces[:, 2]] - vertices[faces[:, 0]]
    if np.any(np.cross(edge_a, edge_b)[:, 1] <= 0):
        raise ValueError("Landscape contains a folded or downward face")

    def face_keys(points, indices):
        # Float32 GLB/Blender positions retain better than 0.1 mm locally.
        keys = [tuple(np.round(p, 4)) for p in points]
        return [tuple(sorted(keys[i] for i in face)) for face in indices]

    original_keys = face_keys(native, original_faces)
    exported_keys = face_keys(vertices, faces)
    exported_set, original_set = set(exported_keys), set(original_keys)
    if len(exported_keys) != len(exported_set):
        raise ValueError("Landscape contains duplicate ground faces")
    native_distances = source_distances(native, context["points"])
    protected_faces = native_distances[original_faces].max(axis=1) <= settings["preserveVerticesWithin"]
    if any(key not in exported_set for key, protected in zip(original_keys, protected_faces) if protected):
        raise ValueError("Landscape changes or removes protected foreground faces")
    distances = source_distances(vertices, context["points"])
    corners = vertices[faces][:, :, [0, 2]]
    diameter = np.linalg.norm(corners - np.roll(corners, -1, axis=1), axis=2).max(axis=1)
    clearance = distances[faces].max(axis=1) - diameter
    for key, lower_bound in zip(exported_keys, clearance):
        if key not in original_set and lower_bound <= settings["protectedDistance"]:
            raise ValueError("New landscape face overlaps the protected foreground")
    return int(protected_faces.sum())
