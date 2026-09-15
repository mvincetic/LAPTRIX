"""Original LAPTRIX Formula 2026 art; no team mesh, CAD or React geometry inputs.

The sculpted station cages and aerofoil sections are original. Public FIA design
direction informs the category, not an aerodynamic or homologation claim. The
existing development profile remains the metre-scale wheel/telemetry authority.
"""

import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import read_json, to_blender, to_runtime  # noqa: E402
from modeling import (  # noqa: E402
    box,
    consolidate,
    interpolate,
    lathe_x,
    loft,
    material,
    mesh,
    skin_point,
    tube,
)
from source_io import save_editable  # noqa: E402

config = read_json("assets/blender/vehicles/formula26.json")
profile = read_json("data/vehicles/formula-development.json")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
scene.unit_settings.length_unit = "METERS"
collection = bpy.data.collections.new("EXPORT")
scene.collection.children.link(collection)
root = bpy.data.objects.new("FORMULA26_ROOT", None)
collection.objects.link(root)
root["laptrix_asset"] = config["id"]
root["laptrix_contract"] = 1
root["design"] = "Original LAPTRIX Formula 2026 / blue and ice / native development rig"
root["aero_state"] = "Static authored wing pose; existing telemetry has no active-aero channel"

blue = material("F26_Paint", (0.01, 0.095, 0.50), 0.25, 0.38, coat=0.72)
ice = material("F26_Ice", (0.82, 0.87, 0.92), 0.29, 0.18, coat=0.55)
carbon = material("F26_Carbon", (0.013, 0.018, 0.025), 0.42, 0.22)
rubber = material("F26_Rubber", (0.012, 0.014, 0.018), 0.87)
alloy = material("F26_Alloy", (0.26, 0.31, 0.37), 0.27, 0.93)
rotor = material("F26_Rotor", (0.11, 0.13, 0.16), 0.66, 0.78)
black = material("F26_Interior", (0.004, 0.007, 0.011), 0.76)
visor = material("F26_Visor", (0.025, 0.12, 0.20), 0.08, 0.86, coat=0.9)
red = material("F26_RearLight", (0.9, 0.005, 0.012), 0.3, 0.15, emission=0.6)


def part(name, center, size, mat=carbon, radius=0.006, parent=root):
    return box(name, center, size, mat, collection, parent, radius)


def line(name, points, radius=0.008, mat=carbon, parent=root, sides=10):
    return tube(name, points, radius, mat, collection, parent, sides)


def patch(name, points, mat=carbon):
    return mesh(name, points, [tuple(range(len(points)))], mat, collection, root)


def ring_skin(name, rings, mat, open_front=False):
    obj = loft(name, rings, mat, collection, root)
    if open_front:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.faces[-1]], context="FACES_ONLY")
        bm.to_mesh(obj.data)
        bm.free()
    return obj


def wing(name, leading, height, span, chord, rise, mat, sweep=0.0, cup=0.0):
    """A closed, cambered foil sampled continuously across a shaped span."""
    rings = []
    section = [(i / 20, 1) for i in range(21)] + [(i / 20, -1) for i in range(20, -1, -1)]
    for i in range(25):
        x = span * (2 * i / 24 - 1)
        u = abs(x / span)
        c = chord * (1 - 0.12 * u * u)
        rings.append(
            [
                (
                    x,
                    height
                    + cup * u * u
                    + rise * t
                    + 0.018 * 4 * t * (1 - t)
                    + sign * 0.014 * (0.04 + math.sin(math.pi * t) ** 0.7),
                    leading - sweep * u * u - c * t,
                )
                for t, sign in section
            ]
        )
    return ring_skin(name, rings, mat)


def blade(name, a, b, width=0.022, thickness=0.007, mat=carbon):
    """Flattened suspension fairing: rounded section, no oversized round rods."""
    start, end = Vector(a), Vector(b)
    axis = (end - start).normalized()
    across = axis.cross(Vector((0, 1, 0))).normalized()
    up = axis.cross(across).normalized()
    rings = [
        [
            tuple(
                p
                + across * math.cos(j * math.tau / 12) * width
                + up * math.sin(j * math.tau / 12) * thickness
            )
            for j in range(12)
        ]
        for p in (start, end)
    ]
    return ring_skin(name, rings, mat)


