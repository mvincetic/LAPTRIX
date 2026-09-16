"""Original, periodic ground material art with packed web-compatible PNG maps.

No downloaded imagery is used. Explicit authoring can rebuild these maps; ordinary
export retains the editable Blender source and any subsequent texture painting.
"""

import bpy
import numpy as np
from contract import to_runtime
from modeling import material


def noise(size, cells, seed):
    """Periodic smooth value field: neighbors wrap across the physical tile."""
    grid = np.random.default_rng(seed).random((cells, cells))
    coordinate = np.arange(size) * cells / size
    index = np.floor(coordinate).astype(int)
    blend = coordinate - index
    blend = blend**3 * (blend * (blend * 6 - 15) + 10)
    a = grid[index[:, None] % cells, index[None, :] % cells]
    b = grid[index[:, None] % cells, (index[None, :] + 1) % cells]
    c = grid[(index[:, None] + 1) % cells, index[None, :] % cells]
    d = grid[(index[:, None] + 1) % cells, (index[None, :] + 1) % cells]
    return (a * (1 - blend)[None, :] + b * blend[None, :]) * (1 - blend)[:, None] + (
        c * (1 - blend)[None, :] + d * blend[None, :]
    ) * blend[:, None]


def packed_image(name, rgb, color=True):
    if rgb.ndim != 3 or rgb.shape[2] != 3 or not np.isfinite(rgb).all():
        raise ValueError("Original material pixels must be finite RGB")
    height, width = rgb.shape[:2]
    image = bpy.data.images.new(name, width=width, height=height, alpha=False)
    image.colorspace_settings.name = "sRGB" if color else "Non-Color"
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(rgb, 0, 1)
    image.pixels.foreach_set(rgba.ravel())
    image.file_format = "PNG"
    image.filepath_raw = f"//textures/{name}.png"
    image.pack()
    image["provenance"] = "Original LAPTRIX periodic material art; no external imagery"
    return image


def normal_pixels(height_metres, tile_metres):
    pixel_metres = tile_metres / height_metres.shape[0]
    dx = (np.roll(height_metres, -1, axis=1) - np.roll(height_metres, 1, axis=1)) / (2 * pixel_metres)
    dv = (np.roll(height_metres, -1, axis=0) - np.roll(height_metres, 1, axis=0)) / (2 * pixel_metres)
    vectors = np.stack([-dx, -dv, np.ones_like(dx)], axis=-1)
    vectors /= np.linalg.norm(vectors, axis=-1, keepdims=True)
    return vectors * 0.5 + 0.5


def textured(name, base, normal, roughness, tile_metres, display_color):
    result = material(name, (1, 1, 1), roughness)
    result.diffuse_color = (*display_color, 1)
    result["laptrix_tile_metres"] = tile_metres
    result["provenance"] = "Original LAPTRIX baked surface study"
    nodes, links = result.node_tree.nodes, result.node_tree.links
    shader = nodes.get("Principled BSDF")
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "RuntimeGroundUV"
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = base
    texture.extension = "REPEAT"
    links.new(uv.outputs["UV"], texture.inputs["Vector"])
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    if normal:
        image = nodes.new("ShaderNodeTexImage")
        image.image = normal
        image.extension = "REPEAT"
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.uv_map = uv.uv_map
        normal_map.inputs["Strength"].default_value = 1
        links.new(uv.outputs["UV"], image.inputs["Vector"])
        links.new(image.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    return result


def ground_materials():
    size = 512
    aggregate = noise(size, 128, 1163)
    fine = np.random.default_rng(3917).random((size, size))
    binder = noise(size, 16, 8369)
    # Fine aggregate varies quietly around dry grey asphalt, without large black
    # spots or baked directional lighting. At 2 m per tile, pixels span 3.9 mm.
    tone = 0.206 + (aggregate - 0.5) * 0.055 + (fine - 0.5) * 0.032
    tone += (binder - 0.5) * 0.012
    asphalt = packed_image("LTX_Asphalt_Color", np.stack([tone * 0.96, tone, tone * 1.035], -1))
    normal_height = (noise(256, 96, 1163) - 0.5) * 0.0007
    asphalt_normal = packed_image("LTX_Asphalt_Normal", normal_pixels(normal_height, 2), color=False)

    size = 256
    # Low-frequency variation lives in editable landscape vertex paint. Keeping
    # this repeated map fine and restrained avoids a visible eight-metre grid.
    patch = noise(size, 32, 2237) * 0.4 + noise(size, 128, 7489) * 0.6
    flecks = np.random.default_rng(8353).random((size, size)) - 0.5
    grass = packed_image(
        "LTX_Grass_Color",
        np.array([0.32, 0.365, 0.22]) + patch[:, :, None] * 0.04 + flecks[:, :, None] * 0.016,
    )
    grass_height = (noise(256, 96, 8363) - 0.5) * 0.005
    grass_normal = packed_image("LTX_Grass_Normal", normal_pixels(grass_height, 8), color=False)

    stones = noise(256, 83, 1471)
    dust = np.random.default_rng(3067).random((256, 256))
    gravel_tone = 0.405 + stones * 0.115 + (dust - 0.5) * 0.032
    gravel = packed_image(
        "LTX_Gravel_Color", np.stack([gravel_tone * 1.075, gravel_tone * 1.015, gravel_tone * 0.89], -1)
    )
    return {
        "asphalt": textured("RBR_PitAsphalt", asphalt, asphalt_normal, 0.9, 2, (0.20, 0.206, 0.213)),
        "grass": textured("RBR_Grass", grass, grass_normal, 0.99, 8, (0.34, 0.385, 0.24)),
        "gravel": textured("RBR_Gravel", gravel, asphalt_normal, 0.99, 2, (0.5, 0.473, 0.42)),
    }


def world_uv(obj, tile_metres):
    """Only UVs change: source positions, indices, transforms and normals stay intact."""
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    uv = obj.data.uv_layers.new(name="RuntimeGroundUV")
    for loop in obj.data.loops:
        point = to_runtime(obj.matrix_world @ obj.data.vertices[loop.vertex_index].co)
        uv.data[loop.index].uv = (point[0] / tile_metres, point[2] / tile_metres)
