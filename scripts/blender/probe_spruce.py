"""Reject cutout changes that would export as wrong or invisible browser foliage."""

import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import asset_config  # noqa: E402
from validate_scene import validate_scene  # noqa: E402

_, config = asset_config("laptrix.blender-spruce.v1")
material = bpy.data.materials["LTX_Spruce_Needles"]
nodes = material.node_tree.nodes
threshold = next(n for n in nodes if n.bl_idname == "ShaderNodeMath")
shader = nodes.get("Principled BSDF")
image = next(n for n in nodes if n.bl_idname == "ShaderNodeTexImage")


def rejected(action, restore):
    try:
        action()
        try:
            validate_scene(config)
        except ValueError:
            return
        raise AssertionError("Invalid spruce source was accepted")
    finally:
        restore()


rejected(
    lambda: setattr(threshold, "operation", "LESS_THAN"),
    lambda: setattr(threshold, "operation", "GREATER_THAN"),
)
rejected(
    lambda: setattr(threshold.inputs[1], "default_value", 0.1),
    lambda: setattr(threshold.inputs[1], "default_value", 0.45),
)
rejected(
    lambda: material.node_tree.links.new(image.outputs["Alpha"], shader.inputs["Alpha"]),
    lambda: material.node_tree.links.new(threshold.outputs[0], shader.inputs["Alpha"]),
)
rejected(
    lambda: setattr(image.image.colorspace_settings, "name", "Non-Color"),
    lambda: setattr(image.image.colorspace_settings, "name", "sRGB"),
)
crown = bpy.data.objects["SPRUCE_CROWN_LOD0"]
original = crown.data
without_uv = original.copy()
without_uv.uv_layers.remove(without_uv.uv_layers.active)
rejected(lambda: setattr(crown, "data", without_uv), lambda: setattr(crown, "data", original))
bpy.data.meshes.remove(without_uv)
report, _ = validate_scene(config)
assert report["triangles"] == 624
print("Verified five spruce rejection probes: operator, cutoff, bypass, color space and missing UVs.")
