"""Validate editable Blender source before exporting its selected asset tree."""

import math
from pathlib import Path

import bpy
from contract import owned_path, read_json, to_runtime
from mathutils import Matrix


def close_vector(actual, expected, tolerance, label):
    if any(abs(a - b) > tolerance for a, b in zip(actual, expected, strict=True)):
        raise ValueError(f"{label}: {tuple(actual)} differs from {expected}")


def validate_scene(config):
    version = tuple(int(v) for v in read_json("assets/blender/toolchain.json")["version"].split("."))
    if bpy.app.version != version:
        raise ValueError(f"Blender version must be {version}, found {bpy.app.version}")
    if not bpy.data.filepath or Path(bpy.data.filepath).resolve() != owned_path(config["sourceFile"]):
        raise ValueError("Open the manifest's editable .blend source before exporting")
    scene = bpy.context.scene
    if scene.unit_settings.system != "METRIC" or scene.unit_settings.scale_length != 1:
        raise ValueError("Scene must use metres at scale one")
    if bpy.data.libraries:
        raise ValueError("Pack original asset data; linked Blender libraries are not runtime inputs")
    collection = bpy.data.collections.get(config["exportCollection"])
    if not collection:
        raise ValueError("Missing export collection")
    objects = list(collection.all_objects)
    root = bpy.data.objects.get(config["rootNode"])
    if root not in objects or root.type != "EMPTY" or root.parent:
        raise ValueError("The asset needs one unparented empty root")
    identity = Matrix.Identity(4)
    if any(abs(root.matrix_world[r][c] - identity[r][c]) > 1e-7 for r in range(4) for c in range(4)):
        raise ValueError("Asset root must retain the world/contact origin and identity transform")
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    materials = set()
    minimum, maximum = [math.inf] * 3, [-math.inf] * 3
    nodes = {}
    triangles = 0
    meshes = 0
    for obj in objects:
        if obj.type not in {"EMPTY", "MESH"} or obj.hide_render:
            raise ValueError(f"{obj.name}: export only visible mesh/empty nodes")
        if obj != root and obj.parent not in objects:
            raise ValueError(f"{obj.name}: every export node must belong to the root hierarchy")
        if obj.constraints or obj.animation_data:
            raise ValueError(f"{obj.name}: bake static authoring constraints; telemetry owns motion")
        close_vector(obj.scale, (1, 1, 1), 1e-7, f"{obj.name} scale")
        nodes[obj.name] = list(to_runtime(obj.matrix_world.translation))
        if obj.type != "MESH":
            continue
        meshes += 1
        if not obj.data.materials or any(material is None for material in obj.data.materials):
            raise ValueError(f"{obj.name}: assign all material slots")
        materials.update(obj.data.materials)
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            triangles += len(mesh.loop_triangles)
            if not mesh.vertices or not mesh.loop_triangles:
                raise ValueError(f"{obj.name}: empty evaluated geometry")
            for vertex in mesh.vertices:
                point = to_runtime(obj.matrix_world @ vertex.co)
                for axis in range(3):
                    minimum[axis] = min(minimum[axis], point[axis])
                    maximum[axis] = max(maximum[axis], point[axis])
            if any(face.area < 1e-12 for face in mesh.loop_triangles):
                raise ValueError(f"{obj.name}: degenerate evaluated triangle")
        finally:
            evaluated.to_mesh_clear()
    if meshes > config["maxMeshes"] or triangles > config["maxTriangles"]:
        raise ValueError("Evaluated geometry exceeds the declared mesh/triangle budget")
    if len(materials) > config["maxMaterials"]:
        raise ValueError("Material budget exceeded")
    images = set()
    allowed_nodes = {
        "ShaderNodeOutputMaterial",
        "ShaderNodeBsdfPrincipled",
        "ShaderNodeTexImage",
        "ShaderNodeNormalMap",
        "ShaderNodeUVMap",
        "ShaderNodeSeparateColor",
        "ShaderNodeRGB",
    }
    for material in materials:
        if not material.use_nodes or material.animation_data:
            raise ValueError(f"{material.name}: use static web-compatible Principled materials")
        shader_count = 0
        for node in material.node_tree.nodes:
            if node.bl_idname not in allowed_nodes:
                raise ValueError(f"{material.name}: bake or translate unsupported node {node.bl_idname}")
            shader_count += node.bl_idname == "ShaderNodeBsdfPrincipled"
            if node.bl_idname == "ShaderNodeTexImage":
                if not node.image:
                    raise ValueError(f"{material.name}: missing image")
                images.add(node.image)
        if shader_count != 1:
            raise ValueError(f"{material.name}: expected one Principled shader")
    if len(images) > config["maxTextures"]:
        raise ValueError("Texture count budget exceeded")
    for image in images:
        if image.file_format != "PNG":
            raise ValueError(f"{image.name}: bake/retain PNG source images for the web asset")
        if min(image.size) <= 0 or max(image.size) > config["maxTextureSize"]:
            raise ValueError(f"{image.name}: invalid or oversized texture")
        if not image.packed_file:
            raise ValueError(f"{image.name}: pack the source image into the editable .blend")
    tolerance = config["bounds"]["tolerance"]
    for name, expected in config["requiredNodes"].items():
        if name not in nodes:
            raise ValueError(f"Missing required node: {name}")
        close_vector(nodes[name], expected, tolerance, f"{name} pivot")
    close_vector(minimum, config["bounds"]["min"], tolerance, "Minimum bounds")
    close_vector(maximum, config["bounds"]["max"], tolerance, "Maximum bounds")
    return {
        "asset": config["id"],
        "blender": bpy.app.version_string,
        "meshes": meshes,
        "triangles": triangles,
        "materials": len(materials),
        "images": [
            {"name": image.name, "size": list(image.size)} for image in sorted(images, key=lambda i: i.name)
        ],
        "bounds": {"min": minimum, "max": maximum},
        "nodes": nodes,
    }, objects
