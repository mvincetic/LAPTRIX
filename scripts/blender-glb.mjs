import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export async function ownedAssetPath(root, value) {
  assert(typeof value === "string" && value && !isAbsolute(value));
  assert(
    !value.includes("\\") && !/^[a-z]:/i.test(value),
    "Use repository-relative POSIX paths",
  );
  const path = await realpath(resolve(root, value));
  const suffix = relative(root, path);
  assert(
    !isAbsolute(suffix) && !suffix.startsWith(".."),
    "Asset path escapes the repository",
  );
  return path;
}
const finite = (values) =>
  assert(values.every(Number.isFinite), "Nonfinite GLB data");
const near = (actual, expected, tolerance, label) => {
  assert.equal(actual.length, expected.length, label);
  finite(actual);
  assert(
    actual.every((v, i) => Math.abs(v - expected[i]) <= tolerance),
    `${label} differs`,
  );
};
const rounded = (values, precision = 1e6) =>
  values.map((v) => Math.round(v * precision) / precision);
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};

/** Independent binary/geometry checks; no DOM or image decoder is needed in CI. */
export function inspectBlenderGlb(bytes, config) {
  assert(
    bytes.length >= 28 && bytes.length <= config.maxBytes,
    "GLB byte budget",
  );
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length);
    const length = bytes.readUInt32LE(offset),
      type = bytes.readUInt32LE(offset + 4);
    assert(
      length % 4 === 0 && offset + 8 + length <= bytes.length,
      "Invalid GLB chunk",
    );
    chunks.push({
      type,
      data: bytes.subarray(offset + 8, offset + 8 + length),
    });
    offset += 8 + length;
  }
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].type, 0x4e4f534a);
  assert.equal(chunks[1].type, 0x004e4942);
  const json = JSON.parse(chunks[0].data.toString("utf8"));
  function finiteJson(value) {
    if (typeof value === "number")
      assert(Number.isFinite(value), "Nonfinite GLB metadata");
    else if (value && typeof value === "object")
      Object.values(value).forEach(finiteJson);
  }
  finiteJson(json);
  const bin = chunks[1].data;
  assert.equal(json.asset.version, "2.0");
  assert.equal(json.buffers.length, 1);
  assert(!json.buffers[0].uri && json.buffers[0].byteLength <= bin.length);
  assert(bin.length - json.buffers[0].byteLength < 4);
  for (const name of ["animations", "skins", "cameras", "extensionsRequired"])
    assert.equal(json[name]?.length ?? 0, 0, `Unsupported ${name}`);
  const supported = [
    "KHR_materials_clearcoat",
    "KHR_materials_ior",
    "KHR_materials_specular",
    "KHR_materials_emissive_strength",
  ];
  assert(
    (json.extensionsUsed ?? []).every((name) => supported.includes(name)),
    "Unsupported GLB extension",
  );
  assert.equal(json.scenes.length, 1);
  assert.equal(json.scene, 0);
  assert.equal(json.scenes[0].nodes.length, 1);
  assert(json.nodes.length > 0 && json.nodes.length <= 512);
  assert(json.meshes.length > 0 && json.meshes.length <= config.maxMeshes);
  assert(
    (json.materials?.length ?? 0) > 0 &&
      json.materials.length <= config.maxMaterials,
  );
  assert((json.images?.length ?? 0) <= config.maxTextures);
  assert((json.textures?.length ?? 0) <= config.maxTextures);
  const bufferView = (index) => {
    const view = json.bufferViews[index];
    assert(
      view &&
        view.buffer === 0 &&
        Number.isInteger(view.byteLength) &&
        view.byteLength > 0,
    );
    const start = view.byteOffset ?? 0;
    assert(
      Number.isInteger(start) &&
        start >= 0 &&
        start + view.byteLength <= json.buffers[0].byteLength,
    );
    return { view, data: bin.subarray(start, start + view.byteLength) };
  };
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const formats = {
    5120: [1, "readInt8"],
    5121: [1, "readUInt8"],
    5122: [2, "readInt16LE"],
    5123: [2, "readUInt16LE"],
    5125: [4, "readUInt32LE"],
    5126: [4, "readFloatLE"],
  };
  const accessor = (index) => {
    const source = json.accessors[index];
    assert(
      source &&
        !source.sparse &&
        widths[source.type] &&
        formats[source.componentType],
    );
    assert(
      Number.isInteger(source.count) &&
        source.count > 0 &&
        source.count <= 1000000,
    );
    const { view, data } = bufferView(source.bufferView);
    const [size, read] = formats[source.componentType],
      width = widths[source.type];
    const stride = view.byteStride ?? size * width,
      start = source.byteOffset ?? 0;
    assert(Number.isInteger(start) && start >= 0 && start % size === 0);
    assert(
      Number.isInteger(stride) && stride >= size * width && stride % size === 0,
    );
    assert(start + (source.count - 1) * stride + size * width <= data.length);
    const values = Array.from({ length: source.count * width }, (_, i) =>
      data[read](start + Math.floor(i / width) * stride + (i % width) * size),
    );
    finite(values);
    return { ...source, values, width };
  };
  const geometry = json.meshes.map((mesh) =>
    mesh.primitives.map((primitive) => {
      assert.equal(
        primitive.mode ?? 4,
        4,
        "Only triangle meshes are supported",
      );
      assert(!primitive.targets && !primitive.extensions);
      assert(json.materials[primitive.material], "Missing primitive material");
      const position = accessor(primitive.attributes.POSITION),
        normal = accessor(primitive.attributes.NORMAL);
      assert.equal(position.type, "VEC3");
      assert.equal(position.componentType, 5126);
      assert.equal(normal.type, "VEC3");
      assert.equal(normal.componentType, 5126);
      assert.equal(normal.count, position.count);
      const indices = accessor(primitive.indices);
      assert.equal(indices.type, "SCALAR");
      assert(
        [5121, 5123, 5125].includes(indices.componentType) &&
          !indices.normalized,
      );
      assert(indices.values.length % 3 === 0);
      assert(
        indices.values.every((i) => i >= 0 && i < position.count),
        "Out-of-range index",
      );
      for (let i = 0; i < normal.values.length; i += 3)
        assert(
          Math.abs(Math.hypot(...normal.values.slice(i, i + 3)) - 1) < 0.001,
          "Invalid normal",
        );
      const a = new Vector3(),
        b = new Vector3(),
        c = new Vector3();
      for (let i = 0; i < indices.values.length; i += 3) {
        a.fromArray(position.values, indices.values[i] * 3);
        b.fromArray(position.values, indices.values[i + 1] * 3).sub(a);
        c.fromArray(position.values, indices.values[i + 2] * 3).sub(a);
        assert(b.cross(c).lengthSq() > 1e-24, "Degenerate GLB triangle");
      }
      const attributes = Object.fromEntries(
        Object.entries(primitive.attributes)
          .sort()
          .map(([name, index]) => {
            assert(
              [
                "POSITION",
                "NORMAL",
                "TANGENT",
                "TEXCOORD_0",
                "TEXCOORD_1",
                "COLOR_0",
              ].includes(name),
            );
            const data = accessor(index);
            assert.equal(data.count, position.count);
            return [
              name,
              {
                type: data.type,
                normalized: data.normalized ?? false,
                componentType: data.componentType,
                values: rounded(data.values, name === "NORMAL" ? 1e5 : 1e6),
              },
            ];
          }),
      );
      return {
        material: primitive.material,
        attributes,
        indices: indices.values,
        position: position.values,
        triangles: indices.values.length / 3,
      };
    }),
  );
  const bounds = new Box3(),
    point = new Vector3(),
    names = new Set(),
    visited = new Set();
  const nodeRecords = [],
    namedPositions = {};
  let triangles = 0,
    primitives = 0;
  function visit(index, parent) {
    const node = json.nodes[index];
    assert(node && !visited.has(index), "Invalid or repeated hierarchy node");
    assert(node.name && !names.has(node.name), "Node names must be unique");
    assert(
      node.skin === undefined &&
        node.camera === undefined &&
        !node.weights &&
        !node.extensions,
    );
    visited.add(index);
    names.add(node.name);
    const local = new Matrix4();
    if (node.matrix) {
      assert.equal(node.matrix.length, 16);
      finite(node.matrix);
      local.fromArray(node.matrix);
    } else {
      const translation = node.translation ?? [0, 0, 0],
        rotation = node.rotation ?? [0, 0, 0, 1],
        scale = node.scale ?? [1, 1, 1];
      assert(
        translation.length === 3 && rotation.length === 4 && scale.length === 3,
      );
      finite(translation);
      finite(rotation);
      near(scale, [1, 1, 1], 1e-6, "Node scale");
      assert(Math.abs(Math.hypot(...rotation) - 1) < 1e-6);
      local.compose(
        new Vector3().fromArray(translation),
        new Quaternion().fromArray(rotation),
        new Vector3().fromArray(scale),
      );
    }
    near(
      [
        local.elements[3],
        local.elements[7],
        local.elements[11],
        local.elements[15],
      ],
      [0, 0, 0, 1],
      1e-7,
      "Affine node transform",
    );
    const basis = [0, 1, 2].map((axis) =>
      new Vector3().setFromMatrixColumn(local, axis),
    );
    for (let a = 0; a < 3; a++)
      for (let b = a; b < 3; b++)
        assert(
          Math.abs(basis[a].dot(basis[b]) - (a === b ? 1 : 0)) < 1e-6,
          "Node axes must be orthonormal at metre scale",
        );
    const world = parent.clone().multiply(local);
    assert(
      Math.abs(world.determinant() - 1) < 1e-5,
      "Unexpected scale, mirror or singular transform",
    );
    const position = new Vector3().setFromMatrixPosition(world).toArray();
    namedPositions[node.name] = position;
    nodeRecords.push({
      name: node.name,
      matrix: rounded(local.elements),
      mesh: node.mesh ?? null,
      children: (node.children ?? []).map((child) => json.nodes[child]?.name),
      extras: node.extras ?? null,
    });
    if (node.mesh !== undefined) {
      assert(geometry[node.mesh]);
      for (const primitive of geometry[node.mesh]) {
        primitives++;
        triangles += primitive.triangles;
        for (let i = 0; i < primitive.position.length; i += 3)
          bounds.expandByPoint(
            point.fromArray(primitive.position, i).applyMatrix4(world),
          );
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  const rootIndex = json.scenes[0].nodes[0];
  assert.equal(json.nodes[rootIndex].name, config.rootNode);
  visit(rootIndex, new Matrix4());
  near(nodeRecords[0].matrix, new Matrix4().elements, 1e-6, "Asset root");
  assert.equal(visited.size, json.nodes.length, "Orphaned GLB node");
  assert(
    triangles > 0 &&
      triangles <= config.maxTriangles &&
      primitives <= config.maxMeshes,
  );
  for (const [name, expected] of Object.entries(config.requiredNodes))
    near(
      namedPositions[name] ?? [],
      expected,
      config.bounds.tolerance,
      `${name} pivot`,
    );
  near(
    bounds.min.toArray(),
    config.bounds.min,
    config.bounds.tolerance,
    "Minimum bounds",
  );
  near(
    bounds.max.toArray(),
    config.bounds.max,
    config.bounds.tolerance,
    "Maximum bounds",
  );
  const images = (json.images ?? []).map((image) => {
    assert(!image.uri && image.mimeType === "image/png", "Embed PNG textures");
    const { data } = bufferView(image.bufferView);
    assert.equal(data.toString("hex", 0, 8), "89504e470d0a1a0a");
    const width = data.readUInt32BE(16),
      height = data.readUInt32BE(20);
    assert(
      width > 0 &&
        height > 0 &&
        Math.max(width, height) <= config.maxTextureSize,
    );
    return { sha256: sha256(data), width, height, bytes: data.length };
  });
  const semantic = canonical({
    nodes: nodeRecords.sort((a, b) => a.name.localeCompare(b.name)),
    meshes: geometry.map((primitives) =>
      primitives.map(({ material, attributes, indices }) => ({
        material,
        attributes,
        indices,
      })),
    ),
    materials: json.materials,
    images,
    textures: json.textures ?? [],
    samplers: json.samplers ?? [],
  });
  return {
    bytes: bytes.length,
    triangles,
    primitives,
    materials: json.materials.length,
    nodes: namedPositions,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    images,
    semanticSha256: sha256(JSON.stringify(semantic)),
  };
}

export async function validateBlenderEntry(root, entry) {
  assert.equal(entry.format, "blender-glb");
  assert(
    ["validation", "vehicles", "environment", "trackside", "tracks"].includes(
      entry.category,
    ),
  );
  const config = JSON.parse(
    await readFile(await ownedAssetPath(root, entry.parameters), "utf8"),
  );
  assert.equal(config.id, entry.id);
  for (const field of ["sourceFile", "runtimeFile", "maxBytes", "maxTriangles"])
    assert.equal(entry[field], config[field]);
  if (config.authoringContext) {
    assert.equal(entry.authoringContext, config.authoringContext);
    const contextBytes = await readFile(
      await ownedAssetPath(root, config.authoringContext),
    );
    assert.equal(
      sha256(contextBytes),
      config.authoringContextSha256,
      "Authoring context hash differs",
    );
    const context = JSON.parse(contextBytes.toString("utf8"));
    assert.equal(context.sourceFingerprint, config.sourceFingerprint);
    assert.equal(entry.sourceFingerprint, config.sourceFingerprint);
    assert.deepEqual(entry.thirdPartySources, context.attribution.sources);
    const runtimeBytes = await readFile(
      await ownedAssetPath(root, entry.runtimeFile),
    );
    const json = JSON.parse(
      runtimeBytes.toString("utf8", 20, 20 + runtimeBytes.readUInt32LE(12)),
    );
    const extras = json.nodes.find((n) => n.name === config.rootNode)?.extras;
    assert.equal(extras?.source_fingerprint, config.sourceFingerprint);
    assert.equal(
      extras?.authoring_context_sha256,
      config.authoringContextSha256,
    );
    assert.deepEqual(
      JSON.parse(extras?.source_credits ?? "null"),
      entry.thirdPartySources,
    );
  }
  const source = await readFile(await ownedAssetPath(root, entry.sourceFile));
  assert(
    !/[a-z]:[\\/]Users[\\/]|\/(?:Users|home)\//i.test(source.toString("utf8")),
    "Remove machine-specific source paths using the portable Blender save conventions",
  );
  const runtime = await readFile(await ownedAssetPath(root, entry.runtimeFile));
  assert.equal(
    source.toString("ascii", 0, 7),
    "BLENDER",
    "Retain an uncompressed editable .blend",
  );
  assert.equal(
    sha256(source),
    entry.sourceSha256,
    "Blender source changed; export it before committing",
  );
  assert.equal(sha256(runtime), entry.sha256, "Runtime GLB hash differs");
  const report = inspectBlenderGlb(runtime, config);
  assert.equal(report.semanticSha256, entry.semanticSha256);
  assert.equal(report.primitives, entry.materialBatches);
  return report;
}
