"""Original source-aligned Red Bull Ring start/finish–T1 visual reconstruction.

OSM/Steiermark-derived road frame is authoritative. Facility structures are neutral,
approximate LAPTRIX art, not surveyed dimensions or official circuit branding.
"""

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import owned_path, read_json, to_blender, to_runtime, validate_source_context  # noqa: E402
from modeling import box, consolidate, loft, material, mesh, tube  # noqa: E402
from regional_landscape import author_landscape  # noqa: E402
from regional_source import load_regional_source, validate_regional_properties  # noqa: E402
from source_io import save_editable  # noqa: E402
from surface_materials import ground_materials, world_uv  # noqa: E402
from track_context import TrackContext  # noqa: E402

config = read_json("assets/blender/tracks/red-bull-ring-slice.json")
context = TrackContext()
if config["sourceFingerprint"] != context.data["sourceFingerprint"]:
    raise ValueError("The Blender slice must use its pinned source frame")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
collection = bpy.data.collections.new("EXPORT")
scene.collection.children.link(collection)
root = bpy.data.objects.new(config["rootNode"], None)
collection.objects.link(root)
root["laptrix_asset"] = config["id"]
root["source_fingerprint"] = config["sourceFingerprint"]
root["authoring_context_sha256"] = hashlib.sha256(
    owned_path(config["authoringContext"]).read_bytes()
).hexdigest()
root["source_credits"] = json.dumps(context.data["attribution"]["sources"], ensure_ascii=False)
root["reconstruction"] = "OSM/Steiermark-derived alignment; original approximate facility art"
validate_source_context(config, root)
regional = load_regional_source(config["landscape"], lambda path: owned_path(path).read_bytes())
root["regional_context_sha256"] = config["landscape"]["contextSha256"]
root["regional_source_credit"] = json.dumps(regional["attribution"], ensure_ascii=False)
validate_regional_properties(config["landscape"], root, lambda path: owned_path(path).read_bytes())

concrete = material("RBR_Concrete", (0.44, 0.46, 0.44), 0.88)
white = material("RBR_Ice", (0.80, 0.82, 0.80), 0.68)
blue = material("RBR_Blue", (0.013, 0.085, 0.32), 0.56, 0.1)
dark = material("RBR_Charcoal", (0.035, 0.045, 0.05), 0.75, 0.12)
steel = material("RBR_Steel", (0.30, 0.35, 0.38), 0.42, 0.7)
glass = material("RBR_Glass", (0.065, 0.135, 0.17), 0.2, 0.65)
red = material("RBR_CurbRed", (0.46, 0.025, 0.016), 0.8)
surfaces = ground_materials()
grass, gravel, asphalt = (surfaces[key] for key in ("grass", "gravel", "asphalt"))


def p(distance, lateral=0, height=0, ground=True):
    return context.point(distance, lateral, height, ground)


def local_point(distance, lateral, x, y, z, base):
    center, normal, tangent = context.frame(distance)
    return (
        center[0] + normal[0] * (lateral + x) + tangent[0] * z,
        base + y,
        center[2] + normal[2] * (lateral + x) + tangent[2] * z,
    )


def block(name, distance, lateral, height, size, mat, radius=0.03, base=None):
    center = p(distance, lateral)
    center = (center[0], (center[1] if base is None else base) + height, center[2])
    obj = box(name, (0, 0, 0), size, mat, collection, root, 0 if min(size) < 0.09 else radius)
    bevel = obj.modifiers.get("Authored edge radii")
    if bevel:
        bevel.segments = 1 if min(size) < 0.25 else 2
    obj.location = to_blender(center)
    _, _, tangent = context.frame(distance)
    obj.rotation_euler.z = math.atan2(tangent[0], tangent[2])
    return obj


def strip(name, start, end, inside, outside, mat, lift=0.015, step=2):
    count = math.ceil((end - start) / step)
    points = [
        p(start + (end - start) * i / count, lateral, lift)
        for i in range(count + 1)
        for lateral in (inside, outside)
    ]
    return mesh(
        name, points, [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(count)], mat, collection, root
    )


