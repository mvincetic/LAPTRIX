import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  instantiatePremiumGT,
  loadPremiumGT,
  supportsPremiumGT,
  validateGTContainer,
  validatePremiumGT,
} from "../../apps/web/src/premium-vehicle";
import { vehicleSchema } from "../../packages/shared/schema";
import profile from "../../data/vehicles/gt-development.json";

const bytes = readFileSync(
  new URL("../../assets/runtime/vehicles/gt.glb", import.meta.url),
);
const buffer = () =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
const template = async () =>
  (await new GLTFLoader().parseAsync(buffer(), "")).scene;
afterEach(() => vi.unstubAllGlobals());

describe("original Blender GT delivery", () => {
  it("retains exact native profile dimensions and falls back for custom geometry", () => {
    const vehicle = vehicleSchema.parse(profile);
    expect(supportsPremiumGT(vehicle)).toBe(true);
    for (const changed of [
      { width: 2 },
      { wheelbase: 3 },
      { wheelRadius: 0.4 },
      { bodyStyle: "formula" as const },
      { id: "custom-coupe" },
    ])
      expect(supportsPremiumGT({ ...vehicle, ...changed })).toBe(false);
    expect(supportsPremiumGT(undefined)).toBe(false);
  });

  it("loads the real exported rig and rejects displaced, missing and disconnected nodes", async () => {
    validateGTContainer(buffer());
    const scene = await template();
    expect(validatePremiumGT(scene)).toBe(scene);
    const wheel = scene.getObjectByName("WHEEL_FL")!;
    expect(wheel.position.toArray()).toEqual([
      expect.closeTo(0.7695, 6),
      expect.closeTo(0.36, 6),
      expect.closeTo(1.2285, 6),
    ]);
    wheel.position.x += 0.1;
    expect(() => validatePremiumGT(scene)).toThrow(/pivot/);
    wheel.position.x -= 0.1;
    const spin = scene.getObjectByName("SPIN_FL")!;
    spin.name = "lost";
    expect(() => validatePremiumGT(scene)).toThrow(/pivot/);
    spin.name = "SPIN_FL";
    scene.attach(spin);
    expect(() => validatePremiumGT(scene)).toThrow(/hierarchy/);
  });

  it("gives each native lap independent rolling, steering and brake materials while sharing geometry", async () => {
    const original = await template();
    const current = instantiatePremiumGT(original, false);
    const reference = instantiatePremiumGT(original, true);
    current.motion.wheels[0]!.rotation.x = 213 / 0.36;
    current.motion.front[0]!.rotation.y = 0.13;
    current.motion.brakeLights[0]!.emissiveIntensity = 1.72;
    expect(reference.motion.wheels[0]!.rotation.x).toBeCloseTo(0, 12);
    expect(reference.motion.front[0]!.rotation.y).toBeCloseTo(0, 12);
    expect(reference.motion.brakeLights[0]!.emissiveIntensity).toBeCloseTo(
      0.12,
    );
    const a = current.scene.getObjectByName("GT_ROOT_GT_Paint_LOD0") as Mesh;
    const b = reference.scene.getObjectByName(a.name) as Mesh;
    expect(a.geometry).toBe(b.geometry);
    expect(a.material).not.toBe(b.material);
    expect(a.material).toMatchObject({
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
    expect(b.material).toMatchObject({
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    expect(a.castShadow).toBe(true);
    expect(b.castShadow).toBe(false);
    const materialDisposed = vi.fn(),
      geometryDisposed = vi.fn();
    (a.material as MeshStandardMaterial).addEventListener(
      "dispose",
      materialDisposed,
    );
    a.geometry.addEventListener("dispose", geometryDisposed);
    current.dispose();
    expect(materialDisposed).toHaveBeenCalledOnce();
    expect(geometryDisposed).not.toHaveBeenCalled();
    reference.dispose();
  });

  it("rejects truncated and oversized payloads before model parsing", () => {
    expect(() => validateGTContainer(buffer().slice(0, 120))).toThrow();
    expect(() => validateGTContainer(new ArrayBuffer(2500001))).toThrow(
      /budget/,
    );
    const corrupted = buffer();
    new DataView(corrupted).setUint32(12, bytes.length, true);
    expect(() => validateGTContainer(corrupted)).toThrow(/JSON/);
  });

  it("evicts a failed request, retries, and shares one successful template across consumers", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockImplementation(() => Promise.resolve(new Response(buffer())));
    vi.stubGlobal("fetch", fetch);
    await expect(loadPremiumGT()).rejects.toThrow(/unavailable/);
    const a = loadPremiumGT(),
      b = loadPremiumGT();
    expect(a).toBe(b);
    expect(await a).toBe(await b);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
