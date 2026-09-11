import { describe, expect, it } from "vitest";
import data from "../../data/tracks/red-bull-ring.json";
import dev from "../../data/tracks/ardennes-development.json";
import formula from "../../data/vehicles/formula-development.json";
import {
  catalogSchema,
  defaultSetup,
  trackSchema,
} from "../../packages/shared/schema";
import { normalizeTrack, trackFingerprint } from "../../packages/track-engine";
import { prepareProject } from "../../apps/web/src/project";

describe("bundled showcase source", () => {
  it("keeps both sources and round-trips attribution through portable projects", async () => {
    const catalog = catalogSchema.parse({
      tracks: [dev, data],
      vehicles: [formula],
    });
    const track = catalog.tracks[1];
    const prepared = await prepareProject(
      {
        version: 3,
        projectName: "Austria showcase",
        vehicleSource: "catalog",
        track,
        vehicle: catalog.vehicles[0],
        setup: defaultSetup,
        lap: null,
        reference: null,
      },
      catalog,
    );
    expect(prepared.track).toBe(track);
    expect(prepared.addTrack).toBe(false);
    expect(prepared.track.attribution).toEqual(data.attribution);
    expect(catalog.tracks[0].name).toBe("LAPTRIX Dev Track");
    expect(await trackFingerprint({ ...track, attribution: undefined })).toBe(
      await trackFingerprint(track),
    );
    const frame = normalizeTrack(track);
    expect(frame.length).toBeCloseTo(4311.389293, 5);
    expect(frame.elevationRange).toBeCloseTo(63.2722, 4);
  });
  it("rejects unsafe or unbounded source metadata while preserving legacy track input", () => {
    expect(trackSchema.safeParse(dev).success).toBe(true);
    for (const key of ["url", "licenseUrl"] as const) {
      const invalid = structuredClone(data);
      invalid.attribution.sources[0][key] = "javascript:alert(1)";
      expect(trackSchema.safeParse(invalid).success).toBe(false);
    }
    for (const patch of [
      { sources: [] },
      { notes: "x".repeat(1201) },
      { documentationUrl: "file:///private" },
    ]) {
      expect(
        trackSchema.safeParse({
          ...data,
          attribution: { ...data.attribution, ...patch },
        }).success,
      ).toBe(false);
    }
  });
});
