"""Create the editable internal basis gauge. Explicit authoring command only."""

import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import read_json, to_blender  # noqa: E402
from source_io import save_editable  # noqa: E402

config = read_json("assets/blender/shared/basis-gauge.json")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
collection = bpy.data.collections.new(config["exportCollection"])
scene.collection.children.link(collection)
root = bpy.data.objects.new(config["rootNode"], None)
collection.objects.link(root)
root["laptrix_asset"] = config["id"]
root["laptrix_contract"] = 1
for name, centre, size, color in [
    ("X", (0.5, 0, 0), (1, 0.04, 0.04), (0.7, 0.04, 0.04, 1)),
    ("Y", (0, 1, 0), (0.04, 2, 0.04), (0.04, 0.7, 0.04, 1)),
    ("Z", (0, 0, 1.5), (0.04, 0.04, 3), (0.04, 0.04, 0.7, 1)),
]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender(centre))
    obj = bpy.context.object
    obj.name = f"BASIS_{name}_LOD0"
    for previous in list(obj.users_collection):
        previous.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    material = bpy.data.materials.new(f"LTX_Basis_{name}")
    material.use_nodes = True
    material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = color
    material.diffuse_color = color
    obj.data.materials.append(material)
for name, position in config["requiredNodes"].items():
    if name == config["rootNode"]:
        continue
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = root
    obj.location = to_blender(position)
save_editable(config)
print(f"Authored internal basis gauge: {config['sourceFile']}")