# Continuous monocoque/nose cage. Stations run rear to front, in metres.
stations = [
    (-1.96, 0.10, 0.22, 0.40),
    (-1.65, 0.15, 0.19, 0.47),
    (-1.10, 0.23, 0.18, 0.55),
    (-0.68, 0.29, 0.19, 0.65),
    (-0.22, 0.30, 0.20, 0.67),
    (0.30, 0.29, 0.23, 0.66),
    (0.75, 0.235, 0.26, 0.60),
    (1.25, 0.175, 0.275, 0.53),
    (1.82, 0.13, 0.265, 0.46),
    (2.20, 0.105, 0.25, 0.395),
    (2.43, 0.065, 0.26, 0.345),
    (2.48, 0.035, 0.275, 0.315),
]
body_rings = []
for z, half, bottom, top in interpolate(stations, 7):
    body_rings.append(
        [
            (
                half * math.cos(j * math.tau / 32),
                bottom + (top - bottom) * (0.5 + 0.5 * math.sin(j * math.tau / 32)),
                z,
            )
            for j in range(32)
        ]
    )
body = ring_skin("Sculpted_monocoque", body_rings, blue)

# An actual open cockpit, cut into the monocoque. The inner tub has no top cap.
opening = [
    (0.221 * math.cos(i * math.tau / 64), -0.17 + 0.49 * math.sin(i * math.tau / 64)) for i in range(64)
]
cutter = loft(
    "Cockpit_authoring_cut",
    [[(x, y, z) for x, z in opening] for y in (0.38, 1.5)],
    black,
    collection,
    root,
    False,
)
modifier = body.modifiers.new("Open cockpit cavity", "BOOLEAN")
modifier.operation = "DIFFERENCE"
modifier.solver = "EXACT"
modifier.object = cutter
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.data.objects.remove(cutter, do_unlink=True)
# The symmetric cut meets the crown seam at coincident vertices. Weld only
# numerical duplicates at that Boolean boundary; keep the full cockpit contour.
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-7)
bm.to_mesh(body.data)
bm.free()
inner = [
    [(x * scale, y, -0.17 + (z + 0.17) * scale) for x, z in opening]
    for y, scale in ((0.39, 0.84), (0.57, 0.985), (0.646, 0.997))
]
ring_skin("Cockpit_inner_tub", inner, black, True)
line("Cockpit_rim", [(x, 0.65, z) for x, z in opening + opening[:1]], 0.012, carbon)
part("Seat_back", (0, 0.51, -0.50), (0.32, 0.20, 0.08), black, 0.025)

