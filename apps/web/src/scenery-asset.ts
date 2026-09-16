import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector3,
} from "three";
import url from "../../../assets/runtime/tracks/red-bull-ring-slice.glb?url";
import contract from "../../../assets/blender/tracks/red-bull-ring-slice.json";
import type { GroundFootprint } from "./vegetation-clearance";

let cached: Promise<Group> | undefined;
export { contract as rbrSceneryContract };

export function sceneryFootprints(scene: Group): GroundFootprint[] {
  return scene.userData.vegetationFootprints;
}

export function sceneryGroundMaterials(scene: Group) {
  const found = new Map<string, MeshStandardMaterial>();
  scene.traverse((node) => {
    if (node instanceof Mesh && node.material instanceof MeshStandardMaterial)
      found.set(node.material.name, node.material);
  });
  const get = (key: keyof typeof contract.groundMaterials) => {
    const spec = contract.groundMaterials[key],
      material = found.get(spec.name);
    if (
      !material?.map ||
      !material.normalMap ||
      material.userData.laptrix_tile_metres !== spec.tileMetres
    )
      throw new Error("Scenery ground material contract differs");
    // Bounded grazing-angle detail; WebGL clamps this to the device capability.
    material.map.anisotropy = 4;
    material.normalMap.anisotropy = 4;
    return material;
  };
  return {
    asphalt: get("asphalt"),
    grass: get("grass"),
    gravel: get("gravel"),
  };
}

/** Reject external images and oversized decoded surfaces before invoking a loader. */
export function validateSceneryContainer(bytes: Uint8Array) {
  if (bytes.byteLength < 28 || bytes.byteLength > contract.maxBytes)
    throw new Error("Incomplete or oversized scenery container");
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    size = header.getUint32(12, true),
    binHeader = 20 + size;
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== bytes.length ||
    header.getUint32(16, true) !== 0x4e4f534a ||
    size % 4 !== 0 ||
    binHeader + 8 > bytes.length ||
    header.getUint32(binHeader + 4, true) !== 0x004e4942 ||
    binHeader + 8 + header.getUint32(binHeader, true) !== bytes.length
  )
    throw new Error("Invalid scenery container");
  const json = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, binHeader)),
  );
  const binSize = header.getUint32(binHeader, true);
  if (
    json.animations?.length ||
    json.skins?.length ||
    json.buffers?.length !== 1 ||
    json.buffers[0].uri ||
    json.extensionsRequired?.length ||
    !Number.isInteger(json.buffers[0].byteLength) ||
    json.buffers[0].byteLength > binSize ||
    binSize - json.buffers[0].byteLength > 3 ||
    json.images?.length !== contract.maxImages ||
    json.textures?.length !== contract.maxTextures
  )
    throw new Error("Unsupported scenery dependencies");
  for (const image of json.images) {
    const view = json.bufferViews?.[image.bufferView],
      start = view?.byteOffset ?? 0;
    if (
      image.uri ||
      image.mimeType !== "image/png" ||
      !Number.isInteger(image.bufferView) ||
      !view ||
      view.buffer !== 0 ||
      !Number.isInteger(start) ||
      start < 0 ||
      !Number.isInteger(view.byteLength) ||
      view.byteLength < 33 ||
      start + view.byteLength > json.buffers[0].byteLength
    )
      throw new Error("Invalid embedded scenery image");
    const offset = binHeader + 8 + start;
    if (
      header.getUint32(offset) !== 0x89504e47 ||
      header.getUint32(offset + 4) !== 0x0d0a1a0a ||
      header.getUint32(offset + 8) !== 13 ||
      header.getUint32(offset + 12) !== 0x49484452 ||
      [header.getUint32(offset + 16), header.getUint32(offset + 20)].some(
        (n) => n < 1 || n > contract.maxTextureSize,
      )
    )
      throw new Error("Invalid or oversized scenery PNG");
  }
  for (const texture of json.textures) {
    if (
      !Number.isInteger(texture.source) ||
      !json.images[texture.source] ||
      texture.extensions
    )
      throw new Error("Unsupported scenery texture");
  }
}

