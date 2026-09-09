import { describe, expect, it } from "vitest";
import formula from "../../data/vehicles/formula-development.json";
import gt from "../../data/vehicles/gt-development.json";
import { vehicleSchema } from "../../packages/shared/schema";
import {
  prepareVehicleProfile,
  vehicleProfileFingerprint,
  vehicleProfileSchema,
} from "../../packages/shared/vehicle-profile";

describe("bounded editable vehicle profiles", () => {
  it("accepts built-in exports, preserves drivetrain checks and keeps archived readers independent", () => {
    expect(vehicleProfileSchema.parse(formula)).toEqual(
      vehicleSchema.parse(formula),
    );
    expect(vehicleProfileSchema.parse(gt)).toEqual(vehicleSchema.parse(gt));
    for (const change of [
      { mass: 1e12 },
      { wheelRadius: "0.34" },
      { assumptions: [] },
      { gearRatios: [1, 2] },
      { powerKw: 600 },
      { unexpectedTuning: 1 },
      {
        sources: [
          {
            title: "Fixture",
            url: `https://example.com/${"x".repeat(2083)}`,
            fields: ["mass"],
          },
        ],
      },
    ])
      expect(
        vehicleProfileSchema.safeParse({ ...formula, ...change }).success,
      ).toBe(false);
    const archived = { ...formula, mass: 5000 };
    expect(vehicleSchema.parse(archived).mass).toBe(5000);
    expect(vehicleProfileSchema.safeParse(archived).success).toBe(false);
  });
  it("hashes canonical profile content independently of assigned ID and input key order", async () => {
    const source = vehicleProfileSchema.parse(formula);
    const reordered = Object.fromEntries(Object.entries(source).reverse());
    const fingerprint = await vehicleProfileFingerprint(source);
    expect(
      await vehicleProfileFingerprint(vehicleProfileSchema.parse(reordered)),
    ).toBe(fingerprint);
    expect(
      await vehicleProfileFingerprint({
        ...source,
        id: "renamed-local-profile",
      }),
    ).toBe(fingerprint);
    expect(
      await vehicleProfileFingerprint({
        ...source,
        name: "Different declared name",
      }),
    ).not.toBe(fingerprint);
    expect(
      await vehicleProfileFingerprint({ ...source, mass: source.mass + 1 }),
    ).not.toBe(fingerprint);
  });
  it("isolates colliding IDs, preserves metadata and reuses repeated imports without mutation", async () => {
    const original = vehicleProfileSchema.parse({
      ...formula,
      id: "a".repeat(64),
    });
    const vehicles = [original];
    const imported = {
      ...original,
      name: "User profile",
      mass: 950,
      assumptions: ["Original test fixture, not calibrated"],
    };
    const before = JSON.stringify({ vehicles, imported });
    const prepared = await prepareVehicleProfile(imported, vehicles);
    expect(prepared.addVehicle).toBe(true);
    expect(prepared.renamedVehicle).toBe(true);
    expect(prepared.vehicle.id.length).toBeLessThanOrEqual(64);
    expect(prepared.vehicle.name).toBe(imported.name);
    expect(prepared.vehicle.assumptions).toEqual(imported.assumptions);
    expect(JSON.stringify({ vehicles, imported })).toBe(before);
    const repeated = await prepareVehicleProfile(imported, [
      ...vehicles,
      prepared.vehicle,
    ]);
    expect(repeated.addVehicle).toBe(false);
    expect(repeated.vehicle).toBe(prepared.vehicle);
    const occupied = { ...prepared.vehicle, mass: 1000 };
    const suffixed = await prepareVehicleProfile(imported, [
      ...vehicles,
      occupied,
    ]);
    expect(suffixed.vehicle.id).not.toBe(occupied.id);
    expect(suffixed.vehicle.id.length).toBeLessThanOrEqual(64);
    expect((await prepareVehicleProfile(original, vehicles)).addVehicle).toBe(
      false,
    );
  });
});
