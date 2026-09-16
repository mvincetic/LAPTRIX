"""Author the original LAPTRIX GT: continuous bodywork, fitted cabin and native rig.

No existing React car geometry, third-party CAD or manufacturer model is imported.
The control stations describe a compact front-engine racing coupe with broad rear
haunches and a restrained blue/ice-white livery. Run only for intentional rebuilds.
"""

import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import read_json, to_blender  # noqa: E402
from modeling import (
    bevel,
    box,
    consolidate,
    interpolate,
    lathe_x,
    loft,
    material,  # noqa: E402
    mesh,
    skin_point,
    tube,
)
from source_io import save_editable  # noqa: E402

config = read_json("assets/blender/vehicles/gt.json")
profile = read_json("data/vehicles/gt-development.json")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
collection = bpy.data.collections.new("EXPORT")
scene.collection.children.link(collection)
root = bpy.data.objects.new("GT_ROOT", None)
collection.objects.link(root)
root["laptrix_asset"] = config["id"]
root["laptrix_contract"] = 1
root["design"] = "Original LAPTRIX GT / continuous body control cage / ice-stripe livery"

paint = material("GT_Paint", (0.012, 0.105, 0.52), 0.24, 0.45, coat=0.65)
white = material("GT_Ice", (0.78, 0.85, 0.9), 0.27, 0.25, coat=0.5)
carbon = material("GT_Carbon", (0.010, 0.014, 0.019), 0.58, 0.06)
rubber = material("GT_Rubber", (0.014, 0.017, 0.022), 0.86)
glass = material("GT_Glass", (0.026, 0.067, 0.09), 0.1, 0.65, coat=0.65)
alloy = material("GT_Alloy", (0.34, 0.40, 0.46), 0.25, 0.92)
rotor_mat = material("GT_Rotor", (0.09, 0.11, 0.13), 0.58, 0.88)
caliper_mat = material("GT_Caliper", (0.66, 0.09, 0.025), 0.34, 0.35)
led = material("GT_Headlight", (0.72, 0.88, 1.0), 0.18, 0.2, emission=1.5)
lamp_mat = material("GT_Brake", (0.85, 0.007, 0.016), 0.23, 0.1, emission=1.0)


def part(name, center, size, mat=carbon, radius=0.01, parent=root):
    return box(name, center, size, mat, collection, parent, radius)


def line(name, points, radius=0.005, mat=carbon, parent=root):
    return tube(name, points, radius, mat, collection, parent)


def patch(name, points, mat, parent=root):
    return mesh(name, points, [tuple(range(len(points)))], mat, collection, parent)


# Longitudinal silhouette stations: z, half width, deck crown, fender crown, sill.
stations = [
    (-2.16, 0.74, 0.64, 0.65, 0.23),
    (-2.07, 0.86, 0.78, 0.80, 0.22),
    (-1.76, 0.93, 0.83, 0.84, 0.22),
    (-1.23, 0.95, 0.83, 0.86, 0.22),
    (-0.69, 0.90, 0.73, 0.78, 0.22),
    (-0.2, 0.865, 0.70, 0.75, 0.21),
    (0.45, 0.87, 0.69, 0.74, 0.21),
    (0.95, 0.935, 0.685, 0.83, 0.22),
    (1.23, 0.95, 0.65, 0.835, 0.22),
    (1.60, 0.925, 0.60, 0.75, 0.22),
    (1.99, 0.86, 0.51, 0.59, 0.23),
    (2.12, 0.76, 0.43, 0.49, 0.25),
]
rings = []
for z, width, deck, fender, sill in interpolate(stations, 6):
    half = [
        (0, deck),
        (0.24 * width, deck + 0.005),
        (0.50 * width, deck + 0.018),
        (0.72 * width, fender),
        (0.89 * width, fender - 0.015),
        (0.98 * width, fender - 0.09),
        (width, fender - 0.18),
        (0.985 * width, sill + 0.04),
        (0.83 * width, sill),
    ]
    contour = half + [(-x, y) for x, y in half[:0:-1]]
    rings.append([(x, y, z) for x, y in contour])
# The rear skin rolls into a real recessed fascia while retaining its outer cage.
rear = rings[0]
fascia = [
    [(x * scale, 0.43 + (y - 0.43) * scale, z + depth) for x, y, z in rear]
    for scale, depth in [(0.67, 0.09), (0.75, 0.075), (0.87, 0.015), (0.96, -0.009)]
]
body = loft("Sculpted_shell_LOD0", fascia + rings, paint, collection, root)

