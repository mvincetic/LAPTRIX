import type { BufferGeometry, Material, Mesh } from "three";
import pylonUrl from "../../../assets/trackside/dev-start-pylon.glb?url";

export type StaticAssetPart = { geometry: BufferGeometry; material: Material };
const urls: Record<string, string> = { "laptrix.dev-start-pylon.v1": pylonUrl };
const loaded = new Map<string, Promise<StaticAssetPart[]>>();

/** Small owned asset cache: CPU geometry survives view remounts and WebGL restoration. */
export function loadStaticAsset(id: string) {
  const previous = loaded.get(id);
  if (previous) return previous;
  const url = urls[id];
  if (!url) return Promise.reject(new Error(`Unknown static asset: ${id}`));
  const pending = import("three/addons/loaders/GLTFLoader.js")
    .then(async ({ GLTFLoader }) => {
      const model = await new GLTFLoader().loadAsync(url);
      model.scene.updateMatrixWorld(true);
      const parts: StaticAssetPart[] = [];
      model.scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material)) return;
        parts.push({
          geometry: mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),
          material: mesh.material,
        });
      });
      model.scene.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      return parts;
    })
    .catch((error) => {
      loaded.delete(id);
      throw error;
    });
  loaded.set(id, pending);
  return pending;
}
