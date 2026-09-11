import type { Group, MeshStandardMaterial } from "three";

export type VehicleMotion = {
  wheels: (Group | null)[];
  front: (Group | null)[];
  brakeLights: (MeshStandardMaterial | null)[];
};

/** Running lamps brighten with the authoritative normalized brake demand. */
export const brakeLightIntensity = (brake: number) => 0.12 + 1.6 * brake;