# Pinched sidepods: deep undercuts, raised intake lips, and downward rear channels.
for side in (-1, 1):
    pod_stations = [
        (-1.62, 0.28, 0.055, 0.19, 0.31),
        (-1.28, 0.36, 0.13, 0.18, 0.42),
        (-0.80, 0.46, 0.22, 0.20, 0.51),
        (-0.22, 0.49, 0.26, 0.235, 0.585),
        (0.24, 0.49, 0.265, 0.28, 0.64),
        (0.56, 0.48, 0.235, 0.35, 0.66),
        (0.73, 0.46, 0.185, 0.425, 0.625),
    ]
    rings = []
    for z, center, w, base, top in interpolate(pod_stations, 7):
        shape = [
            (-0.9, top - 0.04),
            (-0.45, top),
            (0.4, top - 0.008),
            (0.86, top - 0.035),
            (1.0, top - 0.085),
            (0.90, base + 0.10),
            (0.43, base + 0.01),
            (-0.25, base),
            (-0.9, base + 0.03),
        ]
        rings.append([(side * (center + u * w), y, z) for u, y in shape])
    ring_skin("Undercut_sidepod", rings, blue, True)
    mouth = rings[-1]
    cx, cy = side * 0.46, 0.531
    inset = [(cx + (x - cx) * 0.79, cy + (y - cy) * 0.72, z - 0.075) for x, y, z in mouth]
    ring_skin("Intake_inner_duct", [inset, mouth], carbon, True)
    patch("Intake_dark_recess", inset, black)
    line("Intake_ice_lip", mouth[:5], 0.007, ice)
    # Original swept livery follows the outer shoulder's actual loft faces.
    band_rings = rings[6:-3]
    band = [
        tuple(a[j] + t * (b[j] - a[j]) + (side * 0.002 if j == 0 else 0) for j in range(3))
        for ring in band_rings
        for a, b in [(ring[3], ring[4])]
        for t in (0.22, 0.80)
    ]
    mesh(
        "Sidepod_ice_sweep",
        band,
        [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(len(band_rings) - 1)],
        ice,
        collection,
        root,
        True,
    )
    # A fitted painted shoulder ribbon and two longitudinal cooling channels.
    for fraction in (0.35, 0.63):
        points = []
        for ring in rings[8:-5]:
            a, b = ring[1], ring[2]
            points.append(tuple(a[j] + fraction * (b[j] - a[j]) + (0.002 if j == 1 else 0) for j in range(3)))
        line("Sidepod_surface_channel", points, 0.0045, carbon)
    for i in range(9):
        z = -0.42 - i * 0.074
        # Cooling slots follow the actual sidepod upper cage.
        point = min(rings, key=lambda r: abs(r[0][2] - z))[1]
        blade(
            "Cooling_louvre",
            (point[0], point[1] + 0.004, point[2]),
            (point[0] + side * 0.105, point[1] + 0.002, point[2] + 0.016),
            0.011,
            0.003,
        )
    # Wake board ahead of the inlet, without the discontinued wheel brow.
    board = [
        (side * 0.71, 0.17, 0.68),
        (side * 0.76, 0.18, 1.05),
        (side * 0.71, 0.43, 0.94),
        (side * 0.64, 0.48, 0.69),
    ]
    patch("Inwashing_wake_board", board)
    line("Wake_board_edge", board[1:3], 0.006, ice)

# Sculpted floor edge and diffuser are attached to the native contact frame.
floor_stations = [
    (-2.34, 0.48, 0.32),
    (-1.90, 0.53, 0.16),
    (-1.32, 0.74, 0.125),
    (-0.65, 0.86, 0.115),
    (0.22, 0.86, 0.12),
    (0.72, 0.71, 0.145),
    (1.02, 0.30, 0.16),
    (1.74, 0.13, 0.19),
]
floor_rings = [
    [
        (x, y, z)
        for x, y in [
            (-w, top),
            (-w * 0.97, top - 0.025),
            (w * 0.97, top - 0.025),
            (w, top),
            (w * 0.96, top + 0.012),
            (-w * 0.96, top + 0.012),
        ]
    ]
    for z, w, top in interpolate(floor_stations, 7)
]
ring_skin("Ground_effect_floor", floor_rings, carbon)
for side in (-1, 1):
    line(
        "Floor_edge_ice",
        [(side * abs(r[0][0]), r[0][1] + 0.009, r[0][2]) for r in floor_rings[14:39]],
        0.006,
        ice,
    )
for x in (-0.44, -0.25, 0, 0.25, 0.44):
    patch("Diffuser_fence", [(x, 0.092, -1.4), (x, 0.092, -2.34), (x, 0.322, -2.34), (x, 0.126, -1.4)])

# Engine cover and roll-hoop / airbox, narrowing into a long rear spine.
cover_stations = [
    (-2.12, 0.07, 0.30, 0.45),
    (-1.71, 0.13, 0.35, 0.59),
    (-1.16, 0.17, 0.39, 0.77),
    (-0.83, 0.17, 0.49, 1.015),
    (-0.67, 0.145, 0.58, 1.10),
    (-0.56, 0.12, 0.63, 1.055),
]
cover_rings = [
    [
        (
            w * math.cos(j * math.tau / 24),
            bottom + (top - bottom) * (0.5 + 0.5 * math.sin(j * math.tau / 24)),
            z,
        )
        for j in range(24)
    ]
    for z, w, bottom, top in interpolate(cover_stations, 8)
]
ring_skin("Sculpted_engine_cover", cover_rings, blue)
patch("Dorsal_spine", [(0, 0.48, -2.1), (0, 0.67, -1.66), (0, 1.06, -0.75), (0, 0.61, -0.7)], ice)
airbox = [
    (0.091 * math.cos(j * math.tau / 36), 0.99 + 0.063 * math.sin(j * math.tau / 36), -0.548)
    for j in range(36)
]
patch("Airbox_dark_intake", airbox, black)
line("Airbox_lip", airbox + airbox[:1], 0.011, ice)

