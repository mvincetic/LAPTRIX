import { describe, expect, it } from "vitest";
import type { Lap } from "../../packages/shared/schema";
import {
  plotViewport,
  viewportFraction,
  viewportLapFraction,
} from "../../apps/web/src/plotViewport";

const lap = {
  length: 100,
  lapTime: 20,
  sectors: [
    { id: 1, time: 4, split: 4, startDistance: 0, endDistance: 40 },
    { id: 2, time: 11, split: 15, startDistance: 40, endDistance: 90 },
    { id: 3, time: 5, split: 20, startDistance: 90, endDistance: 100 },
  ],
} as Lap;

describe("sector plot viewport", () => {
  it("uses actual sector gates on unequal time and distance axes", () => {
    expect(plotViewport(lap, "distance", 2)).toEqual({
      start: 40,
      end: 90,
      fullExtent: 100,
      sectorId: 2,
      custom: false,
      x: 400,
      width: 500,
    });
    expect(plotViewport(lap, "time", 2)).toEqual({
      start: 4,
      end: 15,
      fullExtent: 20,
      sectorId: 2,
      custom: false,
      x: 200,
      width: 550,
    });
    expect(plotViewport(lap, "time", 3).end).toBe(20);
    expect(plotViewport(lap, "distance", 1).start).toBe(0);
  });
  it("maps pointer positions into the full-lap clock while clipping outside cursor positions honestly", () => {
    const distance = plotViewport(lap, "distance", 2);
    const time = plotViewport(lap, "time", 2);
    expect(viewportLapFraction(0.5, distance)).toBe(0.65);
    expect(viewportLapFraction(0.5, time)).toBe(0.475);
    expect(viewportLapFraction(-1, distance)).toBe(0.4);
    expect(viewportLapFraction(2, distance)).toBe(0.9);
    expect(viewportFraction(65, distance)).toBe(0.5);
    expect(viewportFraction(0, distance)).toBe(-0.8);
    expect(viewportFraction(100, distance)).toBe(1.2);
    expect(() => viewportLapFraction(NaN, time)).toThrow(/finite/);
  });
  it("returns the full lap for cleared or stale selections without altering canonical data", () => {
    const before = structuredClone(lap);
    for (const id of [null, 99]) {
      expect(plotViewport(lap, "time", id)).toEqual({
        start: 0,
        end: 20,
        fullExtent: 20,
        sectorId: null,
        custom: false,
        x: 0,
        width: 1000,
      });
    }
    expect(lap).toEqual(before);
    expect(plotViewport(null, "distance", 2)).toEqual({
      start: 0,
      end: 1,
      fullExtent: 1,
      sectorId: null,
      custom: false,
      x: 0,
      width: 1000,
    });
  });
});
