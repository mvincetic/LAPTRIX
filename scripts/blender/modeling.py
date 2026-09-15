"""Original mesh authoring helpers. Coordinates are LAPTRIX metres throughout."""

import math

import bmesh
import bpy
from contract import to_blender
from mathutils import Vector


def material(name, color, roughness=0.4, metallic=0.0, emission=0.0, coat=0.0):
    result = bpy.data.materials.new(f"LTX_{name}")
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.16
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    result.diffuse_color = (*color, 1)
    return result


def attach(obj, collection, parent):
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = parent
    return obj


def mesh(name, vertices, faces, mat, collection, parent, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata([to_blender(v) for v in vertices], [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()
    for poly in data.polygons:
        poly.use_smooth = smooth
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    return obj


def bevel(obj, width=0.015, segments=3):
    modifier = obj.modifiers.new("Authored edge radii", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = 0.3
    modifier = obj.modifiers.new("Panel normals", "WEIGHTED_NORMAL")
    modifier.keep_sharp = True
    return obj


def box(name, center, size, mat, collection, parent, radius=0.01):
    vertices = [
        tuple(center[i] + signs[i] * size[i] / 2 for i in range(3))
        for signs in [
            (-1, -1, -1),
            (1, -1, -1),
            (1, 1, -1),
            (-1, 1, -1),
            (-1, -1, 1),
            (1, -1, 1),
            (1, 1, 1),
            (-1, 1, 1),
        ]
    ]
    obj = mesh(
        name,
        vertices,
        [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
        mat,
        collection,
        parent,
    )
    return bevel(obj, min(radius, min(size) * 0.45)) if radius else obj


def tube(name, points, radius, mat, collection, parent, sides=8):
    points = [Vector(p) for p in points]
    vertices = []
    for i, point in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]).normalized()
        guide = Vector((0, 1, 0)) if abs(tangent.y) < 0.9 else Vector((1, 0, 0))
        a = tangent.cross(guide).normalized()
        b = tangent.cross(a).normalized()
        for j in range(sides):
            angle = j * math.tau / sides
            vertices.append(point + radius * (a * math.cos(angle) + b * math.sin(angle)))
    faces = []
    for i in range(len(points) - 1):
        for j in range(sides):
            faces.append(
                (
                    i * sides + j,
                    i * sides + (j + 1) % sides,
                    (i + 1) * sides + (j + 1) % sides,
                    (i + 1) * sides + j,
                )
            )
    faces.extend(
        [tuple(range(sides - 1, -1, -1)), tuple((len(points) - 1) * sides + j for j in range(sides))]
    )
    return mesh(name, vertices, faces, mat, collection, parent, True)


def lathe_x(name, profile, mat, collection, parent, segments=48):
    vertices = [
        (x, radius * math.cos(j * math.tau / segments), radius * math.sin(j * math.tau / segments))
        for x, radius in profile
        for j in range(segments)
    ]
    faces = []
    for i in range(len(profile) - 1):
        for j in range(segments):
            faces.append(
                (
                    i * segments + j,
                    i * segments + (j + 1) % segments,
                    (i + 1) * segments + (j + 1) % segments,
                    (i + 1) * segments + j,
                )
            )
    return mesh(name, vertices, faces, mat, collection, parent, True)


def interpolate(stations, steps=5):
    """Centrally shaped longitudinal control cage, sampled with Catmull-Rom."""
    result = []
    for i in range(len(stations) - 1):
        a, b, c, d = [stations[max(0, min(len(stations) - 1, n))] for n in (i - 1, i, i + 1, i + 2)]
        for k in range(steps):
            t = k / steps
            result.append(
                tuple(
                    0.5
                    * (
                        (2 * b[j])
                        + (-a[j] + c[j]) * t
                        + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t**2
                        + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t**3
                    )
                    for j in range(len(b))
                )
            )
    return result + [stations[-1]]


def loft(name, rings, mat, collection, parent, smooth=True):
    count = len(rings[0])
    vertices = [v for ring in rings for v in ring]
    faces = [tuple(range(count - 1, -1, -1))]
    for i in range(len(rings) - 1):
        for j in range(count):
            faces.append(
                (
                    i * count + j,
                    i * count + (j + 1) % count,
                    (i + 1) * count + (j + 1) % count,
                    (i + 1) * count + j,
                )
            )
    faces.append(tuple((len(rings) - 1) * count + j for j in range(count)))
    return mesh(name, vertices, faces, mat, collection, parent, smooth)


def skin_point(rings, coordinate, z, axis=0, offset=0.006):
    """Intersect a loft skin with a longitudinal plane and transverse coordinate.

    axis=0 supplies X and finds the upper Y; axis=1 supplies Y and finds outer X.
    Fitted glazing/livery uses the actual authored cage, avoiding guessed heights.
    """
    a, b = next((a, b) for a, b in zip(rings, rings[1:]) if a[0][2] <= z <= b[0][2])
    t = (z - a[0][2]) / (b[0][2] - a[0][2])
    ring = [tuple(u + (v - u) * t for u, v in zip(p, q)) for p, q in zip(a, b)]
    intersections = []
    for p, q in zip(ring, ring[1:] + ring[:1]):
        if abs(p[axis] - q[axis]) < 1e-10:
            continue
        fraction = (coordinate - p[axis]) / (q[axis] - p[axis])
        if 0 <= fraction <= 1:
            intersections.append(p[1 - axis] + (q[1 - axis] - p[1 - axis]) * fraction)
    if not intersections:
        raise ValueError(f"Fitted surface misses the skin: {coordinate}, {z}, axis {axis}")
    height = max(intersections) + offset
    return (coordinate, height, z) if axis == 0 else (height, coordinate, z)


def consolidate(collection, protected=()):
    """Bake evaluated static islands into material/rig batches; meshes remain editable."""
    groups = {}
    for obj in list(collection.objects):
        if obj.type == "MESH" and obj.name not in protected:
            key = (obj.parent, obj.data.materials[0])
            groups.setdefault(key, []).append(obj)
    for (parent, mat), objects in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.convert(target="MESH")
        bpy.ops.object.join()
        joined = bpy.context.object
        joined.name = f"{parent.name}_{mat.name.removeprefix('LTX_')}_LOD0"
        # Boolean operands may leave unused empty slots. Every island in this
        # authoring batch deliberately has the same material.
        joined.data.materials.clear()
        joined.data.materials.append(mat)
        for polygon in joined.data.polygons:
            polygon.material_index = 0
        # Bake origins and orientation into vertex coordinates relative to the rig parent.
        transform = joined.matrix_basis.copy()
        joined.data.transform(transform)
        joined.matrix_basis.identity()
        joined.data.update()
