import { BufferGeometry, Float32BufferAttribute } from "three";
import spruce from "../../../assets/environment/spruce.json";

/** Normalized, static branch cards with a small opaque interior for distant views. */
export function spruceCrown() {
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  for (let tier = 0; tier < spruce.tiers; tier++) {
    const t = tier / (spruce.tiers - 1),
      height = 0.47 - 0.74 * t ** 1.45,
      radius = 0.06 + 0.94 * t ** 1.1;
    for (let branch = 0; branch < spruce.branches; branch++) {
      const angle = (branch / spruce.branches) * Math.PI * 2 + tier * 2.39996,
        length = radius * (0.88 + 0.1 * Math.sin(branch * 4.3 + tier * 2.1)),
        dx = Math.cos(angle),
        dz = Math.sin(angle),
        tint = 0.77 + 0.19 * t + 0.04 * Math.sin(branch * 3.7);
      for (const tilt of spruce.branchTilts) {
        const start = positions.length / 3;
        for (const [u, v] of [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]) {
          const side = (v - 0.5) * length * 0.95,
            run = u * length;
          positions.push(
            dx * run - dz * side * Math.cos(tilt),
            height - run * 0.13 + side * Math.sin(tilt),
            dz * run + dx * side * Math.cos(tilt),
          );
          uvs.push(u, v);
          // Rounded canopy lighting avoids a visible lighting seam between cards.
          normals.push(dx * 0.35, Math.sqrt(1 - 0.35 ** 2), dz * 0.35);
          colors.push(tint, tint, tint);
        }
        indices.push(start, start + 2, start + 1, start, start + 3, start + 2);
      }
    }
  }
  const coreStart = positions.length / 3;
  for (let row = 0; row < spruce.coreRings; row++) {
    for (let side = 0; side < spruce.coreSides; side++) {
      const t = row / (spruce.coreRings - 1),
        angle = (side / spruce.coreSides) * Math.PI * 2,
        radius = 0.012 + 0.42 * (1 - t);
      positions.push(
        Math.cos(angle) * radius,
        -0.36 + t * 0.83,
        Math.sin(angle) * radius,
      );
      // A dense needle patch retains the distant silhouette without flat dark facets.
      uvs.push(
        spruce.coreUv[0] + (side % 2 ? 1 : -1) * spruce.coreUvSpread[0],
        spruce.coreUv[1] + (2 * t - 1) * spruce.coreUvSpread[1],
      );
      normals.push(
        Math.cos(angle) * 0.2,
        Math.sqrt(1 - 0.2 ** 2),
        Math.sin(angle) * 0.2,
      );
      colors.push(0.9, 0.9, 0.9);
    }
  }
  for (let row = 0; row < spruce.coreRings - 1; row++) {
    for (let side = 0; side < spruce.coreSides; side++) {
      const a = coreStart + row * spruce.coreSides + side,
        b =
          coreStart + row * spruce.coreSides + ((side + 1) % spruce.coreSides);
      indices.push(
        a,
        a + spruce.coreSides,
        b,
        b,
        a + spruce.coreSides,
        b + spruce.coreSides,
      );
    }
  }
  let low = Infinity,
    high = -Infinity,
    radius = 0;
  for (let i = 0; i < positions.length; i += 3) {
    low = Math.min(low, positions[i + 1]);
    high = Math.max(high, positions[i + 1]);
    radius = Math.max(radius, Math.hypot(positions[i], positions[i + 2]));
  }
  // Retain the old placement envelope: radius <= 1, height [-0.5, 0.5].
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] /= radius;
    positions[i + 1] = (positions[i + 1] - low) / (high - low) - 0.5;
    positions[i + 2] /= radius;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
