from collections import Counter

import numpy as np
import pytest

from scripts.blender.contract import read_json
from scripts.blender.regional_geometry import (
    RegionalHeightfield,
    landscape_geometry,
    source_distances,
    validate_foreground,
)


def test_regional_sampling_interpolates_pixel_centres_and_includes_all_four_edges():
    field = RegionalHeightfield({"size": 2, "boundsXZ": [10, -20, 30, 0], "heights": [[1, 5], [9, 13]]})
    assert field.sample([[10, -20], [30, -20], [10, 0], [30, 0], [20, -10]]).tolist() == [1, 5, 9, 13, 7]
    with pytest.raises(ValueError, match="outside"):
        field.sample([[30.1, -10]])
    with pytest.raises(ValueError, match="outside"):
        field.sample([[float("nan"), -10]])
    with pytest.raises(ValueError, match="heightfield"):
        RegionalHeightfield({"size": 2, "boundsXZ": [0, 0, 0, 10], "heights": [[1, 2], [3, 4]]})


@pytest.fixture(scope="module")
def terrain():
    context = read_json("assets/blender/tracks/red-bull-ring-context.json")
    regional = read_json("assets/blender/tracks/red-bull-ring-regional.json")
    settings = {
        "protectedDistance": 270,
        "preserveVerticesWithin": 320,
        "blendToSurveyAt": 700,
        "outerRings": 14,
    }
    vertices, faces, colors = landscape_geometry(context, regional, settings)
    return context, regional, settings, vertices, faces, colors


def test_regional_mesh_preserves_complete_foreground_triangles_and_does_not_mutate_inputs(terrain):
    context, _, settings, vertices, faces, colors = terrain
    native = np.array(context["terrain"]["positions"]).reshape(-1, 3)
    original_faces = np.array(context["terrain"]["indices"]).reshape(-1, 3)
    distances = source_distances(native, context["points"])
    protected = distances <= settings["preserveVerticesWithin"]
    assert np.array_equal(vertices[: len(native)][protected], native[protected])
    assert np.array_equal(faces[: len(original_faces)], original_faces)
    assert np.array_equal(vertices[: len(native), [0, 2]], native[:, [0, 2]])
    assert context == read_json("assets/blender/tracks/red-bull-ring-context.json")
    # Distance to a set is 1-Lipschitz. Even the furthest modified vertex minus
    # the entire triangle diameter must leave 270 m around every source segment.
    changed = np.any(vertices[: len(native)] != native, axis=1)
    changed_faces = original_faces[np.any(changed[original_faces], axis=1)]
    points = native[changed_faces][:, :, [0, 2]]
    diameter = np.max(np.linalg.norm(points - np.roll(points, -1, axis=1), axis=2), axis=1)
    clearance = distances[changed_faces].max(axis=1) - diameter
    assert clearance.min() > settings["protectedDistance"]
    assert protected.sum() > 2000
    assert colors.shape == vertices.shape and np.isfinite(colors).all()
    assert np.all((colors >= 0) & (colors <= 1))


def test_regional_surface_is_one_connected_disk_with_only_the_outer_perimeter_open(terrain):
    _, regional, _, vertices, faces, _ = terrain
    edges = Counter(tuple(sorted((int(face[i]), int(face[(i + 1) % 3])))) for face in faces for i in range(3))
    assert set(edges.values()) == {1, 2}
    assert len(vertices) - len(edges) + len(faces) == 1
    boundary = [edge for edge, count in edges.items() if count == 1]
    assert len(boundary) == 380
    xmin, zmin, xmax, zmax = regional["boundsXZ"]
    field = RegionalHeightfield(regional)
    for a, b in boundary:
        points = vertices[[a, b]][:, [0, 2]]
        assert any(
            np.allclose(points[:, axis], limit)
            for axis, limit in [(0, xmin), (0, xmax), (1, zmin), (1, zmax)]
        )
        assert np.allclose(vertices[[a, b], 1], field.sample(points), atol=1e-9)
    edge_a = vertices[faces[:, 1]] - vertices[faces[:, 0]]
    edge_b = vertices[faces[:, 2]] - vertices[faces[:, 0]]
    assert np.all(np.cross(edge_a, edge_b)[:, 1] > 0), "No folded or downward terrain faces"


def test_unsafe_foreground_radius_or_missing_regional_coverage_is_rejected(terrain):
    context, regional, settings, *_ = terrain
    with pytest.raises(ValueError, match="protected foreground"):
        landscape_geometry(context, regional, {**settings, "preserveVerticesWithin": 300})
    with pytest.raises(ValueError, match="outside|surround"):
        landscape_geometry(context, {**regional, "boundsXZ": [-100, -100, 100, 100]}, settings)


def test_editable_landscape_cannot_move_remove_or_cover_protected_ground(terrain):
    context, _, settings, vertices, faces, _ = terrain
    assert validate_foreground(vertices, faces, context, settings) > 3500
    index = np.argmin(source_distances(vertices, context["points"]))
    moved = vertices.copy()
    moved[index, 1] += 0.25
    with pytest.raises(ValueError, match="protected foreground"):
        validate_foreground(moved, faces, context, settings)
    with pytest.raises(ValueError, match="protected foreground"):
        validate_foreground(vertices, faces[~np.any(faces == index, axis=1)], context, settings)
    # An overlay can preserve every old face yet bury the road; reject it too.
    center = vertices[index]
    overlay = center + [[-10, 5, -10], [10, 5, -10], [0, 5, 10]]
    with pytest.raises(ValueError, match="overlaps the protected foreground"):
        validate_foreground(
            np.vstack([vertices, overlay]),
            np.vstack([faces, [len(vertices), len(vertices) + 2, len(vertices) + 1]]),
            context,
            settings,
        )


def test_editable_landscape_rejects_downward_and_duplicate_ground_faces(terrain):
    context, _, settings, vertices, faces, _ = terrain
    reversed_face = faces.copy()
    reversed_face[0] = reversed_face[0, ::-1]
    with pytest.raises(ValueError, match="downward face"):
        validate_foreground(vertices, reversed_face, context, settings)
    with pytest.raises(ValueError, match="duplicate ground"):
        validate_foreground(vertices, np.vstack([faces, faces[0]]), context, settings)
    with pytest.raises(ValueError, match="Invalid landscape geometry"):
        validate_foreground(vertices, faces.astype(float) + 0.1, context, settings)
