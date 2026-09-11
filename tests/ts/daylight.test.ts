import { expect, it } from "vitest";
import {
  EquirectangularReflectionMapping,
  FloatType,
  RepeatWrapping,
  Vector3,
} from "three";
import {
  daylightEnvironment,
  daylightSun,
  positionDaylightSun,
} from "../../apps/web/src/daylight";
import recipe from "../../assets/environment/daylight.json";

it("the bounded linear sky has continuous wrapping and its brightest region faces the world sun", () => {
  const a = daylightEnvironment(),
    b = daylightEnvironment();
  const pixels = a.image.data as Float32Array,
    { width, height } = a.image;
  expect(pixels.byteLength).toBe(128 * 1024);
  expect(a.mapping).toBe(EquirectangularReflectionMapping);
  expect(a.type).toBe(FloatType);
  expect(a.wrapS).toBe(RepeatWrapping);
  expect(pixels).toEqual(b.image.data);
  let brightest = 0,
    energy = -1;
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb = pixels.slice(i, i + 3);
    expect([...rgb].every((v) => Number.isFinite(v) && v >= 0 && v <= 4)).toBe(
      true,
    );
    expect(pixels[i + 3]).toBe(1);
    const sum = rgb[0] + rgb[1] + rgb[2];
    if (sum > energy) {
      energy = sum;
      brightest = i / 4;
    }
  }
  for (let y = 0; y < height; y++)
    for (let channel = 0; channel < 3; channel++) {
      // The two edge texels are adjacent spherical samples, not identical rays.
      let largestStep = 0;
      for (let x = 1; x < width; x++)
        largestStep = Math.max(
          largestStep,
          Math.abs(
            pixels[(y * width + x) * 4 + channel] -
              pixels[(y * width + x - 1) * 4 + channel],
          ),
        );
      expect(
        Math.abs(
          pixels[y * width * 4 + channel] -
            pixels[(y * width + width - 1) * 4 + channel],
        ),
      ).toBeLessThanOrEqual(largestStep + 1e-6);
    }
  const x = brightest % width,
    y = Math.floor(brightest / width),
    latitude = ((y + 0.5) / height - 0.5) * Math.PI,
    longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2,
    peak = new Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(longitude),
    );
  expect(
    peak.dot(new Vector3(...recipe.sun.direction).normalize()),
  ).toBeGreaterThan(0.999);
  // A real upper blue sky and darker lower green ground survive the HDR lobe.
  const top = ((height - 1) * width + width / 2) * 4,
    bottom = (width / 2) * 4;
  expect(pixels[top + 2]).toBeGreaterThan(pixels[top]);
  expect(pixels[bottom + 1]).toBeGreaterThan(pixels[bottom + 2]);
  a.dispose();
  b.dispose();
});

it("the shadow projection keeps vehicle-scale coverage and sunlight under large source translations", () => {
  const sun = daylightSun(),
    origin = new Vector3(-866, 23, -333),
    points: Vector3[] = [];
  for (const x of [-4, 4])
    for (const y of [-2, 3])
      for (const z of [-4, 4]) points.push(new Vector3(x, y, z));
  const snapshots: Vector3[][] = [];
  for (const shift of [new Vector3(), new Vector3(90000, -5000, 90000)]) {
    const anchor = origin.clone().add(shift),
      before = anchor.clone();
    positionDaylightSun(sun, anchor);
    sun.shadow.updateMatrices(sun);
    expect(anchor.equals(before)).toBe(true);
    expect(
      sun.position
        .clone()
        .sub(sun.target.position)
        .normalize()
        .distanceTo(new Vector3(...recipe.sun.direction).normalize()),
    ).toBeLessThan(1e-12);
    const projected = points.map((point) =>
      point.clone().add(anchor).applyMatrix4(sun.shadow.matrix),
    );
    for (const point of projected)
      for (const axis of [point.x, point.y, point.z]) {
        expect(axis).toBeGreaterThan(0);
        expect(axis).toBeLessThan(1);
      }
    snapshots.push(projected);
  }
  for (let i = 0; i < points.length; i++)
    expect(snapshots[0][i].distanceTo(snapshots[1][i])).toBeLessThan(1e-11);
  expect(sun.shadow.autoUpdate).toBe(false);
  expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
  sun.dispose();
});
