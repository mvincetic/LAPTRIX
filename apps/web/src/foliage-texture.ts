import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import foliageUrl from "../../../assets/environment/spruce-bough.webp?url";
import spruce from "../../../assets/environment/spruce.json";

let loaded: Promise<Texture> | undefined;
/** One owned texture retains its decoded image for source switches and graphics recovery. */
export function loadFoliageTexture() {
  loaded ??= new TextureLoader()
    .loadAsync(foliageUrl)
    .then((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = spruce.anisotropy;
      texture.name = "original-spruce-bough";
      return texture;
    })
    .catch((error) => {
      loaded = undefined;
      throw error;
    });
  return loaded;
}
