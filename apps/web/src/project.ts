import { z } from "zod";
import {
  lapSchema,
  parseReference,
  setupSchema,
  trackSchema,
  vehicleSchema,
  type Catalog,
  type Reference,
  type Vehicle,
} from "../../../packages/shared/schema";
import { trackFingerprint } from "../../../packages/track-engine";
import { restoreReference } from "./reference";
import {
  prepareVehicleProfile,
  vehicleProfileSchema,
} from "../../../packages/shared/vehicle-profile";

export const projectFileSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    vehicleSource: z.enum(["catalog", "embedded"]).optional(),
    projectName: z.string().max(80).default("Imported workspace"),
    track: trackSchema,
    vehicle: z.unknown(),
    setup: setupSchema,
    lap: lapSchema.nullable().optional(),
    reference: z.unknown().optional(),
  })
  .strict()
  .superRefine((file, context) => {
    if ((file.version === 3) !== (file.vehicleSource !== undefined))
      context.addIssue({
        code: "custom",
        path: ["vehicleSource"],
        message:
          "Version 3 requires a vehicle source; earlier versions must omit it",
      });
  })
  .transform((file, context) => {
    // Validate editable profiles before the archival reader can apply defaults
    // or discard unknown fields, including nested source/power-curve fields.
    const schema =
      file.version === 3 && file.vehicleSource === "embedded"
        ? vehicleProfileSchema
        : vehicleSchema;
    const validation = schema.safeParse(file.vehicle);
    if (!validation.success) {
      for (const issue of validation.error.issues)
        context.addIssue({ ...issue, path: ["vehicle", ...issue.path] });
      return z.NEVER;
    }
    return { ...file, vehicle: validation.data };
  });

const physicsKeys = [
  "mass",
  "powerKw",
  "powerCurve",
  "dragArea",
  "downforceArea",
  "friction",
  "maxBrakeG",
  "gearRatios",
  "finalDrive",
  "wheelRadius",
  "wheelbase",
  "idleRpm",
  "maxRpm",
  "width",
] as const;
const physicsSignature = (vehicle: Vehicle) =>
  JSON.stringify(physicsKeys.map((key) => vehicle[key]));

const savedProjectSchema = z.object({
  version: z.literal(1),
  projectName: z.unknown().optional(),
  trackId: z.string().optional(),
  vehicleId: z.string().optional(),
  setup: setupSchema,
  customTrack: trackSchema.optional(),
  customVehicle: vehicleProfileSchema.optional(),
  reference: z.unknown().optional(),
});

/** Adapt local saves through the same collision/validation boundary as portable files. */
export async function prepareSavedProject(value: unknown, catalog: Catalog) {
  const saved = savedProjectSchema.parse(value);
  const track =
    saved.customTrack ??
    catalog.tracks.find((item) => item.id === saved.trackId) ??
    catalog.tracks[0];
  const vehicle =
    saved.customVehicle ??
    catalog.vehicles.find((item) => item.id === saved.vehicleId) ??
    catalog.vehicles[0];
  const reference =
    saved.reference == null
      ? null
      : await restoreReference(parseReference(saved.reference), track);
  return prepareProject(
    {
      version: 3,
      vehicleSource: saved.customVehicle ? "embedded" : "catalog",
      projectName:
        typeof saved.projectName === "string"
          ? saved.projectName.slice(0, 80)
          : "Development workspace",
      track,
      vehicle,
      setup: saved.setup,
      reference,
    },
    catalog,
  );
}

/** Validate everything before any workspace state changes or network calculation. */
export async function prepareProject(value: unknown, catalog: Catalog) {
  const validation = projectFileSchema.safeParse(value);
  if (!validation.success)
    throw new Error(
      validation.error.issues
        .slice(0, 2)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  const file = validation.data;
  const embedded = file.version === 3 && file.vehicleSource === "embedded";
  let vehicle: Vehicle;
  let addVehicle = false,
    renamedVehicle = false;
  if (embedded) {
    const profile = await prepareVehicleProfile(file.vehicle, catalog.vehicles);
    vehicle = profile.vehicle;
    addVehicle = profile.addVehicle;
    renamedVehicle = profile.renamedVehicle;
  } else {
    const installed = catalog.vehicles.find((v) => v.id === file.vehicle.id);
    if (
      !installed ||
      physicsSignature(installed) !== physicsSignature(file.vehicle)
    )
      throw new Error(
        "The exported vehicle physics do not match an installed profile. Import its lap as a reference to compare it with the current models.",
      );
    vehicle = installed;
  }
  if (file.lap && !(await restoreReference(file.lap, file.track)))
    throw new Error(
      "The archived lap does not match the project's source track.",
    );
  let reference: Reference | null = null;
  if (file.reference != null) {
    reference = await restoreReference(
      parseReference(file.reference),
      file.track,
    );
    if (!reference)
      throw new Error("The project reference does not match its source track.");
  }
  const fingerprint = await trackFingerprint(file.track);
  let track = file.track;
  let existing = catalog.tracks.find((t) => t.id === track.id);
  if (
    existing &&
    (existing.schemaVersion !== track.schemaVersion ||
      (await trackFingerprint(existing)) !== fingerprint)
  ) {
    const base = `${track.id.slice(0, 46)}-import-${fingerprint.slice(7, 15)}`;
    let id = base,
      suffix = 2;
    while (true) {
      existing = catalog.tracks.find((t) => t.id === id);
      if (
        !existing ||
        (existing.schemaVersion === track.schemaVersion &&
          (await trackFingerprint(existing)) === fingerprint)
      )
        break;
      const tail = `-${suffix++}`;
      id = `${base.slice(0, 64 - tail.length)}${tail}`;
    }
    track = { ...track, id };
    if (reference) reference = { ...reference, trackId: id };
  }
  return {
    projectName: file.projectName,
    track: existing ?? track,
    vehicle,
    embeddedVehicle: embedded ? vehicle : undefined,
    addVehicle,
    renamedVehicle,
    setup: file.setup,
    reference,
    addTrack: !existing,
    renamedTrack: track.id !== file.track.id,
  };
}