# Coherent halo: continuous U hoop, dropped rear mounts and a thin central pillar.
halo = [
    (
        0.295 * math.cos(i * math.pi / 48),
        1.035 - 0.035 * math.sin(i * math.pi / 48),
        -0.55 + 1.06 * math.sin(i * math.pi / 48),
    )
    for i in range(49)
]
line("Halo_hoop", halo, 0.023, ice, sides=12)
for side in (-1, 1):
    line(
        "Halo_rear_mount",
        [(side * 0.295, 1.035, -0.55), (side * 0.29, 0.89, -0.66), (side * 0.265, 0.67, -0.69)],
        0.026,
        carbon,
        sides=12,
    )
blade("Halo_central_pillar", (0, 0.61, 0.48), (0, 1.005, 0.51), 0.028, 0.011)

# Original unbranded helmet and visor sit inside the actual cockpit opening.
helmet_rings = []
for i in range(1, 28):
    theta = math.pi * i / 28
    z = -0.25 + 0.16 * math.cos(theta)
    helmet_rings.append(
        [
            (
                0.142 * math.sin(theta) * math.cos(j * math.tau / 40),
                0.79 + 0.17 * math.sin(theta) * math.sin(j * math.tau / 40),
                z,
            )
            for j in range(40)
        ]
    )
ring_skin("Driver_helmet", helmet_rings, ice)
visor_rows = []
for y in (0.794, 0.817, 0.839, 0.859):
    latitude = math.asin((y - 0.79) / 0.17)
    visor_rows.append(
        [
            (
                0.1435 * math.cos(latitude) * math.sin(a),
                0.79 + 0.1715 * math.sin(latitude),
                -0.25 + 0.1615 * math.cos(latitude) * math.cos(a),
            )
            for a in [(-1.0 + i / 12 * 2.0) for i in range(13)]
        ]
    )
mesh(
    "Helmet_visor",
    [p for row in visor_rows for p in row],
    [
        (i * 13 + j, i * 13 + j + 1, (i + 1) * 13 + j + 1, (i + 1) * 13 + j)
        for i in range(3)
        for j in range(12)
    ],
    visor,
    collection,
    root,
    True,
)
part("Steering_wheel", (0, 0.55, 0.19), (0.29, 0.105, 0.055), carbon, 0.025)
part("Steering_display", (0, 0.615, 0.175), (0.095, 0.055, 0.009), visor, 0.004)
for side in (-1, 1):
    line("Mirror_stalk", [(side * 0.26, 0.57, 0.38), (side * 0.53, 0.68, 0.38)], 0.011)
    part("Mirror_housing", (side * 0.56, 0.687, 0.36), (0.17, 0.065, 0.105), blue, 0.023)
    part("Mirror_face", (side * 0.56, 0.687, 0.305), (0.133, 0.043, 0.004), alloy, 0.002)

# Mainplane plus two flaps; three-element rear wing, no separate beam wing.
wing("Front_mainplane", 2.69, 0.13, 0.95, 0.38, 0.025, carbon, sweep=0.10, cup=0.06)
wing("Front_flap_one", 2.32, 0.185, 0.92, 0.14, 0.065, blue, sweep=0.095, cup=0.05)
wing("Front_flap_two", 2.18, 0.25, 0.90, 0.12, 0.08, ice, sweep=0.10, cup=0.04)
for side in (-1, 1):
    x = side * 0.95
    end = [(x, 0.11, 2.61), (x, 0.29, 2.55), (x, 0.36, 2.03), (x, 0.12, 2.0)]
    patch("Front_endplate", end, blue)
    line("Front_endplate_edge", end[:3], 0.008, ice)
    blade("Nose_pylon", (side * 0.06, 0.30, 2.30), (side * 0.10, 0.17, 2.38), 0.035, 0.011)
    blade("Rear_wing_support", (side * 0.16, 0.40, -1.85), (side * 0.19, 0.89, -2.11), 0.043, 0.011)
