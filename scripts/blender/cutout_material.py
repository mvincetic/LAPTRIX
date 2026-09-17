"""Validate the exact image-alpha threshold that glTF exports as a MASK material."""

import hashlib

from contract import owned_path


def validate_cutout(material, spec):
    nodes = list(material.node_tree.nodes)
    expected = {
        "ShaderNodeOutputMaterial",
        "ShaderNodeBsdfPrincipled",
        "ShaderNodeTexImage",
        "ShaderNodeMath",
    }
    if len(nodes) != 4 or {node.bl_idname for node in nodes} != expected:
        raise ValueError("Cutout needs one image, threshold, Principled shader and output")
    by_type = {node.bl_idname: node for node in nodes}
    image = by_type["ShaderNodeTexImage"]
    threshold = by_type["ShaderNodeMath"]
    shader = by_type["ShaderNodeBsdfPrincipled"]
    output = by_type["ShaderNodeOutputMaterial"]
    cutoff = spec["alphaCutoff"]
    if (
        not 0 < cutoff < 1
        or threshold.operation != "GREATER_THAN"
        or threshold.use_clamp
        or threshold.inputs[1].is_linked
        or abs(threshold.inputs[1].default_value - cutoff) > 1e-7
        or material.use_backface_culling
        or image.inputs["Vector"].is_linked
        or image.interpolation != "Linear"
    ):
        raise ValueError("Retain the declared double-sided image cutout and threshold")

    def linked(target, source):
        return len(target.links) == 1 and target.links[0].from_socket == source

    if (
        not linked(threshold.inputs[0], image.outputs["Alpha"])
        or not linked(shader.inputs["Alpha"], threshold.outputs[0])
        or not linked(shader.inputs["Base Color"], image.outputs["Color"])
        or not linked(output.inputs["Surface"], shader.outputs[0])
    ):
        raise ValueError("Cutout alpha/color must use the declared image and threshold")
    pixels = image.image
    raw = owned_path(spec["textureFile"]).read_bytes()
    if (
        hashlib.sha256(raw).hexdigest() != spec["textureSha256"]
        or not pixels
        or not pixels.packed_file
        or pixels.packed_file.data != raw
        or pixels.colorspace_settings.name != "sRGB"
    ):
        raise ValueError("Retain the pinned original cutout PNG in the editable source")
