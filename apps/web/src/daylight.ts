import {
  Color,
  DataTexture,
  DirectionalLight,
  EquirectangularReflectionMapping,
  FloatType,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  Vector3,
} from "three";
import daylight from "../../../assets/environment/daylight.json";

const sunOffset = new Vector3(...daylight.sun.direction)
  .normalize()
  .multiplyScalar(daylight.sun.distance);

/** Original linear-radiance sky, ground and broad sun; no downloaded imagery. */
export function daylightEnvironment() {
  const recipe = daylight.environment,
    { width, height } = recipe,
    pixels = new Float32Array(width * height * 4),
    sky = new Color(recipe.sky),
    horizon = new Color(recipe.horizon),
    ground = new Color(recipe.ground),
    sun = sunOffset.clone().normalize(),
    color = new Color();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // Three's equirectangular UV convention: bottom row is the south pole.
      const latitude = Math.PI * ((y + 0.5) / height),
        dy = -Math.cos(latitude),
        ring = Math.sin(latitude),
        longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2,
        dot =
          Math.cos(longitude) * ring * sun.x +
          dy * sun.y +
          Math.sin(longitude) * ring * sun.z,
        glow = recipe.sunRadiance * Math.exp((dot - 1) / recipe.sunSpread);
      color
        .copy(horizon)
        .lerp(dy >= 0 ? sky : ground, Math.abs(dy) ** recipe.gradientPower);
      pixels.set(
        [color.r + glow, color.g + glow, color.b + glow, 1],
        (y * width + x) * 4,
      );
    }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType);
  texture.name = daylight.id;
  texture.mapping = EquirectangularReflectionMapping;
  texture.wrapS = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function daylightSun() {
  const recipe = daylight.sun,
    light = new DirectionalLight("#ffffff", recipe.intensity);
  light.name = "daylight-sun";
  light.target.name = "daylight-shadow-target";
  light.castShadow = true;
  light.shadow.mapSize.set(recipe.shadowSize, recipe.shadowSize);
  Object.assign(light.shadow.camera, {
    left: -recipe.shadowRadius,
    right: recipe.shadowRadius,
    top: recipe.shadowRadius,
    bottom: -recipe.shadowRadius,
    near: recipe.near,
    far: recipe.far,
  });
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias = recipe.bias;
  light.shadow.normalBias = recipe.normalBias;
  light.shadow.autoUpdate = false;
  light.shadow.needsUpdate = true;
  positionDaylightSun(light, new Vector3());
  return light;
}

/** Translate the bounded shadow volume; world sunlight direction stays fixed. */
export function positionDaylightSun(light: DirectionalLight, anchor: Vector3) {
  light.target.position.copy(anchor);
  light.position.copy(anchor).add(sunOffset);
  light.target.updateMatrixWorld();
  light.updateMatrixWorld();
}
