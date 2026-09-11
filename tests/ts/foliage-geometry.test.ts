import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { spruceCrown } from "../../apps/web/src/foliage-geometry";

describe("original instanced foliage", () => {
  it("retains the existing crown envelope with finite, nondegenerate outward faces", () => {
    const geometry = spruceCrown(),
      position = geometry.getAttribute("position"),
      normal = geometry.getAttribute("normal"),
      index = geometry.index!;
    expect(index.count / 3).toBeLessThanOrEqual(384);
    expect(geometry.groups).toEqual([]);
    const a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      face = new Vector3(),
      lighting = new Vector3();
    for (const name of ["position", "normal", "uv", "color"])
      expect(
        Array.from(geometry.getAttribute(name).array).every(Number.isFinite),
      ).toBe(true);
    for (let i = 0; i < position.count; i++) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(normal, i);
      expect(Math.hypot(a.x, a.z)).toBeLessThanOrEqual(1 + 1e-7);
      expect(a.y).toBeGreaterThanOrEqual(-0.5);
      expect(a.y).toBeLessThanOrEqual(0.5);
      expect(b.length()).toBeCloseTo(1, 6);
      const uv = geometry.getAttribute("uv");
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
      expect(uv.getY(i)).toBeLessThanOrEqual(1);
    }
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(position, index.getX(i));
      b.fromBufferAttribute(position, index.getX(i + 1));
      c.fromBufferAttribute(position, index.getX(i + 2));
      face.crossVectors(b.sub(a), c.sub(a));
      lighting.fromBufferAttribute(normal, index.getX(i));
      expect(face.length()).toBeGreaterThan(1e-6);
      expect(face.dot(lighting)).toBeGreaterThan(0);
    }
    expect(geometry.boundingBox!.min.y).toBe(-0.5);
    expect(geometry.boundingBox!.max.y).toBe(0.5);
    geometry.dispose();
  });
  it("builds deterministic geometry without a camera, clock or source mutation", () => {
    const a = spruceCrown(),
      b = spruceCrown();
    for (const name of ["position", "normal", "uv", "color"])
      expect(a.getAttribute(name).array).toEqual(b.getAttribute(name).array);
    expect(a.index!.array).toEqual(b.index!.array);
    expect(a.boundingSphere).toEqual(b.boundingSphere);
    a.dispose();
    b.dispose();
  });
});
