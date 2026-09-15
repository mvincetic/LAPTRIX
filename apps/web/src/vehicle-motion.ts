import type { Object3D, MeshStandardMaterial } from "three";

export type VehicleMotion = {
  wheels: (Object3D | null)[];
  front: (Object3D | null)[];
  brakeLights: (MeshStandardMaterial | null)[];
};

/** Running lamps brighten with the authoritative normalized brake demand. */
export const brakeLightIntensity = (brake: number) => 0.12 + 1.6 * brake;
