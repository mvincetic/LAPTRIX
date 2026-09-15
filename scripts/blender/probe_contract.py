"""Exercise source-validation failure boundaries inside the pinned Blender runtime."""

import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import asset_config  # noqa: E402
from validate_scene import validate_scene  # noqa: E402

_, config = asset_config("laptrix.blender-basis.v1")


def rejected(action, restore):
    try:
        action()
        bpy.context.view_layer.update()
        try:
            validate_scene(config)
        except ValueError:
            return
        raise AssertionError("Invalid editable source was accepted")
    finally:
        restore()
        bpy.context.view_layer.update()


root = bpy.data.objects[config["rootNode"]]
rejected(lambda: setattr(root.location, "x", 1), lambda: setattr(root.location, "x", 0))
pivot = bpy.data.objects["Z_FORWARD"]
original = pivot.location.copy()
rejected(lambda: setattr(pivot.location, "y", -4), lambda: setattr(pivot, "location", original))
units = bpy.context.scene.unit_settings
rejected(lambda: setattr(units, "scale_length", 0.01), lambda: setattr(units, "scale_length", 1))
material = bpy.data.materials["LTX_Basis_X"]
noise = material.node_tree.nodes.new("ShaderNodeTexNoise")
rejected(lambda: None, lambda: material.node_tree.nodes.remove(noise))
report, _ = validate_scene(config)
assert report["triangles"] == 36
print("Verified Blender rejection of displaced roots/pivots, unit drift and unbaked procedural shaders.")
