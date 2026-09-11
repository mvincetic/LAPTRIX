import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { buildDevStartPylon } from "../assets/trackside/dev-start-pylon.mjs";

// GLTFExporter's binary-only path reads in-memory Blobs through FileReader.
// Keep the exporter unchanged; no DOM, image canvas or browser dependency is needed.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
assert(process.argv.slice(2).every((argument) => argument === "--check"));
const output = new URL(
  "../assets/trackside/dev-start-pylon.glb",
  import.meta.url,
);
const model = buildDevStartPylon();
try {
  const binary = Buffer.from(
    await new GLTFExporter().parseAsync(model, { binary: true }),
  );
  if (process.argv.includes("--check")) {
    assert(
      binary.equals(await readFile(output)),
      "The pylon GLB differs from its editable source. Run npm run export:assets.",
    );
    console.log(`Verified reproducible GLB export (${binary.length} bytes).`);
  } else {
    await writeFile(output, binary);
    console.log(`Exported original Dev Track pylon (${binary.length} bytes).`);
  }
} finally {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    object.material.dispose();
  });
}
