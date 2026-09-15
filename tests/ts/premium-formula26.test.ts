import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Mesh, MeshStandardMaterial, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  instantiatePremiumVehicle,
  loadPremiumVehicle,
  premiumVehicleKind,
  validatePremiumVehicle,
  validateVehicleContainer,
} from "../../apps/web/src/premium-vehicle";
import { vehicleSchema } from "../../packages/shared/schema";
import profile from "../../data/vehicles/formula-development.json";

function bytes(model = "formula26") {
  const file = readFileSync(
    new URL(`../../assets/runtime/vehicles/${model}.glb`, import.meta.url),
  );
  return file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  ) as ArrayBuffer;
}
const template = async () =>
  (await new GLTFLoader().parseAsync(bytes(), "")).scene;
afterEach(() => vi.unstubAllGlobals());

describe("original Formula 2026 native rig", () => {
  it("retains the development profile and rejects custom or mismatched geometry", () => {
    const vehicle = vehicleSchema.parse(profile);
    expect(premiumVehicleKind(vehicle)).toBe("formula26");
    for (const changed of [
      { wheelbase: 3.4 },
      { width: 1.9 },
      { wheelRadius: 0.35 },
      { id: "custom-formula" },
      { bodyStyle: "coupe" as const },
    ])
      expect(premiumVehicleKind({ ...vehicle, ...changed })).toBeUndefined();
    expect(premiumVehicleKind()).toBeUndefined();
  });

  it("validates delivered pivots, keeps the visor visible, and rejects a disconnected rolling carrier", async () => {
    validateVehicleContainer(bytes(), "formula26");
    const scene = await template();
    expect(validatePremiumVehicle(scene, "formula26")).toBe(scene);
    expect(() => validatePremiumVehicle(scene, "gt")).toThrow(/root/);
    for (const [label, x, z] of [
      ["FL", 0.81, 1.8],
      ["FR", -0.81, 1.8],
      ["RL", 0.81, -1.8],
      ["RR", -0.81, -1.8],
    ] as const) {
      expect(
        scene
          .getObjectByName(`WHEEL_${label}`)!
          .getWorldPosition(new Vector3())
          .toArray(),
      ).toEqual([
        expect.closeTo(x, 6),
        expect.closeTo(0.34, 6),
        expect.closeTo(z, 6),
      ]);
    }
    // Independent sight ray protects the real modeling defect found in the first preview.
    const ray = new Raycaster(
      new Vector3(0, 0.83, 0.2),
      new Vector3(0, 0, -1),
      0,
      1,
    );
    const hit = ray.intersectObject(scene, true)[0].object as Mesh;
    expect((hit.material as MeshStandardMaterial).name).toBe("LTX_F26_Visor");
    const spin = scene.getObjectByName("SPIN_FL")!;
    scene.attach(spin);
    expect(() => validatePremiumVehicle(scene, "formula26")).toThrow(
      /hierarchy/,
    );
  });

  it("shares geometry but keeps each lap's paint and wheel motion independent, without invented aero or brake motion", async () => {
    const source = await template();
    const current = instantiatePremiumVehicle(source, false, "formula26");
    const reference = instantiatePremiumVehicle(source, true, "formula26");
    expect(current.motion.wheels).toHaveLength(4);
    expect(current.motion.front).toHaveLength(2);
    expect(current.motion.brakeLights).toEqual([]);
    expect(source.animations).toEqual([]);
    current.motion.wheels[0]!.rotation.x = 170 / 0.34;
    current.motion.front[0]!.rotation.y = -0.12;
    expect(reference.motion.wheels[0]!.rotation.x).toBeCloseTo(0, 12);
    expect(reference.motion.front[0]!.rotation.y).toBeCloseTo(0, 12);
    const body = current.scene.getObjectByName(
      "FORMULA26_ROOT_F26_Paint_LOD0",
    ) as Mesh;
    const ghost = reference.scene.getObjectByName(body.name) as Mesh;
    expect(body.geometry).toBe(ghost.geometry);
    expect(body.material).not.toBe(ghost.material);
    expect(body.material).toMatchObject({
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
    expect(ghost.material).toMatchObject({
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    expect(body.castShadow).toBe(true);
    expect(ghost.castShadow).toBe(false);
    const disposed = vi.fn(),
      geometryDisposed = vi.fn();
    (body.material as MeshStandardMaterial).addEventListener(
      "dispose",
      disposed,
    );
    body.geometry.addEventListener("dispose", geometryDisposed);
    current.dispose();
    expect(disposed).toHaveBeenCalledOnce();
    expect(geometryDisposed).not.toHaveBeenCalled();
    reference.dispose();
  });

  it("bounds payloads and isolates a failed Formula request from the successful GT cache", async () => {
    expect(() =>
      validateVehicleContainer(bytes().slice(0, 80), "formula26"),
    ).toThrow();
    expect(() =>
      validateVehicleContainer(new ArrayBuffer(3000001), "formula26"),
    ).toThrow(/budget/);
    let failed = false;
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("formula26") && !failed) {
        failed = true;
        return new Response("unavailable", { status: 503 });
      }
      return new Response(
        bytes(url.includes("formula26") ? "formula26" : "gt"),
      );
    });
    vi.stubGlobal("fetch", fetch);
    await expect(loadPremiumVehicle("formula26")).rejects.toThrow(
      /unavailable/,
    );
    const gt = loadPremiumVehicle("gt");
    await gt;
    const formula = loadPremiumVehicle("formula26");
    expect(loadPremiumVehicle("formula26")).toBe(formula);
    await formula;
    expect(loadPremiumVehicle("gt")).toBe(gt);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
