"""Open editable source, validate it and export GLB without regenerating the art."""

import argparse
import json
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from contract import asset_config, owned_path  # noqa: E402
from validate_scene import validate_scene  # noqa: E402

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--asset", required=True)
parser.add_argument("--output", required=True, help="Repository-relative temporary GLB path")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
entry, config = asset_config(args.asset)
report, objects = validate_scene(config)
output = owned_path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
if output.suffix != ".glb":
    raise ValueError("Export must use a .glb destination")
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.hide_set(False)
    obj.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects[config["rootNode"]]
bpy.ops.export_scene.gltf(
    filepath=str(output),
    check_existing=False,
    export_format="GLB",
    use_selection=True,
    export_yup=True,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_cameras=False,
    export_lights=False,
    export_extras=True,
    export_gpu_instances=False,
    export_draco_mesh_compression_enable=False,
    export_meshopt_compression_enable=False,
    export_hierarchy_flatten_objs=False,
    will_save_settings=False,
    export_copyright=entry["rights"],
)
report["bytes"] = output.stat().st_size
if report["bytes"] > config["maxBytes"]:
    raise ValueError("GLB exceeds its byte budget")
output.with_suffix(".report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Validated and exported {args.asset}: {report['triangles']} triangles, {report['bytes']} bytes")
