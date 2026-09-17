import {
  Box3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";
import url from "../../../assets/runtime/environment/spruce.glb?url";
import contract from "../../../assets/blender/shared/spruce.json";
import { disposeRejectedScenery } from "./scenery-asset";

type SpruceMesh = Mesh<BufferGeometry, MeshStandardMaterial>;
export type SpruceTemplate = { crown: SpruceMesh; trunk: SpruceMesh };
let cached: Promise<SpruceTemplate> | undefined;
export const hasAuthoredSpruce = (fingerprint?: string) =>
  Boolean(fingerprint && contract.sourceFingerprints.includes(fingerprint));

/** Bound dependencies and decoded image dimensions before a browser loader runs. */
export function validateSpruceContainer(bytes: Uint8Array) {
  if (bytes.length < 28 || bytes.length > contract.maxBytes)
    throw new Error("Incomplete or oversized spruce container");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    length = view.getUint32(12, true),
    bin = 20 + length;
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length ||
    view.getUint32(16, true) !== 0x4e4f534a ||
    length % 4 !== 0 ||
    bin + 8 > bytes.length ||
    view.getUint32(bin + 4, true) !== 0x004e4942 ||
    bin + 8 + view.getUint32(bin, true) !== bytes.length
  )
    throw new Error("Invalid spruce container");
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, bin))),
    size = view.getUint32(bin, true);
  if (
    json.asset?.version !== "2.0" ||
    json.animations?.length ||
    json.skins?.length ||
    json.cameras?.length ||
    json.extensionsRequired?.length ||
    json.extensionsUsed?.some(
      (name: string) => name !== "KHR_materials_clearcoat",
    ) ||
    json.buffers?.length !== 1 ||
    json.buffers[0].uri ||
    !Number.isInteger(json.buffers[0].byteLength) ||
    json.buffers[0].byteLength > size ||
    size - json.buffers[0].byteLength > 3 ||
    json.images?.length !== 1 ||
    json.textures?.length !== 1 ||
    json.materials?.length !== 2 ||
    json.meshes?.length !== 2 ||
    json.nodes?.length !== 3 ||
    json.accessors?.length > 12
  )
    throw new Error("Unsupported spruce dependencies");
  const texture = json.textures[0],
    image = json.images[0],
    buffer = json.bufferViews?.[image.bufferView],
    start = buffer?.byteOffset ?? 0;
  if (
    texture.source !== 0 ||
    texture.extensions ||
    image.uri ||
    image.mimeType !== "image/png" ||
    !Number.isInteger(image.bufferView) ||
    !buffer ||
    buffer.buffer !== 0 ||
    !Number.isInteger(start) ||
    start < 0 ||
    !Number.isInteger(buffer.byteLength) ||
    buffer.byteLength < 33 ||
    start + buffer.byteLength > json.buffers[0].byteLength
  )
    throw new Error("Invalid embedded spruce image");
  const offset = bin + 8 + start;
  if (
    view.getUint32(offset) !== 0x89504e47 ||
    view.getUint32(offset + 4) !== 0x0d0a1a0a ||
    view.getUint32(offset + 8) !== 13 ||
    view.getUint32(offset + 12) !== 0x49484452 ||
    view.getUint32(offset + 16) !== 512 ||
    view.getUint32(offset + 20) !== 512
  )
    throw new Error("Invalid or oversized spruce PNG");
  for (const accessor of json.accessors)
    if (
      !Number.isInteger(accessor.count) ||
      accessor.count < 1 ||
      accessor.count > 4096 ||
      accessor.sparse
    )
      throw new Error("Spruce accessor budget exceeded");
  const needles = json.materials.find(
    (m: { name: string }) => m.name === "LTX_Spruce_Needles",
  );
  if (
    needles?.alphaMode !== "MASK" ||
    needles.doubleSided !== true ||
    !Number.isFinite(needles.alphaCutoff) ||
    Math.abs(
      needles.alphaCutoff -
        contract.cutoutMaterials.LTX_Spruce_Needles.alphaCutoff,
    ) > 1e-7 ||
    needles.pbrMetallicRoughness?.baseColorTexture?.index !== 0
  )
    throw new Error("Spruce cutout material differs");
}