# Real open wheel arches: the inner cutoff leaves the central chassis intact.
wheelbase, radius = profile["wheelbase"], profile["wheelRadius"]
tyre_width = min(profile["width"] * 0.19, radius * 1.2)
wheel_x = profile["width"] / 2 - tyre_width / 2
for side in (-1, 1):
    for axle in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=64,
            radius=radius + 0.056,
            depth=1.2,
            location=to_blender((side * 1.19, radius, axle * wheelbase / 2)),
            rotation=(0, math.pi / 2, 0),
        )
        cutter = bpy.context.object
        modifier = body.modifiers.new("Open wheel arch", "BOOLEAN")
        modifier.operation = "DIFFERENCE"
        modifier.solver = "EXACT"
        modifier.object = cutter
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
# Open the underbody exit through the actual painted shell, leaving the side cheeks.
cutter = box("Rear_exit_cutter", (0, 0.17, -2.02), (1.40, 0.48, 0.64), carbon, collection, root, 0.065)
bpy.context.view_layer.objects.active = cutter
cutter.select_set(True)
for modifier in list(cutter.modifiers):
    bpy.ops.object.modifier_apply(modifier=modifier.name)
shroud_rings = [
    [(x * scale, 0.43 + (y - 0.43) * scale, z + depth - 0.005) for x, y, z in rear]
    for scale, depth in [(0.67, 0.09), (0.75, 0.075), (0.87, 0.015)]
]
n = len(rear)
shroud_faces = [tuple(range(n - 1, -1, -1))]
shroud_faces += [
    (i * n + j, i * n + (j + 1) % n, (i + 1) * n + (j + 1) % n, (i + 1) * n + j)
    for i in range(len(shroud_rings) - 1)
    for j in range(n)
]
shroud = mesh(
    "Sculpted_rear_carbon_recess",
    [v for ring in shroud_rings for v in ring],
    shroud_faces,
    carbon,
    collection,
    root,
    True,
)
wall = shroud.modifiers.new("Recess skin thickness", "SOLIDIFY")
wall.thickness = 0.001
wall.offset = -1
bpy.context.view_layer.objects.active = shroud
bpy.ops.object.modifier_apply(modifier=wall.name)
for target in (body, shroud):
    modifier = target.modifiers.new("Recessed diffuser exit", "BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.data.objects.remove(cutter, do_unlink=True)
bevel(body, 0.008, 2)
body.modifiers.remove(body.modifiers.get("Panel normals"))

# Canopy surfaces follow a shared cross section; glazing is fitted to the same skin.
canopy = [
    (-1.42, 0.67, 0.81),
    (-1.20, 0.65, 0.90),
    (-0.82, 0.60, 1.17),
    (-0.55, 0.57, 1.25),
    (-0.19, 0.57, 1.27),
    (0.04, 0.585, 1.24),
    (0.24, 0.62, 1.11),
    (0.67, 0.73, 0.735),
]
canopy_rings = []
for z, width, top in interpolate(canopy, 6):
    canopy_rings.append(
        [
            (0, top, z),
            (0.70 * width, top - 0.015, z),
            (0.92 * width, top - 0.055, z),
            (width, max(0.74, top - 0.12), z),
            (0.76, 0.705, z),
            (-0.76, 0.705, z),
            (-width, max(0.74, top - 0.12), z),
            (-0.92 * width, top - 0.055, z),
            (-0.70 * width, top - 0.015, z),
        ]
    )
loft("Cabin_continuous_LOD0", canopy_rings, paint, collection, root)

# Curved windscreen / rear glazing grids sampled on their fitted longitudinal skin.
for name, selected in [
    ("Windscreen", [(0.60, 0.701, 0.80), (0.45, 0.675, 0.916), (0.27, 0.626, 1.09), (0.10, 0.592, 1.221)]),
    (
        "Rear_glass",
        [(-1.27, 0.654, 0.876), (-1.10, 0.638, 0.978), (-0.94, 0.615, 1.105), (-0.78, 0.594, 1.194)],
    ),
]:
    grid = []
    for z, width, top in interpolate(selected, 4):
        grid.append(
            [
                skin_point(canopy_rings, u * width * 0.90, z)
                for u in (-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1)
            ]
        )
    vertices = [v for row in grid for v in row]
    faces = [
        (i * 9 + j, i * 9 + j + 1, (i + 1) * 9 + j + 1, (i + 1) * 9 + j)
        for i in range(len(grid) - 1)
        for j in range(8)
    ]
    mesh(name + "_LOD0", vertices, faces, glass, collection, root, True)
    line(
        name + "_seal",
        [*grid[0], *[row[-1] for row in grid[1:]], *grid[-1][-2::-1], *[row[0] for row in grid[-2::-1]]],
        0.008,
    )

for side in (-1, 1):
    # Closed quarter glass and door pane retain a painted B-pillar.
    for name, start, end in [("Door_glass", -0.40, 0.47), ("Quarter_glass", -1.14, -0.49)]:
        grid = []
        for i in range(19):
            z = start + (end - start) * i / 18
            top = skin_point(canopy_rings, 0, z, offset=0)[1] - 0.09
            row = []
            for j in range(5):
                y = 0.795 + (top - 0.795) * j / 4
                x, y, z = skin_point(canopy_rings, y, z, axis=1, offset=0.007)
                row.append((side * x, y, z))
            grid.append(row)
        mesh(
            name,
            [v for row in grid for v in row],
            [
                (i * 5 + j, i * 5 + j + 1, (i + 1) * 5 + j + 1, (i + 1) * 5 + j)
                for i in range(len(grid) - 1)
                for j in range(4)
            ],
            glass,
            collection,
            root,
            True,
        )
        line(
            name + "_seal",
            [*grid[0], *[r[-1] for r in grid[1:]], *grid[-1][-2::-1], *[r[0] for r in grid[-2::-1]]],
            0.006,
        )
    # Dark panel seams, flush handles, side vent and tapered sill blade.
    seam = [
        (side * x, y, z)
        for x, y, z in [
            (0.754, 0.727, 0.49),
            (0.889, 0.61, 0.42),
            (0.867, 0.285, 0.36),
            (0.864, 0.265, -0.50),
            (0.904, 0.54, -0.65),
            (0.755, 0.727, -0.6),
        ]
    ]
    line("Door_perimeter", seam, 0.004)
    part("Door_handle", (side * 0.889, 0.69, -0.40), (0.011, 0.019, 0.10), carbon, 0.006)
    part("Sill_blade", (side * 0.904, 0.205, -0.12), (0.08, 0.045, 1.65), carbon, 0.014)
    patch(
        "Sill_ice_spear",
        [
            (side * 0.950, 0.246, -0.65),
            (side * 0.886, 0.41, 0.39),
            (side * 0.902, 0.35, 0.41),
            (side * 0.954, 0.229, -0.60),
        ],
        white,
    )
    part("Side_intake", (side * 0.918, 0.60, -0.79), (0.018, 0.11, 0.18), carbon, 0.03)
    line("Mirror_arm", [(side * 0.72, 0.80, 0.43), (side * 0.93, 0.88, 0.34)], 0.018)
    part("Mirror_housing", (side * 0.942, 0.896, 0.32), (0.17, 0.095, 0.15), paint, 0.039)
    part("Mirror_glass", (side * 0.944, 0.898, 0.247), (0.135, 0.062, 0.005), alloy, 0.014)

# Nose: recessed intake, carbon splitter, offset LED signatures and hood extraction.
part("Front_splitter", (0, 0.185, 1.79), (1.91, 0.055, 0.75), carbon, 0.028)
part("Central_intake", (0, 0.355, 2.106), (1.10, 0.21, 0.028), carbon, 0.045)
for x in [i * 0.06 for i in range(-8, 9)]:
    part("Intake_grid", (x, 0.355, 2.125), (0.007, 0.145, 0.006), rotor_mat, 0.002)
for side in (-1, 1):
    part("Brake_duct", (side * 0.682, 0.37, 2.064), (0.18, 0.18, 0.042), carbon, 0.035)
    points = [
        skin_point(rings, side * x, z, offset=0.009)
        for x, z in [(0.48, 1.91), (0.59, 1.865), (0.68, 1.83), (0.75, 1.75), (0.79, 1.68)]
    ]
    lamp_rows = interpolate([(x, z) for x, y, z in points], 4)
    lens_vertices = [
        skin_point(rings, x + side * delta, z, offset=0.008)
        for x, z in lamp_rows
        for delta in (-0.035, 0.035)
    ]
    mesh(
        "Headlamp_lens",
        lens_vertices,
        [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(lamp_rows) - 1)],
        carbon,
        collection,
        root,
        True,
    )
    line("LED_signature", [skin_point(rings, x, z, offset=0.018) for x, z in lamp_rows], 0.007, led)
    vent_rows = [(0.85 + i * 0.58 / 15) for i in range(16)]
    mesh(
        "Hood_extractor",
        [skin_point(rings, side * x, z, offset=0.006) for z in vent_rows for x in (0.31, 0.44)],
        [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(15)],
        carbon,
        collection,
        root,
        True,
    )
    for z in (0.93, 1.04, 1.15, 1.26):
        line(
            "Hood_louvre",
            [skin_point(rings, side * x, z, offset=0.015) for x in (0.32, 0.38, 0.43)],
            0.006,
            alloy,
        )
    line(
        "Hood_seam",
        [
            (side * 0.50, 0.713, 0.72),
            (side * 0.55, 0.710, 1.08),
            (side * 0.56, 0.664, 1.57),
            (side * 0.43, 0.581, 1.85),
        ],
        0.003,
    )

