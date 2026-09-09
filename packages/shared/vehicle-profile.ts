import { z } from "zod";
import { vehicleSchema, type Vehicle } from "./schema";

/** Editable development inputs are bounded independently of archived snapshots. */
export const vehicleProfileSchema = vehicleSchema
  .safeExtend({
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(1000),
    sources: z
      .array(
        z
          .object({
            title: z.string().min(1).max(200),
            url: z.url({ protocol: /^https?$/ }).max(2083),
            fields: z.array(z.string().min(1).max(100)).min(1).max(32),
          })
          .strict(),
      )
      .max(16)
      .default([]),
    assumptions: z.array(z.string().min(1).max(500)).min(1).max(32),
    mass: z.number().gt(100).max(4000),
    powerKw: z.number().min(1).max(2000),
    powerCurve: z
      .array(
        z
          .object({
            rpm: z.number().positive().max(30000),
            powerKw: z.number().positive().max(2000),
          })
          .strict(),
      )
      .min(2)
      .max(128),
    dragArea: z.number().min(0.1).max(10),
    downforceArea: z.number().min(0).max(20),
    friction: z.number().min(0.3).max(3),
    maxBrakeG: z.number().min(0.3).max(8),
    gearRatios: z.array(z.number().min(0.1).max(20)).min(1).max(12),
    finalDrive: z.number().min(0.1).max(20),
    wheelRadius: z.number().min(0.15).max(0.6),
    wheelbase: z.number().min(1).max(5),
    idleRpm: z.number().min(100).max(5000),
    maxRpm: z.number().min(1000).max(25000),
    width: z.number().min(0.8).max(3),
  })
  .strict();

export async function vehicleProfileFingerprint(vehicle: Vehicle) {
  // Schema order/defaults stabilize key order; identity excludes the locally assigned ID.
  const parsed = vehicleProfileSchema.parse(vehicle);
  const data = new TextEncoder().encode(
    `laptrix.vehicle.v1\0${JSON.stringify({ ...parsed, id: undefined })}`,
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  return `sha256:${Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Prepare a repeatable local identity without changing the catalog or imported object. */
export async function prepareVehicleProfile(
  value: unknown,
  vehicles: Vehicle[],
) {
  const validation = vehicleProfileSchema.safeParse(value);
  if (!validation.success)
    throw new Error(
      `Vehicle JSON is invalid: ${validation.error.issues
        .slice(0, 2)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  const vehicle = validation.data;
  const fingerprint = await vehicleProfileFingerprint(vehicle);
  let existing = vehicles.find((item) => item.id === vehicle.id);
  let id = vehicle.id;
  const matches = async (item: Vehicle) =>
    vehicleProfileSchema.safeParse(item).success &&
    (await vehicleProfileFingerprint(item)) === fingerprint;
  if (existing && !(await matches(existing))) {
    const base = `${vehicle.id.slice(0, 46)}-import-${fingerprint.slice(7, 15)}`;
    id = base;
    let suffix = 2;
    while (true) {
      existing = vehicles.find((item) => item.id === id);
      if (!existing || (await matches(existing))) break;
      const tail = `-${suffix++}`;
      id = `${base.slice(0, 64 - tail.length)}${tail}`;
    }
  }
  return {
    vehicle: existing ?? { ...vehicle, id },
    addVehicle: !existing,
    renamedVehicle: id !== vehicle.id,
  };
}
