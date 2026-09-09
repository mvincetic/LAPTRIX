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

export const projectFileSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    projectName: z.string().max(80).default("Imported workspace"),
    track: trackSchema,
    vehicle: vehicleSchema,
    setup: setupSchema,
    lap: lapSchema.nullable().optional(),
    reference: z.unknown().optional(),
  })
  .strict();

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
  const vehicle = catalog.vehicles.find((v) => v.id === file.vehicle.id);
  if (!vehicle || physicsSignature(vehicle) !== physicsSignature(file.vehicle))
    throw new Error(
      "The exported vehicle physics do not match an installed profile. Import its lap as a reference to compare it with the current models.",
    );
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
    setup: file.setup,
    reference,
    addTrack: !existing,
    renamedTrack: track.id !== file.track.id,
  };
}