# Ice centre stripes are fitted to hood and roof, leaving the glazing unobstructed.
for left, right in [(-0.125, -0.025), (0.025, 0.125)]:
    for name, stations2 in [
        ("Hood_stripe", [(1.91, 0.539), (1.59, 0.615), (1.23, 0.67), (0.95, 0.705), (0.70, 0.711)]),
        ("Roof_stripe", [(-0.61, 1.249), (-0.4, 1.271), (-0.19, 1.279), (0.015, 1.258)]),
    ]:
        rows = interpolate(stations2, 5)
        mesh(
            name,
            [
                skin_point(canopy_rings if name == "Roof_stripe" else rings, x, z)
                for z, y in rows
                for x in (left, right)
            ],
            [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(rows) - 1)],
            white,
            collection,
            root,
            True,
        )

# Rear: separated lamps, ventilation, wing with aerofoil section and vertical fins.
part("Recessed_rear_grille", (0, 0.475, -2.094), (0.98, 0.14, 0.018), carbon, 0.027)
for x in [i * 0.05 for i in range(-9, 10)]:
    part("Rear_grille_slat", (x, 0.475, -2.107), (0.006, 0.10, 0.008), rotor_mat, 0.0015)
for side in (-1, 1):
    part(
        f"BRAKE_LIGHT_{'L' if side == 1 else 'R'}",
        (side * 0.50, 0.607, -2.177),
        (0.47, 0.045, 0.046),
        lamp_mat,
        0.017,
    )
    part("Wing_stanchion", (side * 0.53, 1.05, -1.69), (0.035, 0.48, 0.075), carbon, 0.009)
    part("Wing_endplate", (side * 0.94, 1.282, -1.90), (0.022, 0.215, 0.44), paint, 0.016)
    line("Exhaust", [(side * 0.31, 0.355, -2.08), (side * 0.31, 0.355, -2.23)], 0.05, alloy)
    line("Exhaust_bore", [(side * 0.31, 0.355, -2.227), (side * 0.31, 0.355, -2.242)], 0.038)
