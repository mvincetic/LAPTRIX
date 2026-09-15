import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import url from "../../../assets/runtime/tracks/red-bull-ring-slice.glb?url";
import contract from "../../../assets/blender/tracks/red-bull-ring-slice.json";
import type { GroundFootprint } from "./vegetation-clearance";

let cached: Promise<Group> | undefined;
export { contract as rbrSceneryContract };

export function sceneryFootprints(scene: Group): GroundFootprint[] {
  return scene.userData.vegetationFootprints;
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
    const header = new DataView(bytes.buffer),
      size = header.getUint32(12, true);
    if (
      header.getUint32(0, true) !== 0x46546c67 ||
      header.getUint32(4, true) !== 2 ||
      header.getUint32(8, true) !== length ||
      header.getUint32(16, true) !== 0x4e4f534a ||
      size > length - 20
    )
      throw new Error("Invalid scenery container");
    const json = JSON.parse(
      new TextDecoder().decode(bytes.subarray(20, 20 + size)),
    );
    if (
      json.animations?.length ||
      json.skins?.length ||
      json.images?.length ||
      json.buffers?.length !== 1 ||
      json.buffers[0].uri ||
      json.extensionsRequired?.length
    )
      throw new Error("Unsupported scenery dependencies");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    try {
      return validateRBRScenery(gltf.scene);
    } catch (error) {
      gltf.scene.traverse((node) => {
        if (node instanceof Mesh) {
          node.geometry.dispose();
          for (const mat of Array.isArray(node.material)
            ? node.material
            : [node.material])
            mat.dispose();
        }
      });
      throw error;
    }
  })().catch((error) => {
    cached = undefined;
    throw error;
  });
  return cached;
}
