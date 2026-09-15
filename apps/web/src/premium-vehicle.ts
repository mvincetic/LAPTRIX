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
import formulaUrl from "../../../assets/runtime/vehicles/formula26.glb?url";
import formula from "../../../assets/blender/vehicles/formula26.json";

const definitions = {
  gt: {
    contract: gt,
    url: gtUrl,
    paintMaterials: ["LTX_GT_Paint", "LTX_GT_Ice"],
    brakeNodes: ["BRAKE_LIGHT_L", "BRAKE_LIGHT_R"],
  },
  formula26: {
    contract: formula,
    url: formulaUrl,
    paintMaterials: ["LTX_F26_Paint", "LTX_F26_Ice"],
    brakeNodes: [] as string[],
  },
};
export type PremiumVehicleKind = keyof typeof definitions;

const labels = ["FR", "FL", "RR", "RL"] as const;
const templates = new Map<string, Promise<Group>>();

/** A fixed-size original model is eligible only for its matching physical profile. */
export function supportsPremiumGT(vehicle?: Vehicle) {
  return premiumVehicleKind(vehicle) === "gt";
}

export function premiumVehicleKind(
  vehicle?: Vehicle,
): PremiumVehicleKind | undefined {
  if (!vehicle) return;
  return (Object.keys(definitions) as PremiumVehicleKind[]).find((kind) => {
    const expected = definitions[kind].contract.vehicle;
    return (
      vehicle.id === expected.id &&
      vehicle.bodyStyle === expected.bodyStyle &&
      (["width", "wheelbase", "wheelRadius"] as const).every(
        (field) => Math.abs(vehicle[field] - expected[field]) < 1e-9,
      )
    );
  });
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

export function validatePremiumVehicle(root: Group, kind: PremiumVehicleKind) {
  const contract = definitions[kind].contract;
  root.updateMatrixWorld(true);
  const body = root.getObjectByName(contract.rootNode);
  if (!body) throw new Error("Premium vehicle root is missing");
  for (const [name, position] of Object.entries(contract.requiredNodes)) {
    const node = root.getObjectByName(name);
    if (
      !node ||
      node
        .getWorldPosition(new Vector3())
        .distanceTo(new Vector3(...position)) > 0.001
    )
      throw new Error(`Invalid vehicle rig pivot: ${name}`);
  }
  let triangles = 0,
    meshes = 0;
  const names = new Set<string>();
  root.traverse((node) => {
    if (names.has(node.name) && node.name)
      throw new Error("Repeated vehicle node");
    names.add(node.name);
    if (
      node.scale.distanceTo(new Vector3(1, 1, 1)) > 1e-6 ||
      !node.matrixWorld.elements.every(Number.isFinite)
    )
      throw new Error("Invalid vehicle transform");
    if (!(node instanceof Mesh)) return;
    meshes++;
    if (!(node.material instanceof MeshStandardMaterial))
      throw new Error("Unsupported vehicle material");
    const positions = node.geometry.getAttribute("position");
    if (!positions || !Array.from(positions.array).every(Number.isFinite))
      throw new Error("Invalid vehicle positions");
    triangles += (node.geometry.index?.count ?? positions.count) / 3;
  });
  if (
    meshes > contract.maxMeshes ||
    triangles > contract.maxTriangles ||
    triangles < 1
  )
    throw new Error("vehicle geometry budget exceeded");
  const bounds = new Box3().setFromObject(root);
  if (
    bounds.min.distanceTo(new Vector3(...contract.bounds.min)) > 0.003 ||
    bounds.max.distanceTo(new Vector3(...contract.bounds.max)) > 0.003
  )
    throw new Error("vehicle physical bounds differ");
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
      throw new Error("Invalid vehicle steering/rolling hierarchy");
  }
  return root;
}

/** No external glTF dependencies or timelines; reject before GLTFLoader can request them. */
export function validateVehicleContainer(
  bytes: ArrayBuffer,
  kind: PremiumVehicleKind,
) {
  const contract = definitions[kind].contract;
  if (bytes.byteLength < 20 || bytes.byteLength > contract.maxBytes)
    throw new Error("Vehicle download budget exceeded");
  const view = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Invalid vehicle container");
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20)
    throw new Error("Invalid vehicle JSON size");
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
    throw new Error("Unsupported vehicle dependencies or animation");
}

export function loadPremiumVehicle(kind: PremiumVehicleKind) {
  const { contract, url } = definitions[kind];
  const cached = templates.get(contract.id);
  if (cached) return cached;
  const pending = (async () => {
    const response = await fetch(url);
    if (!response.ok || !response.body)
      throw new Error("Vehicle asset unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > contract.maxBytes)
          throw new Error("Vehicle download budget exceeded");
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
    validateVehicleContainer(bytes.buffer, kind);
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    try {
      return validatePremiumVehicle(gltf.scene, kind);
    } catch (error) {
      const resources = ownedResources(gltf.scene);
      resources.geometries.forEach((geometry) => geometry.dispose());
      resources.materials.forEach((material) => material.dispose());
      throw error;
    }
  })().catch((error) => {
    templates.delete(contract.id);
    throw error;
  });
  templates.set(contract.id, pending);
  return pending;
}

/** Geometry stays in the bounded template cache; each lap owns its mutable materials/rig. */
export function instantiatePremiumVehicle(
  template: Group,
  reference: boolean,
  kind: PremiumVehicleKind,
) {
  const definition = definitions[kind];
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
      if (reference && definition.paintMaterials.includes(material.name))
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
    brakeLights: definition.brakeNodes.map(
      (name) =>
        (scene.getObjectByName(name) as Mesh).material as MeshStandardMaterial,
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

// Single-model helpers retain the original GT validation and consumer contract.
export const validatePremiumGT = (scene: Group) =>
  validatePremiumVehicle(scene, "gt");
export const validateGTContainer = (bytes: ArrayBuffer) =>
  validateVehicleContainer(bytes, "gt");
export const loadPremiumGT = () => loadPremiumVehicle("gt");
export const instantiatePremiumGT = (scene: Group, reference: boolean) =>
  instantiatePremiumVehicle(scene, reference, "gt");