wing_section = [
    (-0.24, 0.008),
    (-0.21, 0.035),
    (-0.11, 0.049),
    (0.07, 0.036),
    (0.21, 0.005),
    (0.20, -0.004),
    (0.01, 0.001),
    (-0.18, -0.009),
]
loft(
    "Rear_wing_aerofoil",
    [[(x, 1.295 + y, -1.87 + z) for z, y in wing_section] for x in (-0.932, -0.9, 0, 0.9, 0.932)],
    carbon,
    collection,
    root,
)
# A curved exit ramp and solid strakes connect to the opened underbody.
diffuser_sections = [(-2.20, 0.29, 0.76), (-2.04, 0.25, 0.73), (-1.86, 0.19, 0.70), (-1.70, 0.16, 0.68)]
loft(
    "Diffuser_exit_ramp",
    [[(-w, y, z), (w, y, z), (w, y - 0.022, z), (-w, y - 0.022, z)] for z, y, w in diffuser_sections],
    carbon,
    collection,
    root,
)
for x in (-0.72, -0.44, -0.15, 0.15, 0.44, 0.72):
    loft(
        "Diffuser_strake",
        [
            [
                (x * w / 0.76 - 0.004, top - 0.015, z),
                (x * w / 0.76 + 0.004, top - 0.015, z),
                (x * w / 0.76 + 0.004, 0.135, z),
                (x * w / 0.76 - 0.004, 0.135, z),
            ]
            for z, top, w in diffuser_sections
        ],
        carbon,
        collection,
        root,
    )