# Original single-stroke glyphs, authored here rather than copying logos or font assets.
glyphs = {
    "0": [[(0, 0), (0, 1), (0.6, 1), (0.6, 0), (0, 0)]],
    "1": [[(0.1, 0.8), (0.35, 1), (0.35, 0)], [(0.1, 0), (0.6, 0)]],
    "5": [[(0.6, 1), (0, 1), (0, 0.5), (0.6, 0.5), (0.6, 0), (0, 0)]],
    "L": [[(0, 1), (0, 0), (0.6, 0)]],
    "A": [[(0, 0), (0.3, 1), (0.6, 0)], [(0.12, 0.4), (0.48, 0.4)]],
    "P": [[(0, 0), (0, 1), (0.6, 1), (0.6, 0.55), (0, 0.55)]],
    "T": [[(0, 1), (0.6, 1)], [(0.3, 1), (0.3, 0)]],
    "R": [[(0, 0), (0, 1), (0.6, 1), (0.6, 0.55), (0, 0.55)], [(0.25, 0.55), (0.6, 0)]],
    "I": [[(0.3, 0), (0.3, 1)]],
    "X": [[(0, 0), (0.6, 1)], [(0, 1), (0.6, 0)]],
}


def lettering(text, distance, lateral, height, size, mat, base=None):
    ground = p(distance, lateral)[1] if base is None else base
    for i, char in enumerate(text):
        for stroke in glyphs[char]:
            points = [
                local_point(
                    distance,
                    lateral,
                    -(x + i * 0.8 - len(text) * 0.4) * size,
                    height + y * size,
                    -0.075,
                    ground,
                )
                for x, y in stroke
            ]
            tube("Original_stencil_" + char, points, size * 0.026, mat, collection, root, 6)


# Exact rendered ground acts as the contact oracle for every structure. A shaped
# pit apron sits outside the driving surface and follows those same elevations.
strip("Pit_lane", -145, 235, 8.8, 24, asphalt, 0.022)
strip("Pit_outer_line", -140, 230, 22.7, 22.82, white, 0.028)
strip("Pit_inner_line", -140, 230, 10.0, 10.12, white, 0.028)
for distance in range(-130, 226, 12):
    strip("Pit_working_bay", distance, distance + 0.12, 19.8, 23.9, white, 0.03)

