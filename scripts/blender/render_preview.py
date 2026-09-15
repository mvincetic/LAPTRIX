"""Render diagnostic studio views without saving changes to the editable source.

These support modeling review. Actual browser/compositor views remain acceptance.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import asset_config, owned_path, to_blender  # noqa: E402
from validate_scene import validate_scene  # noqa: E402

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--asset", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
entry, config = asset_config(args.asset)
source = owned_path(config["sourceFile"])
before = hashlib.sha256(source.read_bytes()).hexdigest()
report, objects = validate_scene(config)
destination = owned_path(args.output)
destination.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 8
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.65, 0.70, 0.77, 1)
background.inputs["Strength"].default_value = 0.4
for obj in objects:
    if obj.name == "SHADOW_CASTERS_LOD0":
        obj.hide_render = True

# This stage exists only in memory; no camera, lights or floor enter the GLB.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.001))
floor = bpy.context.object
floor.name = "PREVIEW_GROUND"
mat = bpy.data.materials.new("PREVIEW_GROUND")
mat.use_nodes = True
shader = mat.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value = (0.31, 0.36, 0.42, 1)
shader.inputs["Roughness"].default_value = 0.8
floor.data.materials.append(mat)
target = Vector(to_blender((0, 0.48, 0)))
for name, position, energy, size in (
    ("Key", (-3, 7, 4), 1100, 5),
    ("Fill", (5, 5, -2), 850, 4),
    ("Rim", (0, 4, -6), 1300, 3),
):
    data = bpy.data.lights.new("PREVIEW_" + name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(light)
    light.location = to_blender(position)
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
camera_data = bpy.data.cameras.new("PREVIEW_CAMERA")
camera = bpy.data.objects.new("PREVIEW_CAMERA", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = 52
camera_data.clip_start = 0.05
files = []
for name, position in (
    ("front", (4.8, 3.3, 6.2)),
    ("rear", (-4.8, 3, -6.2)),
    ("side", (9.4, 2.05, 0)),
):
    camera.location = to_blender(position)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    output = destination / f"{name}.png"
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    files.append({"file": output.name, "cameraRuntimeMetres": position})
if hashlib.sha256(source.read_bytes()).hexdigest() != before:
    raise ValueError("Preview rendering changed the editable source")
(destination / "preview.json").write_text(
    json.dumps({"sourceSha256": before, "validation": report, "views": files}, indent=2) + "\n",
    encoding="utf-8",
)
print("Rendered diagnostic views; source is unchanged. Browser QA remains required.")
