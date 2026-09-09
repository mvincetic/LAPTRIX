import { describe, expect, it } from "vitest";
import data from "../../data/tracks/ardennes-development.json";
import {
  parseReference,
  timingReferenceSchema,
  trackSchema,
} from "../../packages/shared/schema";
import { restoreReference } from "../../apps/web/src/reference";
import { trackFingerprint } from "../../packages/track-engine";

const track = trackSchema.parse(data);
const source = {
  format: "laptrix-timing-reference-v1",
  label: "Test logger lap",
  vehicleLabel: "Test coupe",
  origin: "recorded",
  source: "Synthetic test fixture, not a real logger recording",
  trackId: track.id,
  lapTime: 80,
  units: { time: "s", progress: "fraction" },
  alignment: {
    trackFingerprint:
      "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689",
    progress: [0, 0.25, 0.7, 1],
  },
  samples: [0, 21, 54, 80].map((time) => ({ time })),
};
describe("external timing-reference validation", () => {
  it("restores declared timing only against its matching physical source", async () => {
    const parsed = timingReferenceSchema.parse(source);
    expect(parsed.alignment.trackFingerprint).toBe(
      await trackFingerprint(track),
    );
    expect(await restoreReference(parsed, track)).toEqual(parsed);
    const changed = structuredClone(track);
    changed.points[1].x += 0.1;
    expect(await restoreReference(parsed, changed)).toBeNull();
    expect("optimization" in parsed).toBe(false);
    expect("speed" in parsed.samples[0]).toBe(false);
  });
  it.each([
    { units: { time: "ms", progress: "fraction" } },
    { source: "" },
    { format: "unknown-format" },
    { lapTime: 90 },
    { samples: [] },
    { samples: [0, 21, 20, 80].map((time) => ({ time })) },
    { samples: [1, 21, 54, 80].map((time) => ({ time })) },
    { alignment: { ...source.alignment, progress: [0, 0.4, 0.3, 1] } },
    { alignment: { ...source.alignment, progress: [0, 0.4, 0.7, 0.99] } },
    { alignment: { ...source.alignment, progress: [0, 0.4, 1] } },
  ])(
    "rejects unsupported units, provenance, intervals and ordering: %j",
    (change) => {
      expect(() => parseReference({ ...source, ...change })).toThrow();
    },
  );
  it("reports malformed native exports as validation errors", () => {
    expect(() => parseReference({ schemaVersion: 1, samples: [] })).toThrow(
      /trackId/,
    );
  });
});
