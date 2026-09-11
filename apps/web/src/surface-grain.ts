import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
} from "three";

/** Original static fine grain, tiled in world metres with mipmaps for distant views. */
export function surfaceGrain() {
  const size = 64,
    pixels = new Uint8Array(size * size * 4);
  let seed = 911;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 16807) % 2147483647;
    const value = 212 + Math.floor((seed / 2147483647) * 43);
    pixels.set([value, value, value, 255], i * 4);
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
