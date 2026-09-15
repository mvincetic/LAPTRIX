import {
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from "three";
import type { Vehicle } from "../../../packages/shared/schema";
import type { VehicleMotion } from "./vehicle-motion";
import gtUrl from "../../../assets/runtime/vehicles/gt.glb?url";
import gt from "../../../assets/blender/vehicles/gt.json";

const labels = ["FR", "FL", "RR", "RL"] as const;
const templates = new Map<string, Promise<Group>>();

/** A fixed-size original model is eligible only for its matching physical profile. */
export function supportsPremiumGT(vehicle?: Vehicle) {
  return (
    !!vehicle &&
    vehicle.id === gt.vehicle.id &&
    vehicle.bodyStyle === gt.vehicle.bodyStyle &&
    (["width", "wheelbase", "wheelRadius"] as const).every(
      (field) => Math.abs(vehicle[field] - gt.vehicle[field]) < 1e-9,
    )
  );
}

function ownedResources(root: Object3D) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<MeshStandardMaterial>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material])
      materials.add(material);
  });
  return { geometries, materials };
}

export function validatePremiumGT(root: Group) {
  root.updateMatrixWorld(true);
  const body = root.getObjectByName(gt.rootNode);
  if (!body) throw new Error("GT root is missing");
  for (const [name, position] of Object.entries(gt.requiredNodes)) {
    const node = root.getObjectByName(name);
    if (
      !node ||
      node
        .getWorldPosition(new Vector3())
        .distanceTo(new Vector3(...position)) > 0.001
    )
      throw new Error(`Invalid GT rig pivot: ${name}`);
  }
  let triangles = 0,
    meshes = 0;
  const names = new Set<string>();
  root.traverse((node) => {
    if (names.has(node.name) && node.name) throw new Error("Repeated GT node");
    names.add(node.name);
    if (
      node.scale.distanceTo(new Vector3(1, 1, 1)) > 1e-6 ||
      !node.matrixWorld.elements.every(Number.isFinite)
    )
      throw new Error("Invalid GT transform");
    if (!(node instanceof Mesh)) return;
    meshes++;
    if (!(node.material instanceof MeshStandardMaterial))
      throw new Error("Unsupported GT material");
    const positions = node.geometry.getAttribute("position");
    if (!positions || !Array.from(positions.array).every(Number.isFinite))
      throw new Error("Invalid GT positions");
    triangles += (node.geometry.index?.count ?? positions.count) / 3;
  });
  if (meshes > gt.maxMeshes || triangles > gt.maxTriangles || triangles < 1)
    throw new Error("GT geometry budget exceeded");
  const bounds = new Box3().setFromObject(root);
  if (
    bounds.min.distanceTo(new Vector3(...gt.bounds.min)) > 0.003 ||
    bounds.max.distanceTo(new Vector3(...gt.bounds.max)) > 0.003
  )
    throw new Error("GT physical bounds differ");
  for (const label of labels) {
    const carrier = root.getObjectByName(`WHEEL_${label}`);
    const spin = root.getObjectByName(`SPIN_${label}`);
    if (
      !carrier ||
      !spin ||
      spin.parent !== carrier ||
      spin.quaternion.angleTo(new Group().quaternion) > 1e-6 ||
      carrier.quaternion.angleTo(new Group().quaternion) > 1e-6
    )
      throw new Error("Invalid GT steering/rolling hierarchy");
  }
  return root;
}

/** No external glTF dependencies or timelines; reject before GLTFLoader can request them. */
export function validateGTContainer(bytes: ArrayBuffer) {
  if (bytes.byteLength < 20 || bytes.byteLength > gt.maxBytes)
    throw new Error("GT download budget exceeded");
  const view = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Invalid GT container");
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20) throw new Error("Invalid GT JSON size");
  const document = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 20, length)),
  );
  if (
    document.animations?.length ||
    document.skins?.length ||
    document.images?.length ||
    document.buffers?.length !== 1 ||
    document.buffers[0].uri ||
    document.extensionsRequired?.length
  )
    throw new Error("Unsupported GT dependencies or animation");
}

export function loadPremiumGT() {
  const cached = templates.get(gt.id);
  if (cached) return cached;
  const pending = (async () => {
    const response = await fetch(gtUrl);
    if (!response.ok || !response.body) throw new Error("GT asset unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > gt.maxBytes) throw new Error("GT download budget exceeded");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    validateGTContainer(bytes.buffer);
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    try {
      return validatePremiumGT(gltf.scene);
    } catch (error) {
      const resources = ownedResources(gltf.scene);
      resources.geometries.forEach((geometry) => geometry.dispose());
      resources.materials.forEach((material) => material.dispose());
      throw error;
    }
  })().catch((error) => {
    templates.delete(gt.id);
    throw error;
  });
  templates.set(gt.id, pending);
  return pending;
}

/** Geometry stays in the bounded template cache; each lap owns its mutable materials/rig. */
export function instantiatePremiumGT(template: Group, reference: boolean) {
  const scene = template.clone(true);
  const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const original = node.material as MeshStandardMaterial;
    let material = materials.get(original);
    if (!material) {
      material = original.clone();
      material.transparent = reference;
      material.opacity = reference ? 0.28 : 1;
      material.depthWrite = !reference;
      if (reference && ["LTX_GT_Paint", "LTX_GT_Ice"].includes(material.name))
        material.color.set("#78879c");
      materials.set(original, material);
    }
    node.material = material;
    node.castShadow = !reference;
    node.receiveShadow = !reference;
  });
  const motion: VehicleMotion = {
    wheels: labels.map(
      (label) => scene.getObjectByName(`SPIN_${label}`) as Group,
    ),
    front: ["FR", "FL"].map(
      (label) => scene.getObjectByName(`WHEEL_${label}`) as Group,
    ),
    brakeLights: ["L", "R"].map(
      (side) =>
        (scene.getObjectByName(`BRAKE_LIGHT_${side}`) as Mesh)
          .material as MeshStandardMaterial,
    ),
  };
  // glTF folds sub-unit emission into its color factor. The exported lamp uses
  // unity emission; this existing telemetry scalar owns its running/braking level.
  for (const lamp of motion.brakeLights)
    if (lamp) lamp.emissiveIntensity = 0.12;
  return {
    scene,
    motion,
    dispose: () => materials.forEach((material) => material.dispose()),
  };
}
