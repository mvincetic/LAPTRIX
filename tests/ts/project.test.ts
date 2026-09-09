import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import formula from "../../data/vehicles/formula-development.json";
import {
  catalogSchema,
  defaultSetup,
  type TimingReference,
} from "../../packages/shared/schema";
import { trackFingerprint } from "../../packages/track-engine";
import { prepareProject } from "../../apps/web/src/project";

const catalog = catalogSchema.parse({ tracks: [data], vehicles: [formula] });
const project = {
  version: 2,
  projectName: "Portable setup",
  track: catalog.tracks[0],
  vehicle: catalog.vehicles[0],
  setup: defaultSetup,
  lap: null,
  reference: null,
};

describe("portable project preparation", () => {
  it("keeps legacy sector semantics when geometry matches a newer catalog track", async () => {
    const legacy = {
      ...project,
      track: { ...project.track, schemaVersion: 1 as const },
    };
    const prepared = await prepareProject(legacy, catalog);
    expect(prepared.track.schemaVersion).toBe(1);
    expect(prepared.renamedTrack).toBe(true);
    expect(prepared.addTrack).toBe(true);
    expect(await trackFingerprint(prepared.track)).toBe(
      await trackFingerprint(project.track),
    );
    const repeated = await prepareProject(legacy, {
      ...catalog,
      tracks: [...catalog.tracks, prepared.track],
    });
    expect(repeated.track.id).toBe(prepared.track.id);
    expect(repeated.addTrack).toBe(false);
  });
  it("accepts current exports and gives legacy unnamed bundles a default name", async () => {
    const parsed = await prepareProject(project, catalog);
    expect(parsed.projectName).toBe("Portable setup");
    expect(parsed.addTrack).toBe(false);
    expect(parsed.setup).toEqual(defaultSetup);
    const legacy = { ...project, version: 1, projectName: undefined };
    expect((await prepareProject(legacy, catalog)).projectName).toBe(
      "Imported workspace",
    );
    expect(
      (await prepareProject({ ...project, projectName: "" }, catalog))
        .projectName,
    ).toBe("");
  });
  it("rejects unsupported versions and mismatched physical vehicle inputs", async () => {
    await expect(
      prepareProject({ ...project, version: 3 }, catalog),
    ).rejects.toThrow();
    for (const vehicle of [
      { ...project.vehicle, mass: 900 },
      { ...project.vehicle, id: "unknown-profile" },
    ])
      await expect(
        prepareProject({ ...project, vehicle }, catalog),
      ).rejects.toThrow(/installed profile/);
    expect(
      (
        await prepareProject(
          { ...project, vehicle: { ...project.vehicle, name: "An old label" } },
          catalog,
        )
      ).vehicle.name,
    ).toBe(formula.name);
  });
  it("isolates a colliding track ID, updates the reference identity and reuses repeat imports", async () => {
    const track = structuredClone(project.track);
    track.points[1].widthLeft += 0.1;
    const fingerprint = await trackFingerprint(track);
    const reference: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Timing fixture",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Synthetic unit test",
      trackId: track.id,
      lapTime: 90,
      units: { time: "s", progress: "fraction" },
      alignment: { trackFingerprint: fingerprint, progress: [0, 0.5, 1] },
      samples: [{ time: 0 }, { time: 45 }, { time: 90 }],
    };
    const before = JSON.stringify(catalog);
    const input = { ...project, track, reference };
    const prepared = await prepareProject(input, catalog);
    expect(prepared.renamedTrack).toBe(true);
    expect(prepared.addTrack).toBe(true);
    expect(prepared.reference?.trackId).toBe(prepared.track.id);
    expect(prepared.reference?.alignment?.trackFingerprint).toBe(fingerprint);
    expect(JSON.stringify(catalog)).toBe(before);
    expect(input.track.id).toBe(data.id);
    const again = await prepareProject(input, {
      ...catalog,
      tracks: [...catalog.tracks, prepared.track],
    });
    expect(again.addTrack).toBe(false);
    expect(again.track.id).toBe(prepared.track.id);
    await expect(
      prepareProject(
        {
          ...input,
          reference: {
            ...reference,
            alignment: {
              ...reference.alignment,
              trackFingerprint: `sha256:${"0".repeat(64)}`,
            },
          },
        },
        catalog,
      ),
    ).rejects.toThrow(/reference does not match/);
  });
});
