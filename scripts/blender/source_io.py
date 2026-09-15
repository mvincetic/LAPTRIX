"""Portable editable-source save conventions; geometry stays in Blender's own writer."""

import bpy
from contract import owned_path


def save_editable(config):
    # Factory workspaces can retain the user's Documents directory in an inactive
    # Shading file browser. Clear the whole fixed string before setting a relative path.
    for screen in bpy.data.screens:
        for area in screen.areas:
            for space in area.spaces:
                params = getattr(space, "params", None) if space.type == "FILE_BROWSER" else None
                if params is not None and hasattr(params, "directory"):
                    params.directory = b"/" * 1023
                    params.directory = b"//"
    bpy.context.scene.render.filepath = "//preview"
    path = owned_path(config["sourceFile"])
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path), check_existing=False, compress=False)