wing("Rear_mainplane", -1.99, 0.82, 0.52, 0.28, 0.035, carbon, cup=0.014)
wing("Rear_flap_one", -2.27, 0.875, 0.52, 0.135, 0.07, blue, cup=0.014)
wing("Rear_flap_two", -2.395, 0.954, 0.52, 0.115, 0.076, ice, cup=0.014)
for side in (-1, 1):
    x = side * 0.536
    end = [
        (x, 0.72, -2.01),
        (x, 0.855, -1.975),
        (x, 1.05, -2.38),
        (x, 1.055, -2.51),
        (x, 0.81, -2.51),
        (x, 0.73, -2.24),
    ]
    patch("Rear_simplified_endplate", end, blue)
    line("Rear_endplate_trim", end[1:4], 0.006, ice)
line("Exhaust", [(0, 0.43, -1.94), (0, 0.43, -2.24)], 0.043, alloy, sides=16)
line("Exhaust_bore", [(0, 0.43, -2.24), (0, 0.43, -2.249)], 0.033, black, sides=16)
part("Static_rear_safety_lamp", (0, 0.26, -2.355), (0.071, 0.093, 0.018), red, 0.008)

# Native wheel pivots, stepped slick shoulders, 18-inch-diameter rim language.
gearbox_rings = [
    [(w * math.cos(j * math.tau / 16), 0.33 + 0.092 * math.sin(j * math.tau / 16), z) for j in range(16)]
    for z, w in ((-2.15, 0.095), (-1.98, 0.12), (-1.75, 0.14), (-1.44, 0.15))
]
ring_skin("Rear_gearbox_casing", gearbox_rings, carbon)
radius, wheelbase = profile["wheelRadius"], profile["wheelbase"]
native_width = min(profile["width"] * 0.19, radius * 1.2)
wheel_x = profile["width"] / 2 - native_width / 2
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
        half = (0.30 if axle == 1 else native_width) / 2
        tyre_profile = [
            (-half, 0.23),
            (-half, 0.285),
            (-half + 0.008, 0.311),
            (-half + 0.024, 0.331),
            (-half + 0.05, radius),
            (half - 0.05, radius),
            (half - 0.024, 0.331),
            (half - 0.008, 0.311),
            (half, 0.285),
            (half, 0.23),
            (half - 0.014, 0.225),
            (-half + 0.014, 0.225),
            (-half, 0.23),
        ]
        lathe_x("Slick_tyre", tyre_profile, rubber, collection, spin, 80)
        lathe_x(
            "Rim_barrel",
            [
                (side * x, r)
                for x, r in [
                    (half - 0.09, 0.217),
                    (half - 0.09, 0.231),
                    (half - 0.01, 0.231),
                    (half + 0.006, 0.224),
                    (half + 0.008, 0.212),
                    (half - 0.015, 0.208),
                    (half - 0.07, 0.211),
                    (half - 0.09, 0.217),
                ]
            ],
            alloy,
            collection,
            spin,
            64,
        )
        for j in range(12):
            a = j * math.tau / 12
            line(
                "Forged_spoke",
                [
                    (side * (half + 0.004), 0.049 * math.cos(a), 0.049 * math.sin(a)),
                    (side * (half - 0.014), 0.211 * math.cos(a + 0.07), 0.211 * math.sin(a + 0.07)),
                ],
                0.009,
                alloy,
                spin,
                8,
            )
        lathe_x(
            "Centre_lock",
            [
                (side * x, r)
                for x, r in [
                    (half + 0.016, 0.012),
                    (half + 0.016, 0.046),
                    (half - 0.009, 0.046),
                    (half - 0.009, 0.012),
                    (half + 0.016, 0.012),
                ]
            ],
            carbon,
            collection,
            spin,
            24,
        )
        for r in (0.264, 0.295):
            lathe_x(
                "Sidewall_mould_ring",
                [(side * (half + 0.001), r - 0.0015), (side * (half + 0.001), r + 0.0015)],
                carbon,
                collection,
                spin,
                80,
            )
        lathe_x(
            "Brake_disc",
            [
                (side * x, r)
                for x, r in [
                    (half - 0.045, 0.065),
                    (half - 0.045, 0.185),
                    (half - 0.055, 0.185),
                    (half - 0.055, 0.065),
                    (half - 0.045, 0.065),
                ]
            ],
            rotor,
            collection,
            carrier,
            48,
        )
        part(
            "Brake_caliper",
            (side * (half - 0.039), 0.04, -0.142),
            (0.037, 0.11, 0.054),
            carbon,
            0.012,
            carrier,
        )
        # Front mounts meet the actual tapered nose; rear mounts use the gearbox.
        z = axle * wheelbase / 2
        for y in (0.265, 0.48):
            for longitudinal in (-0.24, 0.24):
                mount_z = z + longitudinal
                mount_y = (
                    min(y + 0.015, skin_point(body_rings, 0.085, mount_z)[1] - 0.01)
                    if axle == 1
                    else min(y, 0.405)
                )
                blade(
                    "Suspension_wishbone",
                    (side * 0.085, mount_y, mount_z),
                    (side * (wheel_x - half + 0.035), y, z),
                    0.022,
                    0.007,
                )
        blade(
            "Suspension_pushrod",
            (side * 0.085, 0.46 if axle == 1 else 0.405, z - 0.18),
            (side * (wheel_x - half), 0.23, z + 0.025),
            0.014,
            0.006,
        )
        blade(
            "Steering_link",
            (side * 0.085, 0.32, z + 0.16),
            (side * (wheel_x - half), 0.34, z + 0.10),
            0.013,
            0.006,
        )

