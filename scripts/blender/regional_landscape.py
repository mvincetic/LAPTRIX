"""Editable Blender landscape with shared packed grass maps and original vertex art."""

from modeling import mesh
from regional_geometry import landscape_geometry
from surface_materials import world_uv


def author_landscape(context, regional, settings, grass, collection, root):
    positions, faces, colors = landscape_geometry(context, regional, settings)
    material = grass.copy()
    material.name = settings["material"]
    material["provenance"] = "Original meadow/forest color interpretation; not surveyed land cover"
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get("Principled BSDF")
    base = next(node for node in nodes if node.type == "TEX_IMAGE" and node.image.name == "LTX_Grass_Color")
    vertex_color = nodes.new("ShaderNodeVertexColor")
    vertex_color.layer_name = "RegionalPalette"
    multiply = nodes.new("ShaderNodeMix")
    multiply.data_type = "RGBA"
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1
    links.new(base.outputs["Color"], next(i for i in multiply.inputs if i.name == "A" and i.type == "RGBA"))
    links.new(
        vertex_color.outputs["Color"], next(i for i in multiply.inputs if i.name == "B" and i.type == "RGBA")
    )
    links.new(
        next(output for output in multiply.outputs if output.type == "RGBA"), shader.inputs["Base Color"]
    )
    obj = mesh(settings["node"], positions.tolist(), faces.tolist(), material, collection, root, True)
    palette = obj.data.color_attributes.new(name="RegionalPalette", type="FLOAT_COLOR", domain="POINT")
    for datum, color in zip(palette.data, colors, strict=True):
        datum.color = (*color, 1)
    obj["purpose"] = (
        "Continuous visual ground; unchanged protected foreground and source-derived distant relief"
    )
    obj["protected_distance_metres"] = settings["protectedDistance"]
    world_uv(obj, grass["laptrix_tile_metres"])
    return obj