/** Validate metre geometry, then normalize once for the existing instance matrices. */
export function prepareSpruceTemplate(scene: Group): SpruceTemplate {
  scene.updateMatrixWorld(true);
  const identity = new Matrix4(),
    root = scene.getObjectByName(contract.rootNode);
  if (
    !root ||
    root.matrixWorld.elements.some(
      (v, i) => Math.abs(v - identity.elements[i]) > 1e-7,
    )
  )
    throw new Error("Spruce root frame differs");
  let triangles = 0,
    meshes = 0;
  scene.traverse((node) => {
    if (!node.matrixWorld.elements.every(Number.isFinite))
      throw new Error("Invalid spruce transform");
    if (!(node instanceof Mesh)) return;
    meshes++;
    if (!(node.material instanceof MeshStandardMaterial))
      throw new Error("Invalid spruce material");
    const geometry = node.geometry as BufferGeometry,
      position = geometry.getAttribute("position"),
      normal = geometry.getAttribute("normal"),
      index = geometry.index;
    if (
      !position ||
      !normal ||
      !index ||
      position.count > 4096 ||
      !Array.from(position.array).every(Number.isFinite) ||
      !Array.from(normal.array).every(Number.isFinite) ||
      index.count % 3 ||
      Array.from(index.array).some((i) => i < 0 || i >= position.count)
    )
      throw new Error("Invalid spruce geometry");
    triangles += index.count / 3;
    if (
      node.material.transparent ||
      node.material.opacity !== 1 ||
      node.material.metalness !== 0 ||
      node.material.roughness !== 1
    )
      throw new Error("Spruce surface response differs");
  });
  const box = new Box3().setFromObject(scene);
  if (
    meshes !== 2 ||
    triangles < 1 ||
    triangles > contract.maxTriangles ||
    box.min.distanceTo(new Vector3(...contract.bounds.min)) > 0.0001 ||
    box.max.distanceTo(new Vector3(...contract.bounds.max)) > 0.0001
  )
    throw new Error("Spruce geometry budget or bounds differ");
  const crown = scene.getObjectByName(
      contract.instanceBasis.crown.node,
    ) as SpruceMesh,
    trunk = scene.getObjectByName(
      contract.instanceBasis.trunk.node,
    ) as SpruceMesh;
  const image = crown?.material?.map?.image as
    { width: number; height: number } | undefined;
  if (
    !(crown instanceof Mesh) ||
    !(trunk instanceof Mesh) ||
    !crown.material.map ||
    Math.abs(crown.material.alphaTest - 0.45) > 1e-7 ||
    trunk.material.map ||
    image?.width !== 512 ||
    image?.height !== 512
  )
    throw new Error("Spruce meshes or foliage image differ");
  const uv = crown.geometry.getAttribute("uv");
  if (
    !uv ||
    uv.count !== crown.geometry.getAttribute("position").count ||
    !Array.from(uv.array).every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    )
  )
    throw new Error("Spruce cutout UV coordinates differ");
  for (const [node, basis] of [
    [crown, contract.instanceBasis.crown],
    [trunk, contract.instanceBasis.trunk],
  ] as const) {
    node.geometry.applyMatrix4(node.matrixWorld);
    node.geometry.translate(0, -basis.centerY, 0);
    node.geometry.scale(1 / basis.radius, 1 / basis.height, 1 / basis.radius);
    node.geometry.computeBoundingBox();
    node.geometry.computeBoundingSphere();
    const p = node.geometry.getAttribute("position");
    for (let i = 0; i < p.count; i++)
      if (
        Math.hypot(p.getX(i), p.getZ(i)) > 1.000001 ||
        Math.abs(p.getY(i)) > 0.500001
      )
        throw new Error("Spruce exceeds the existing placement envelope");
    node.material.forceSinglePass = true;
  }
  crown.material.map.anisotropy = 4;
  return { crown, trunk };
}

/** One bounded template owns its image; mounted tree batches own disposable clones. */
export function loadSpruceAsset() {
  cached ??= (async () => {
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error("Spruce download unavailable");
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > contract.maxBytes)
          throw new Error("Spruce download budget exceeded");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    validateSpruceContainer(bytes);
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    try {
      return prepareSpruceTemplate(gltf.scene);
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