# Fitted ice stripe: paint lies on the actual sculpted nose, not a floating plane.
line(
    "Nose_access_panel",
    [
        skin_point(body_rings, x, z, offset=0.002)
        for x, z in [(-0.11, 0.83), (-0.095, 1.27), (0.095, 1.27), (0.11, 0.83), (-0.11, 0.83)]
    ],
    0.0016,
    carbon,
    sides=6,
)
rows = [0.63 + (2.37 - 0.63) * i / 60 for i in range(61)]
mesh(
    "Nose_ice_stripe",
    [skin_point(body_rings, x, z, offset=0.0025) for z in rows for x in (-0.033, 0.033)],
    [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(60)],
    ice,
    collection,
    root,
    True,
)

# Original stroke lettering on the front wing's actual upper aerofoil surface.
glyphs = {
    "L": [[(0, 1), (0, 0), (0.6, 0)]],
    "A": [[(0, 0), (0.3, 1), (0.6, 0)], [(0.12, 0.4), (0.48, 0.4)]],
    "P": [[(0, 0), (0, 1), (0.6, 1), (0.6, 0.55), (0, 0.55)]],
    "T": [[(0, 1), (0.6, 1)], [(0.3, 1), (0.3, 0)]],
    "R": [[(0, 0), (0, 1), (0.6, 1), (0.6, 0.55), (0, 0.55)], [(0.25, 0.55), (0.6, 0)]],
    "I": [[(0.3, 0), (0.3, 1)]],
    "X": [[(0, 0), (0.6, 1)], [(0, 1), (0.6, 0)]],
}
for i, char in enumerate("LAPTRIX"):
    for stroke in glyphs[char]:
        points = []
        for x, y in stroke:
            x = (x + i * 0.8 - 2.7) * 0.073
            u = abs(x / 0.95)
            t = 0.21 + y * 0.21
            top = (
                0.13
                + 0.06 * u * u
                + 0.025 * t
                + 0.018 * 4 * t * (1 - t)
                + 0.014 * (0.04 + math.sin(math.pi * t) ** 0.7)
            )
            points.append((x, top + 0.0025, 2.69 - 0.10 * u * u - 0.38 * (1 - 0.12 * u * u) * t))
        line("LAPTRIX_stencil_" + char, points, 0.0018, ice, sides=6)

consolidate(collection)
bpy.context.view_layer.update()
positions = [
    to_runtime(obj.matrix_world @ vertex.co)
    for obj in collection.objects
    if obj.type == "MESH"
    for vertex in obj.data.vertices
]
print(
    "Authored bounds:",
    [min(p[i] for p in positions) for i in range(3)],
    [max(p[i] for p in positions) for i in range(3)],
)
scene.world = bpy.data.worlds.new("Authoring daylight")
scene.world.color = (0.15, 0.15, 0.15)
save_editable(config)
print(f"Authored original Formula 2026: {config['sourceFile']}")