export function disposeRejectedScenery(scene: Group) {
  const textures = new Set<Texture>(),
    materials = new Set<MeshStandardMaterial>();
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
    }
  });
  textures.forEach((texture) => {
    texture.dispose();
    const bitmap = texture.source.data;
    if (
      bitmap &&
      typeof bitmap === "object" &&
      "close" in bitmap &&
      typeof bitmap.close === "function"
    )
      bitmap.close();
  });
  materials.forEach((material) => material.dispose());
}

export function validateRBRScenery(scene: Group) {
  scene.updateMatrixWorld(true);
  const root = scene.getObjectByName(contract.rootNode);
  if (
    !root ||
    root.userData.source_fingerprint !== contract.sourceFingerprint ||
    root.userData.authoring_context_sha256 !== contract.authoringContextSha256
  )
    throw new Error("Scenery source frame differs");
  const footprints = JSON.parse(root.userData.vegetation_exclusions ?? "null");
  if (
    !Array.isArray(footprints) ||
    footprints.length !== 12 ||
    footprints.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 4 ||
        p.some(
          (v) =>
            !Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite),
        ),
    )
  )
    throw new Error("Scenery vegetation footprints differ");
  scene.userData.vegetationFootprints = footprints;
  for (const [name, xyz] of Object.entries(contract.requiredNodes)) {
    const node = scene.getObjectByName(name);
    if (
      !node ||
      node.getWorldPosition(new Vector3()).distanceTo(new Vector3(...xyz)) >
        0.002
    )
      throw new Error("Scenery anchor differs");
  }
  let triangles = 0,
    meshes = 0;
  scene.traverse((node) => {
    if (
      !node.matrixWorld.elements.every(Number.isFinite) ||
      node.scale.distanceTo(new Vector3(1, 1, 1)) > 1e-6
    )
      throw new Error("Invalid scenery transform");
    if (!(node instanceof Mesh)) return;
    if (!(node.material instanceof MeshStandardMaterial))
      throw new Error("Invalid scenery material");
    const positions = node.geometry.getAttribute("position");
    if (!positions || !Array.from(positions.array).every(Number.isFinite))
      throw new Error("Invalid scenery positions");
    triangles += (node.geometry.index?.count ?? positions.count) / 3;
    meshes++;
    const shadowOnly = node.name === "SHADOW_CASTERS_LOD0";
    node.castShadow = shadowOnly;
    node.receiveShadow = !shadowOnly;
    node.material.colorWrite = !shadowOnly;
    node.material.depthWrite = !shadowOnly;
  });
  if (
    triangles < 1 ||
    triangles > contract.maxTriangles ||
    meshes > contract.maxMeshes
  )
    throw new Error("Scenery geometry budget exceeded");
  const box = new Box3().setFromObject(scene);
  if (
    box.min.distanceTo(new Vector3(...contract.bounds.min)) > 0.004 ||
    box.max.distanceTo(new Vector3(...contract.bounds.max)) > 0.004
  )
    throw new Error("Scenery bounds differ");
  sceneryGroundMaterials(scene);
  return scene;
}

/** One optional, owned source-aligned package. A failed request is retryable on remount. */
export function loadRBRScenery() {
  if (cached) return cached;
  cached = (async () => {
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error("Scenery download unavailable");
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > contract.maxBytes)
          throw new Error("Scenery download budget exceeded");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    if (length < 20) throw new Error("Incomplete scenery container");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    validateSceneryContainer(bytes);
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    try {
      return validateRBRScenery(gltf.scene);
    } catch (error) {
      disposeRejectedScenery(gltf.scene);
      throw error;
    }
  })().catch((error) => {
    cached = undefined;
    throw error;
  });
  return cached;
}
