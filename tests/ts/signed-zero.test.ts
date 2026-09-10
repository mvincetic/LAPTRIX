import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import formula from "../../data/vehicles/formula-development.json";
import {
  catalogSchema,
  defaultSetup,
  lapSchema,
  timingReferenceSchema,
  trackSchema,
  type Track,
} from "../../packages/shared/schema";
import { normalizeTrack, trackFingerprint } from "../../packages/track-engine";
import { restoreReference } from "../../apps/web/src/reference";
import {
  prepareProject,
  prepareSavedProject,
} from "../../apps/web/src/project";

const canonical =
  "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689";
// Independently recorded from the previous Python/TypeScript IEEE-754 byte layout.
const legacy =
  "sha256:02cd7ca6d3467ef0f57345b850074b7539c08e80425946e800806f5521bb9633";
const track = trackSchema.parse(data);
const signedTrack = () => {
  const source = structuredClone(track);
  source.points[0].banking = -0;
  return source;
};
function timing(hash = canonical) {
  return timingReferenceSchema.parse({
    format: "laptrix-timing-reference-v1",
    label: "Signed-zero fixture",
    vehicleLabel: "Test",
    origin: "external-simulation",
    source: "Original synthetic test data",
    trackId: track.id,
    lapTime: 80,
    units: { time: "s", progress: "fraction" },
    alignment: { trackFingerprint: hash, progress: [0, 0.25, 0.7, 1] },
    samples: [0, 21, 54, 80].map((time) => ({ time })),
  });
}
function native(source: Track, hash = legacy) {
  const frame = normalizeTrack(source);
  const distance = [...frame.distances, frame.length];
  return lapSchema.parse({
    schemaVersion: 1,
    trackId: source.id,
    vehicleId: formula.id,
    setup: defaultSetup,
    model: "Original synthetic fixture, not measured telemetry",
    lapTime: 80,
    length: frame.length,
    maxSpeed: frame.length / 80,
    averageSpeed: frame.length / 80,
    elevationRange: 100,
    computationMs: 1,
    warnings: [],
    optimization: { method: "Test", converged: true, iterations: 0 },
    alignment: {
      trackFingerprint: hash,
      progress: distance.map((d) => d / frame.length),
    },
    samples: distance.map((d, i) => ({
      distance: d,
      time: (d / frame.length) * 80,
      x: source.points[i % source.points.length].x,
      y: source.points[i % source.points.length].y,
      z: source.points[i % source.points.length].z,
      speed: frame.length / 80,
      rpm: 4000,
      gear: 1,
      throttle: 1,
      brake: 0,
      steering: 0,
      longitudinalG: 0,
      lateralG: 0,
      verticalG: 0,
      trackGradient: 0,
      cornerId: 0,
      sectorId: 1,
      offset: 0,
    })),
    sampling: {
      mode: "source",
      sourcePointCount: source.points.length,
      pointCount: source.points.length,
      targetSpacing: null,
      meanSpacing: frame.length / source.points.length,
      maxSpacing: 20,
      capped: false,
      maxSourceDeviation: 0,
      points: source.points,
    },
    corners: [],
    sectors: source.sectorFractions.map((end, i) => ({
      id: i + 1,
      time: (end - (source.sectorFractions[i - 1] ?? 0)) * 80,
      split: end * 80,
      startDistance: (source.sectorFractions[i - 1] ?? 0) * frame.length,
      endDistance: end * frame.length,
    })),
  });
}

