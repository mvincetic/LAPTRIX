import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { trackSchema, type Track } from "../../packages/shared/schema";
import source from "../../data/tracks/ardennes-development.json";
import { CAMERA_FOV, fitTrackCamera } from "../../apps/web/src/camera-framing";

function assertVisible(track: Track, aspect: number, mode: "orbit" | "top") {
  const fit = fitTrackCamera(track, aspect, mode);
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, fit.near, fit.far);
  camera.position.set(...fit.position);
  camera.lookAt(...fit.target);
  camera.updateMatrixWorld();
  expect(camera.position.distanceTo(new Vector3(...fit.target))).toBeCloseTo(
    fit.distance,
    8,
  );
  expect(fit.distance).toBeGreaterThanOrEqual(fit.minDistance);
  expect(fit.distance).toBeLessThan(fit.maxDistance);
  expect(fit.near).toBeGreaterThan(0);
  let maxX = 0,
    maxY = 0,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < track.points.length; i++) {
    const p = track.points[i],
      prev = track.points[(i + track.points.length - 1) % track.points.length],
      next = track.points[(i + 1) % track.points.length];
    const dx = next.x - prev.x,
      dz = next.z - prev.z,
      run = Math.hypot(dx, dz);
    // Independent projection of rendered road/shoulder vertices, including their vertical lift.
    for (const lateral of [0, p.widthLeft + 4, -p.widthRight - 4]) {
      const projected = new Vector3(
        p.x + (dz / run) * lateral,
        p.y + 0.55,
        p.z - (dx / run) * lateral,
      ).project(camera);
      maxX = Math.max(maxX, Math.abs(projected.x));
      maxY = Math.max(maxY, Math.abs(projected.y));
      minZ = Math.min(minZ, projected.z);
      maxZ = Math.max(maxZ, projected.z);
    }
  }
  expect(maxX).toBeLessThan(1);
  expect(maxY).toBeLessThan(1);
  expect(minZ).toBeGreaterThan(-1);
  expect(maxZ).toBeLessThan(1);
  return fit;
}

describe("source-scaled camera framing", () => {
  it("fits validated source and road edges at normal, large and narrow proportions", () => {
    for (const scale of [0.05, 1, 5]) {
      const track = trackSchema.parse({
        ...source,
        points: source.points.map((p) => ({
          ...p,
          x: p.x * scale,
          y: p.y * scale,
          z: p.z * scale,
        })),
      });
      for (const aspect of [0.25, 0.85, 1.2, 2, 4])
        for (const mode of ["orbit", "top"] as const) {
          const fit = assertVisible(track, aspect, mode);
          if (scale === 5 && aspect === 0.85)
            expect(fit.far).toBeGreaterThan(20000);
        }
    }
  });
  it("handles small valid loops and elevated sources whose height exceeds horizontal span", () => {
    const circle = (
      count: number,
      radius: number,
      elevation: (index: number) => number,
    ) =>
      trackSchema.parse({
        ...source,
        points: Array.from({ length: count }, (_, i) => ({
          x: radius * Math.cos((i * 2 * Math.PI) / 40),
          y: elevation(i),
          z: radius * Math.sin((i * 2 * Math.PI) / 40),
          widthLeft: 2,
          widthRight: 2,
          banking: 0,
        })),
      });
    const small = circle(40, 1, () => 0);
    const tall = circle(2000, 8, (i) => Math.min(i, 2000 - i) * 0.2);
    for (const track of [small, tall])
      for (const mode of ["orbit", "top"] as const)
        assertVisible(track, 0.4, mode);
    expect(fitTrackCamera(small, 1, "top").minDistance).toBeLessThan(40);
    const fit = fitTrackCamera(tall, 0.4, "orbit");
    expect(fit.maxDistance).toBeGreaterThan(16 * 3);
  });
  it("preserves source-relative fit and zoom bounds under a large 3D translation", () => {
    const track = trackSchema.parse(source);
    const shift = new Vector3(65000, 99000, -58000);
    const moved = trackSchema.parse({
      ...track,
      points: track.points.map((p) => ({
        ...p,
        x: p.x + shift.x,
        y: p.y + shift.y,
        z: p.z + shift.z,
      })),
    });
    for (const mode of ["orbit", "top"] as const) {
      const a = fitTrackCamera(track, 0.85, mode),
        b = assertVisible(moved, 0.85, mode);
      expect(
        new Vector3(...b.position)
          .sub(shift)
          .distanceTo(new Vector3(...a.position)),
      ).toBeLessThan(1e-8);
      expect(b.distance).toBeCloseTo(a.distance, 8);
      expect(b.maxDistance).toBeCloseTo(a.maxDistance, 8);
      expect(b.far).toBeCloseTo(a.far, 8);
    }
  });
  it("keeps the whole source inside the depth planes at maximum permitted orbit distance", () => {
    const track = trackSchema.parse({
      ...source,
      points: source.points.map((p) => ({
        ...p,
        x: p.x * 5,
        y: p.y * 5,
        z: p.z * 5,
      })),
    });
    const fit = fitTrackCamera(track, 0.25, "orbit");
    for (const direction of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ]) {
      const camera = new PerspectiveCamera(CAMERA_FOV, 0.25, fit.near, fit.far);
      camera.position
        .set(...fit.target)
        .addScaledVector(new Vector3(...direction), fit.maxDistance);
      camera.lookAt(...fit.target);
      camera.updateMatrixWorld();
      for (const p of track.points) {
        const depth = new Vector3(p.x, p.y, p.z).project(camera).z;
        expect(depth).toBeGreaterThan(-1);
        expect(depth).toBeLessThan(1);
      }
    }
  });
  it("rejects zero, negative and nonfinite viewport proportions", () => {
    const track = trackSchema.parse(source);
    for (const aspect of [0, -1, NaN, Infinity])
      expect(() => fitTrackCamera(track, aspect, "orbit")).toThrow("aspect");
  });
});