# Native wheel rig. Stationary discs/calipers stay under the steering carrier.
for side in (-1, 1):
    for axle in (-1, 1):
        label = ("F" if axle == 1 else "R") + ("L" if side == 1 else "R")
        carrier = bpy.data.objects.new("WHEEL_" + label, None)
        collection.objects.link(carrier)
        carrier.parent = root
        carrier.location = to_blender((side * wheel_x, radius, axle * wheelbase / 2))
        spin = bpy.data.objects.new("SPIN_" + label, None)
        collection.objects.link(spin)
        spin.parent = carrier
        half = tyre_width / 2
        tyre_profile = [
            (-half, 0.263),
            (-half, 0.315),
            (-half + 0.012, 0.344),
            (-half + 0.034, radius - 0.002),
            (-half + 0.06, radius),
            (half - 0.06, radius),
            (half - 0.034, radius - 0.002),
            (half - 0.012, 0.344),
            (half, 0.315),
            (half, 0.263),
            (half - 0.015, 0.256),
            (-half + 0.015, 0.256),
            (-half, 0.263),
        ]
        lathe_x("Tyre", tyre_profile, rubber, collection, spin, 64)
        rim_profile = [
            (side * x, r)
            for x, r in [
                (half - 0.12, 0.248),
                (half - 0.10, 0.264),
                (half - 0.025, 0.264),
                (half + 0.004, 0.255),
                (half + 0.012, 0.246),
                (half + 0.008, 0.231),
                (half - 0.005, 0.226),
                (half - 0.02, 0.238),
                (half - 0.10, 0.239),
                (half - 0.12, 0.248),
            ]
        ]
        lathe_x("Forged_rim", rim_profile, alloy, collection, spin)
        lathe_x(
            "Rotor",
            [
                (side * x, r)
                for x, r in [
                    (half - 0.034, 0.085),
                    (half - 0.034, 0.211),
                    (half - 0.045, 0.211),
                    (half - 0.045, 0.085),
                    (half - 0.034, 0.085),
                ]
            ],
            rotor_mat,
            collection,
            carrier,
        )
        for spoke in range(10):
            angle = spoke * math.tau / 10
            for offset in (-0.021, 0.021):
                a, b = angle + offset, angle + offset * 2
                line(
                    "Split_spoke",
                    [
                        (side * (half + 0.016), 0.065 * math.cos(a), 0.065 * math.sin(a)),
                        (side * (half - 0.004), 0.224 * math.cos(b), 0.224 * math.sin(b)),
                    ],
                    0.012,
                    alloy,
                    spin,
                )
        lathe_x(
            "Centre_lock",
            [
                (side * x, r)
                for x, r in [
                    (half + 0.023, 0.014),
                    (half + 0.023, 0.052),
                    (half + 0.005, 0.052),
                    (half + 0.005, 0.014),
                    (half + 0.023, 0.014),
                ]
            ],
            carbon,
            collection,
            spin,
            24,
        )
        part(
            "Caliper",
            (side * (half - 0.016), 0.052, -0.166),
            (0.055, 0.135, 0.078),
            caliper_mat,
            0.022,
            carrier,
        )
        # Subtle tread channels and rim valve remain physical meshes, no texture payload.
        for x in (-0.07, 0.07):
            lathe_x(
                "Tread_channel",
                [(x - 0.002, radius + 0.0005), (x + 0.002, radius + 0.0005)],
                carbon,
                collection,
                spin,
                64,
            )

consolidate(collection, ("BRAKE_LIGHT_L", "BRAKE_LIGHT_R"))
scene.world = bpy.data.worlds.new("Authoring daylight")
scene.world.color = (0.15, 0.15, 0.15)
save_editable(config)
print(f"Authored original GT: {config['sourceFile']}")