describe("JSON-stable physical source identity", () => {
  it("preserves the existing positive-zero hash and canonicalizes accepted signed-zero JSON", async () => {
    const parsed = trackSchema.parse(
      JSON.parse(JSON.stringify(data).replace('"banking":0', '"banking":-0')),
    );
    expect(Object.is(parsed.points[0].banking, -0)).toBe(true);
    expect(await trackFingerprint(track)).toBe(canonical);
    expect(await trackFingerprint(parsed)).toBe(canonical);
    expect(
      await trackFingerprint(
        trackSchema.parse(JSON.parse(JSON.stringify(parsed))),
      ),
    ).toBe(canonical);
    expect(Object.is(parsed.points[0].banking, -0)).toBe(true);
  });
  it.each(["x", "y", "z"] as const)(
    "canonicalizes exact zero in %s without rounding nonzero geometry",
    async (key) => {
      const translated = structuredClone(track);
      const origin = translated.points[0][key];
      translated.points.forEach((p) => {
        p[key] -= origin;
      });
      const expected = await trackFingerprint(trackSchema.parse(translated));
      translated.points[0][key] = -0;
      expect(await trackFingerprint(translated)).toBe(expected);
      translated.points[0][key] = Number.MIN_VALUE;
      expect(await trackFingerprint(translated)).not.toBe(expected);
    },
  );
  it("retains current references by identity and migrates a proven legacy hash without changing samples", async () => {
    const source = signedTrack();
    const current = timing();
    expect(await restoreReference(current, source)).toBe(current);
    const old = timing(legacy);
    const restored = await restoreReference(old, source);
    expect(restored).toEqual({
      ...old,
      alignment: { ...old.alignment, trackFingerprint: canonical },
    });
    expect(restored?.samples).toBe(old.samples);
    expect(restored?.alignment?.progress).toBe(old.alignment.progress);
    expect(old.alignment.trackFingerprint).toBe(legacy);
    expect(await restoreReference(old, track)).toBeNull();
  });
  it("recovers legacy native identity from a verified original source grid after source zero signs are lost", async () => {
    const old = native(signedTrack());
    const restored = await restoreReference(old, track);
    expect(restored).toEqual({
      ...old,
      alignment: { ...old.alignment, trackFingerprint: canonical },
    });
    expect(restored?.samples).toBe(old.samples);
    expect(old.alignment?.trackFingerprint).toBe(legacy);
    expect(Object.is(old.sampling!.points[0].banking, -0)).toBe(true);
  });
  it("rejects unproven or resampled legacy source claims", async () => {
    const old = native(signedTrack());
    const resampled = structuredClone(old);
    resampled.sampling!.mode = "5m";
    const wrongCount = structuredClone(old);
    wrongCount.sampling!.sourcePointCount -= 1;
    const changed = structuredClone(old);
    changed.sampling!.points[5].widthLeft += 0.1;
    const erasedSigns = JSON.parse(JSON.stringify(old));
    for (const candidate of [
      resampled,
      wrongCount,
      changed,
      erasedSigns,
      { ...old, sampling: undefined },
    ])
      expect(await restoreReference(candidate, track)).toBeNull();
  });
  it("rejects genuine coordinate, width, gate and identity changes during legacy migration", async () => {
    const old = native(signedTrack());
    for (const change of [
      (t: Track) => {
        t.points[1].x += 0.01;
      },
      (t: Track) => {
        t.points[1].widthRight -= 0.01;
      },
      (t: Track) => {
        t.sectorFractions[0] += 0.001;
      },
      (t: Track) => {
        t.id += "-other";
      },
    ]) {
      const changed = signedTrack();
      change(changed);
      expect(await restoreReference(old, changed)).toBeNull();
    }
  });
  it("migrates portable/local references and reuses the matching catalog source without a false collision", async () => {
    const catalog = catalogSchema.parse({
      tracks: [track],
      vehicles: [formula],
    });
    const source = signedTrack();
    const bundle = {
      version: 3,
      vehicleSource: "catalog",
      track: source,
      vehicle: formula,
      setup: defaultSetup,
      reference: timing(legacy),
      lap: native(source),
      projectName: "Zero fixture",
    };
    const prepared = await prepareProject(bundle, catalog);
    expect(prepared.track).toBe(catalog.tracks[0]);
    expect(prepared.renamedTrack).toBe(false);
    expect(prepared.addTrack).toBe(false);
    expect(prepared.reference?.alignment?.trackFingerprint).toBe(canonical);
    const saved = {
      version: 1,
      customTrack: source,
      vehicleId: formula.id,
      setup: defaultSetup,
      reference: timing(legacy),
      projectName: "Zero fixture",
    };
    expect((await prepareSavedProject(saved, catalog)).reference).toEqual(
      timing(),
    );
    const roundTrip = JSON.parse(
      JSON.stringify({
        ...bundle,
        reference: prepared.reference,
        lap: native(source, canonical),
      }),
    );
    expect((await prepareProject(roundTrip, catalog)).reference).toEqual(
      timing(),
    );
    const differentVersion = {
      ...bundle,
      track: { ...source, schemaVersion: 1 },
    };
    expect((await prepareProject(differentVersion, catalog)).renamedTrack).toBe(
      true,
    );
  });
});
