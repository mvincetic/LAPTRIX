import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  LinearFilter,
  RGBAFormat,
} from "three";
import type { Lap } from "../../../../packages/shared/schema";
import { ROAD_SURFACE_LIFT } from "../chase-camera";

function dotTexture() {
  const size = 32,
    pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const coverage = Math.max(
        0,
        Math.min(
          1,
          size / 2 - Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2),
        ),
      );
      pixels.set(
        [255, 255, 255, Math.round(255 * coverage)],
        (y * size + x) * 4,
      );
    }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Analysis glyphs anchored to native apex samples; camera zoom never enlarges them. */
export function ApexPoints({ lap }: { lap: Lap }) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute(
      "position",
      new Float32BufferAttribute(
        lap.corners.flatMap(({ apexIndex }) => {
          const sample = lap.samples[apexIndex];
          return [sample.x, sample.y + ROAD_SURFACE_LIFT + 0.15, sample.z];
        }),
        3,
      ),
    );
    result.computeBoundingSphere();
    return result;
  }, [lap]);
  const texture = useMemo(dotTexture, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <points name="apex-points" geometry={geometry} renderOrder={10}>
      <pointsMaterial
        color="#26b85b"
        map={texture}
        size={8}
        sizeAttenuation={false}
        transparent
        alphaTest={0.1}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
