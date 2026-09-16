"""Exercise the real editable landscape's source-protection boundaries in Blender."""

import hashlib
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import asset_config, owned_path  # noqa: E402
from validate_scene import validate_scene  # noqa: E402

_, config = asset_config("laptrix.blender-rbr-slice.v1")
source = owned_path(config["sourceFile"])
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()


def rejected(label, action, restore, expected):
    try:
        action()
        bpy.context.view_layer.update()
        try:
            validate_scene(config)
        except ValueError as error:
            assert expected in str(error), str(error)
            return
        raise AssertionError(f"Invalid editable landscape accepted: {label}")
    finally:
        restore()
        bpy.context.view_layer.update()


root = bpy.data.objects[config["rootNode"]]
for field, value, message in [
    ("regional_context_sha256", "stale", "regional context"),
    ("regional_source_credit", "{}", "source credits"),
]:
    original = root[field]
    rejected(
        field, lambda: root.__setitem__(field, value), lambda: root.__setitem__(field, original), message
    )

terrain = bpy.data.objects[config["landscape"]["node"]]
vertex = min(terrain.data.vertices, key=lambda v: v.co.length)
height = vertex.co.z
rejected(
    "moved protected ground",
    lambda: setattr(vertex.co, "z", height + 0.25),
    lambda: setattr(vertex.co, "z", height),
    "protected foreground",
)
material = bpy.data.materials[config["landscape"]["material"]]
mix = next(node for node in material.node_tree.nodes if node.bl_idname == "ShaderNodeMix")
rejected(
    "unsupported vertex-color blend",
    lambda: setattr(mix, "blend_type", "ADD"),
    lambda: setattr(mix, "blend_type", "MULTIPLY"),
    "full vertex-color multiply",
)
validate_scene(config)
assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
print(
    "Verified landscape rejection: stale context, missing credits, displaced ground and unsupported blending."
)
