"""Author original curved spruce clusters in metres; placement remains source-derived."""

import hashlib
import math
import random
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/blender"))
from contract import owned_path, read_json  # noqa: E402
from modeling import material, mesh  # noqa: E402
from source_io import save_editable  # noqa: E402

config = read_json("assets/blender/shared/spruce.json")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
collection = bpy.data.collections.new("EXPORT")
scene.collection.children.link(collection)
root = bpy.data.objects.new("SPRUCE_ROOT", None)
collection.objects.link(root)
root["design"] = "Original LAPTRIX spruce: curved asymmetric bough clusters, upright leader and tapered trunk"
root["source_texture"] = "assets/environment/spruce-bough.webp"
root["source_texture_sha256"] = hashlib.sha256((ROOT / root["source_texture"]).read_bytes()).hexdigest()

foliage = material("Spruce_Needles", (1, 1, 1), 1)
foliage.use_backface_culling = False
foliage.surface_render_method = "DITHERED"
nodes = foliage.node_tree.nodes
shader = nodes.get("Principled BSDF")
image = bpy.data.images.load(str(owned_path(config["cutoutMaterials"]["LTX_Spruce_Needles"]["textureFile"])))
image.pack()
image.filepath = "/" * 1023
image.filepath = "//spruce-bough.png"
for packed in image.packed_files:
    packed.filepath = "/" * 1023
    packed.filepath = "//spruce-bough.png"
texture = nodes.new("ShaderNodeTexImage")
texture.image = image
texture.interpolation = "Linear"
cutoff = nodes.new("ShaderNodeMath")
cutoff.operation = "GREATER_THAN"
cutoff.inputs[1].default_value = 0.45
foliage.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
foliage.node_tree.links.new(texture.outputs["Alpha"], cutoff.inputs[0])
foliage.node_tree.links.new(cutoff.outputs[0], shader.inputs["Alpha"])
bark = material("Spruce_Bark", (0.19, 0.14, 0.095), 1)
bark.use_backface_culling = True

rng = random.Random(2411)
vertices, faces, uvs = [], [], []
# Deliberately uneven crown masses; each shoot curves, droops and rolls in 3D.
whorls = [
    (0.07, 1.0, 8),
    (0.19, 0.98, 8),
    (0.30, 0.90, 9),
    (0.43, 0.81, 9),
    (0.56, 0.70, 8),
    (0.69, 0.57, 8),
    (0.81, 0.41, 7),
    (0.91, 0.25, 6),
    (0.99, 0.085, 4),
]
for tier, (height, radius, count) in enumerate(whorls):
    for branch in range(count):
        phase = branch * math.tau / count + tier * 2.19 + rng.uniform(-0.21, 0.21)
        run = radius * rng.uniform(0.83, 1.06)
        level = height + rng.uniform(-0.036, 0.036)
        roll = rng.uniform(-0.45, 0.45)
        sweep = rng.uniform(-0.12, 0.12)
        dx, dz = math.cos(phase), math.sin(phase)
        for layer in (-0.65, 0.65):
            start = len(vertices)
            for u in (0, 0.52, 1):
                reach = run * u
                across = run * sweep * u * u
                y = level + radius * (0.035 * math.sin(math.pi * u) - 0.16 * u**1.7)
                tilt = roll + layer + 0.20 * u
                half_width = run * (0.53 - 0.10 * u)
                for v in (0, 1):
                    span = (2 * v - 1) * half_width
                    vertices.append(
                        (
                            dx * reach - dz * (across + span * math.cos(tilt)),
                            y + span * math.sin(tilt) * 0.42,
                            dz * reach + dx * (across + span * math.cos(tilt)),
                        )
                    )
                    uvs.append((u, v))
            for row in range(2):
                a = start + 2 * row
                faces.append((a, a + 2, a + 3, a + 1))

# Canonical envelope: 9 m crown height above a 1.5 m clear base, 3.78 m radius.
low, high = min(v[1] for v in vertices), max(v[1] for v in vertices)
radius = max(math.hypot(v[0], v[2]) for v in vertices)
vertices = [
    (x / radius * 3.78, 1.5 + (y - low) / (high - low) * 9, z / radius * 3.78) for x, y, z in vertices
]
# Upright terminal shoot fills the exposed leader without an opaque inner cone.
for angle in (0, math.pi / 2):
    start = len(vertices)
    for u in (0, 0.5, 1):
        y = 8.65 + 1.85 * u
        t = y / 10.3
        for v in (0, 1):
            span = (2 * v - 1) * (0.28 - 0.16 * u)
            vertices.append(
                (0.13 * t**1.4 + span * math.cos(angle), y, -0.075 * t**1.8 + span * math.sin(angle))
            )
            uvs.append((u, v))
    for row in range(2):
        a = start + row * 2
        faces.append((a, a + 2, a + 3, a + 1))
crown = mesh("SPRUCE_CROWN_LOD0", vertices, faces, foliage, collection, root, True)
uv_layer = crown.data.uv_layers.new(name="Bough UV")
for loop in crown.data.loops:
    uv_layer.data[loop.index].uv = uvs[loop.vertex_index]

profile = [(-0.15, 0.28), (1.2, 0.23), (3.8, 0.17), (6.5, 0.11), (8.7, 0.063), (10.3, 0.012)]
vertices, faces = [], []
for y, radius in profile:
    t = max(0, y) / 10.3
    cx, cz = 0.13 * t**1.4, -0.075 * t**1.8
    for i in range(7):
        angle = i * math.tau / 7
        vertices.append((cx + radius * math.cos(angle), y, cz + radius * math.sin(angle)))
for row in range(len(profile) - 1):
    for i in range(7):
        a, b = row * 7 + i, row * 7 + (i + 1) % 7
        faces.append((a, b, b + 7, a + 7))
faces += [tuple(range(6, -1, -1)), tuple((len(profile) - 1) * 7 + i for i in range(7))]
trunk = mesh("SPRUCE_TRUNK_LOD0", vertices, faces, bark, collection, root, True)
save_editable(config)
print("Authored original editable spruce; use the registered export command for runtime delivery.")
