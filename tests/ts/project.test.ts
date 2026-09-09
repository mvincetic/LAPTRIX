import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import formula from "../../data/vehicles/formula-development.json";
import {
  catalogSchema,
  defaultSetup,
  type TimingReference,
} from "../../packages/shared/schema";
import { trackFingerprint } from "../../packages/track-engine";
import {
  prepareProject,
  prepareSavedProject,
} from "../../apps/web/src/project";

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
  it("requires an explicit v3 vehicle source and retains the legacy installed-physics boundary", async () => {
    for (const version of [1, 2]) {
      await expect(
        prepareProject(
          { ...project, version, vehicleSource: "embedded" },
          catalog,
        ),
      ).rejects.toThrow();
      await expect(
        prepareProject(
          { ...project, version, vehicle: { ...project.vehicle, mass: 950 } },
          catalog,
        ),
      ).rejects.toThrow(/installed profile/);
    }
    await expect(
      prepareProject({ ...project, version: 3 }, catalog),
    ).rejects.toThrow(/vehicle source/);
    const installed = await prepareProject(
      { ...project, version: 3, vehicleSource: "catalog" },
      catalog,
    );
    expect(installed.vehicle).toBe(catalog.vehicles[0]);
    expect(installed.embeddedVehicle).toBeUndefined();
    await expect(
      prepareProject(
        {
          ...project,
          version: 3,
          vehicleSource: "catalog",
          vehicle: { ...project.vehicle, mass: 950 },
        },
        catalog,
      ),
    ).rejects.toThrow(/installed profile/);
  });
  it("preserves embedded metadata, isolates vehicle collisions, and reuses repeat imports", async () => {
    const vehicle = {
      ...project.vehicle,
      mass: 950,
      name: "User profile",
      assumptions: ["Unverified fixture"],
    };
    const input = {
      ...project,
      version: 3,
      vehicleSource: "embedded",
      vehicle,
    };
    const before = JSON.stringify({ input, catalog });
    const prepared = await prepareProject(input, catalog);
    expect(prepared.addVehicle).toBe(true);
    expect(prepared.renamedVehicle).toBe(true);
    expect(prepared.vehicle.id).not.toBe(vehicle.id);
    expect({ ...prepared.vehicle, id: vehicle.id }).toEqual(vehicle);
    expect(prepared.embeddedVehicle).toBe(prepared.vehicle);
    expect(JSON.stringify({ input, catalog })).toBe(before);
    const repeated = await prepareProject(input, {
      ...catalog,
      vehicles: [...catalog.vehicles, prepared.vehicle],
    });
    expect(repeated.vehicle).toBe(prepared.vehicle);
    expect(repeated.addVehicle).toBe(false);
  });
  it("validates embedded inputs before archival defaults or unknown-field stripping", async () => {
    const embedded = { ...project, version: 3, vehicleSource: "embedded" };
    for (const change of [
      { mass: 5000 },
      { description: undefined },
      { assumptions: undefined },
      { unexpected: 1 },
      {
        powerCurve: project.vehicle.powerCurve.map((point) => ({
          ...point,
          unexpected: 1,
        })),
      },
      {
        sources: [
          {
            title: "Fixture",
            url: "https://example.com/",
            fields: ["mass"],
            unexpected: 1,
          },
        ],
      },
    ])
      await expect(
        prepareProject(
          { ...embedded, vehicle: { ...project.vehicle, ...change } },
          catalog,
        ),
      ).rejects.toThrow();
  });
  it("restores local inline profiles and colliding source geometry through a pure boundary", async () => {
    const customTrack = structuredClone(project.track);
    customTrack.points[1].widthLeft += 0.1;
    const saved = {
      version: 1,
      projectName: "Saved custom work",
      trackId: customTrack.id,
      vehicleId: formula.id,
      customTrack,
      customVehicle: { ...project.vehicle, mass: 950 },
      setup: { ...defaultSetup, fuel: 100 },
    };
    const before = JSON.stringify({ catalog, saved });
    const prepared = await prepareSavedProject(saved, catalog);
    expect(prepared.renamedTrack).toBe(true);
    expect(prepared.renamedVehicle).toBe(true);
    expect(prepared.embeddedVehicle?.mass).toBe(950);
    expect(prepared.setup.fuel).toBe(100);
    expect(prepared.projectName).toBe("Saved custom work");
    expect(JSON.stringify({ catalog, saved })).toBe(before);
    const legacy = await prepareSavedProject(
      {
        version: 1,
        trackId: "removed",
        vehicleId: "removed",
        projectName: 5,
        setup: defaultSetup,
      },
      catalog,
    );
    expect(legacy.vehicle).toBe(project.vehicle);
    expect(legacy.track).toBe(project.track);
    expect(legacy.embeddedVehicle).toBeUndefined();
    expect(legacy.projectName).toBe("Development workspace");
  });
  it("drops a mismatched saved reference while retaining valid setup and rejects malformed saves", async () => {
    const reference: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Different source",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Synthetic fixture",
      trackId: project.track.id,
      lapTime: 90,
      units: { time: "s", progress: "fraction" },
      alignment: {
        trackFingerprint: `sha256:${"0".repeat(64)}`,
        progress: [0, 1],
      },
      samples: [{ time: 0 }, { time: 90 }],
    };
    const saved = {
      version: 1,
      setup: { ...defaultSetup, fuel: 100 },
      reference,
    };
    const prepared = await prepareSavedProject(saved, catalog);
    expect(prepared.reference).toBeNull();
    expect(prepared.setup.fuel).toBe(100);
    await expect(
      prepareSavedProject(
        { ...saved, reference: { malformed: true } },
        catalog,
      ),
    ).rejects.toThrow();
    await expect(
      prepareSavedProject(
        { ...saved, customVehicle: { ...project.vehicle, mass: 5000 } },
        catalog,
      ),
    ).rejects.toThrow();
  });
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
      prepareProject({ ...project, version: 4 }, catalog),
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