# The segmented wall, bases and fence follow the road grade; no suspended rails.
for distance in range(-144, 238, 4):
    ground = min(p(distance, 8.45)[1], p(distance + 4, 8.45)[1]) - 0.14
    ceiling = max(p(distance, 8.45)[1], p(distance + 4, 8.45)[1]) + 0.95
    block(
        "Pit_wall_segment",
        distance + 2,
        8.45,
        (ceiling - ground) / 2,
        (0.52, ceiling - ground, 3.96),
        white if (distance // 4) % 5 else blue,
        0.025,
        ground,
    )
    if distance % 12 == 0:
        block("Pit_fence_mast", distance, 8.45, 1.75, (0.075, 3.7, 0.075), steel, 0.006)
for height in (1.18, 1.8, 2.5, 3.1):
    tube(
        "Pit_catch_fence_wire",
        [p(d, 8.45, height) for d in range(-144, 241, 4)],
        0.012,
        steel,
        collection,
        root,
        4,
    )
for distance in range(-144, 241, 2):
    tube(
        "Pit_fence_vertical",
        [p(distance, 8.45, 1.15), p(distance, 8.45, 3.1)],
        0.009,
        steel,
        collection,
        root,
        4,
    )

# Modular original garages and stepped foundations, with visible doors, upper
# glazing, canopy edges and roof seams rather than featureless rectangular blocks.
for bay in range(11):
    distance, lateral = -85 + bay * 23, 31
    samples = [p(distance + z, lateral + x)[1] for x in (-6, 6) for z in (-11, 11)]
    base, bottom = max(samples) + 0.05, min(samples) - 0.25
    block(
        "Garage_foundation",
        distance,
        lateral,
        (base - bottom) / 2,
        (12.4, base - bottom, 22.9),
        concrete,
        0.03,
        bottom,
    )
    block("Garage_structure", distance, lateral, 2.35, (11.9, 4.7, 22.8), concrete, 0.07, base)
    block("Garage_roof", distance, lateral, 4.82, (13.8, 0.26, 23), white, 0.04, base)
    block("Hospitality_glass", distance, lateral - 6.02, 6.2, (0.06, 2.15, 22.1), glass, 0.012, base)
    block("Upper_floor_rear", distance, lateral + 2, 6.2, (7.9, 2.5, 22.8), white, 0.04, base)
    block("Upper_roof", distance, lateral, 7.55, (13.7, 0.22, 23), dark, 0.03, base)
    for gate in (-7.5, 0, 7.5):
        block("Garage_shutter", distance + gate, lateral - 6.0, 2.12, (0.055, 3.8, 6.4), dark, 0.016, base)
        for height in (0.5, 1, 1.5, 2, 2.5, 3, 3.5):
            block(
                "Shutter_slats",
                distance + gate,
                lateral - 6.044,
                height,
                (0.022, 0.018, 6.34),
                steel,
                0.002,
                base,
            )
        block(
            "Garage_ice_header",
            distance + gate,
            lateral - 6.12,
            4.3,
            (0.14, 0.33, 6.4),
            white if bay % 3 else blue,
            0.02,
            base,
        )
    for z in (-10.8, -7.2, -3.6, 0, 3.6, 7.2, 10.8):
        block("Glazing_mullion", distance + z, lateral - 6.075, 6.2, (0.075, 2.2, 0.06), steel, 0.008, base)
    for lateral2 in (27, 31, 35):
        block("Roof_seam", distance, lateral2, 7.685, (0.025, 0.015, 22.8), steel, 0.004, base)

# Start gantry: neutral original identity, elevated entirely outside car clearance.
for side in (-1, 1):
    block("Gantry_tower", -12, side * 8, 3.2, (0.38, 6.6, 0.5), steel, 0.035)
    block("Gantry_foot", -12, side * 8, 0.18, (1.15, 0.5, 1.4), concrete, 0.03)
base = p(-12)[1]
block("Gantry_header", -12, 0, 6.0, (16.5, 1.15, 0.38), blue, 0.035, base)
lettering("LAPTRIX", -12.3, 0, 5.64, 0.72, white, base)
for lateral in (-2, -1, 0, 1, 2):
    block("Start_light_pod", -12.3, lateral, 5.15, (0.36, 0.28, 0.36), dark, 0.018, base)

# End of straight/T1: fully connected curbs, outer asphalt runoff and gravel.
strip("T1_outer_runoff", 355, 485, 6.7, 22, asphalt, 0.028)
strip("T1_outer_gravel", 372, 510, 22, 39, gravel, 0.025)
strip("T1_inner_grass", 443, 625, -7.2, -22, grass, 0.021)
for start, end, side in [(355, 455, 1), (440, 560, -1), (525, 620, 1)]:
    for distance in range(start, end, 3):
        count = 3
        verts = [
            p(distance + i, side * lat, h, ground=False)
            for i in range(count + 1)
            for lat, h in [(6.0, 0.015), (6.35, 0.065), (7.15, 0.022)]
        ]
        faces = [
            (i * 3 + j, i * 3 + j + 1, (i + 1) * 3 + j + 1, (i + 1) * 3 + j)
            for i in range(count)
            for j in range(2)
        ]
        mesh("Raised_T1_curb", verts, faces, red if (distance // 3) % 2 else white, collection, root)

for side, lateral in [(-1, -12.5), (1, 42)]:
    start = -144 if side == -1 else 260
    for distance in range(start, 646, 6):
        block("Approach_fence_post", distance, lateral, 1.48, (0.09, 3.15, 0.11), steel, 0.009)
    for height in (0.55, 1.2, 1.95, 2.8):
        tube(
            "Approach_fence_wire",
            [p(d, lateral, height) for d in range(start, 647, 3)],
            0.014,
            steel,
            collection,
            root,
            4,
        )
    profile = [
        (-0.03, 0.38),
        (0.04, 0.43),
        (-0.025, 0.51),
        (0.04, 0.59),
        (-0.03, 0.66),
        (0.0, 0.68),
        (0.075, 0.59),
        (0.01, 0.51),
        (0.075, 0.43),
        (0.0, 0.36),
    ]
    loft(
        "Authored_corrugated_barrier",
        [[p(distance, lateral + x, height) for x, height in profile] for distance in range(start, 647, 3)],
        steel,
        collection,
        root,
    )
for remaining in (150, 100, 50):
    distance = 435 - remaining
    block("Brake_board", distance, 8.0, 1.8, (2.05, 1.55, 0.10), white, 0.022)
    block("Brake_board_support", distance, 8.0, 0.72, (0.11, 1.6, 0.10), dark, 0.009)
    lettering(str(remaining), distance - 0.11, 8.0, 1.28, 0.73, dark)

# Low original spectator bank and roofed stand on the outside of the straight.
stand_distance, stand_lateral = 140, -34
foundation = max(p(stand_distance + z, stand_lateral + x)[1] for z in (-33, 33) for x in (-7, 7))
block("Stand_foundation", stand_distance, stand_lateral, -0.15, (15, 0.5, 68), concrete, 0.02, foundation)
for row in range(7):
    lateral = stand_lateral - row * 1.25 + 4
    block(
        "Grandstand_tier",
        stand_distance,
        lateral,
        0.5 + row * 0.54,
        (1.30, 0.24, 66),
        concrete,
        0.016,
        foundation,
    )
    for seat in range(55):
        distance = stand_distance - 32 + seat * 1.18
        block(
            "Spectator_seat",
            distance,
            lateral,
            0.74 + row * 0.54,
            (0.52, 0.16, 0.78),
            blue if (seat // 7 + row) % 3 else white,
            0.045,
            foundation,
        )
for distance in range(stand_distance - 32, stand_distance + 33, 8):
    block("Stand_roof_column", distance, stand_lateral - 6, 3.5, (0.17, 7.2, 0.17), steel, 0.012, foundation)
    tube(
        "Stand_roof_outreach",
        [
            local_point(distance, stand_lateral, -6, 7, 0, foundation),
            local_point(distance, stand_lateral, 7, 6.3, 0, foundation),
        ],
        0.09,
        steel,
        collection,
        root,
        6,
    )
block("Grandstand_canopy", stand_distance, stand_lateral, 7.12, (16, 0.16, 69), white, 0.04, foundation)

# Retain actual roof footprints before batching so contextual tree crowns can
# clear authored facilities without shifting any other planted site's variation.
bpy.context.view_layer.update()
footprints = []
for obj in collection.objects:
    if obj.name.split(".")[0] in {"Garage_roof", "Grandstand_canopy"}:
        corners = [to_runtime(obj.matrix_world @ obj.data.vertices[i].co) for i in (0, 1, 5, 4)]
        footprints.append([[point[0], point[2]] for point in corners])
root["vegetation_exclusions"] = json.dumps(footprints)

# Coarse solid silhouettes avoid resubmitting bevels, seating and lettering to
# the small moving sun map. The browser disables their color/depth writes.
shadow_names = {
    "Pit_wall_segment",
    "Garage_foundation",
    "Garage_structure",
    "Garage_roof",
    "Upper_floor_rear",
    "Upper_roof",
    "Gantry_tower",
    "Gantry_header",
    "Stand_foundation",
    "Grandstand_tier",
    "Grandstand_canopy",
    "Stand_roof_column",
}
shadow_vertices, shadow_faces = [], []
for obj in collection.objects:
    if obj.type == "MESH" and obj.name.split(".")[0] in shadow_names:
        offset = len(shadow_vertices)
        shadow_vertices.extend(to_runtime(obj.matrix_world @ vertex.co) for vertex in obj.data.vertices)
        shadow_faces.extend(tuple(offset + i for i in polygon.vertices) for polygon in obj.data.polygons)
shadow = mesh(
    "SHADOW_CASTERS_LOD0",
    shadow_vertices,
    shadow_faces,
    material("RBR_Shadow", (0.1, 0.1, 0.1), 1),
    collection,
    root,
)
shadow["purpose"] = "Coarse shadow silhouettes; runtime disables color/depth writes"
shadow.display_type = "WIRE"

for name, position in config["requiredNodes"].items():
    if name in {config["rootNode"], "SHADOW_CASTERS_LOD0", config["landscape"]["node"]}:
        continue
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = root
    obj.location = to_blender(position)
for obj in collection.objects:
    if obj.type == "MESH" and obj.data.materials[0] in surfaces.values():
        world_uv(obj, obj.data.materials[0]["laptrix_tile_metres"])
consolidate(collection, protected=("SHADOW_CASTERS_LOD0",))
author_landscape(context.data, regional, config["landscape"], grass, collection, root)
scene.world = bpy.data.worlds.new("Authoring daylight")
save_editable(config)
print(f"Authored source-aligned slice: {config['sourceFile']}")
