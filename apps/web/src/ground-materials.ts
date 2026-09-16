import { BufferAttribute, DoubleSide, type MeshStandardMaterial } from "three";

/** Match Blender's world X/Z mapping and glTF's exported V inversion exactly. */
export function groundUV(positions: ArrayLike<number>, tileMetres: number) {
  const values = new Float32Array((positions.length / 3) * 2);
  for (let i = 0; i < positions.length / 3; i++) {
    values[i * 2] = positions[i * 3] / tileMetres;
    values[i * 2 + 1] = 1 - positions[i * 3 + 2] / tileMetres;
  }
  return new BufferAttribute(values, 2);
}

/** The owner disposes this material only; packed maps belong to the package cache. */
export function groundMaterial(
  template: MeshStandardMaterial,
  vertexColors = false,
) {
  const material = template.clone();
  material.side = DoubleSide;
  material.vertexColors = vertexColors;
  return material;
}
