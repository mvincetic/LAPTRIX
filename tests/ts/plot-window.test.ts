import { describe, expect, it } from "vitest";
import type { Lap } from "../../packages/shared/schema";
import {
  createPlotWindow,
  plotTickLabel,
  plotViewport,
  viewportFraction,
  viewportLapFraction,
} from "../../apps/web/src/plotViewport";

const lap = {
  lapTime: 20,
  length: 100,
  samples: [
    { time: 0, distance: 0 },
    { time: 4, distance: 40 },
    { time: 15, distance: 90 },
    { time: 20, distance: 100 },
  ],
  sectors: [{ id: 1, time: 4, split: 4, startDistance: 0, endDistance: 40 }],
} as Lap;

describe("exact custom telemetry windows", () => {
  it("keeps exact time endpoints and converts unequal-speed distance independently", () => {
    const range = createPlotWindow(lap, 2, 9.5)!;
    expect(range).toEqual({ start: 2, end: 9.5 });
    expect(plotViewport(lap, "time", null, range)).toEqual({
      start: 2,
      end: 9.5,
      fullExtent: 20,
      x: 100,
      width: 375,
      sectorId: null,
      custom: true,
    });
    expect(plotViewport(lap, "distance", null, range)).toEqual({
      start: 20,
      end: 65,
      fullExtent: 100,
      x: 200,
      width: 450,
      sectorId: null,
      custom: true,
    });
    expect(plotViewport(lap, "time", null, range).start).toBe(2);
  });
  it("rejects unordered, nonfinite, out-of-lap and sub-millisecond windows", () => {
    for (const [start, end] of [
      [NaN, 5],
      [1, Infinity],
      [-1, 2],
      [4, 4],
      [5, 4],
      [0, 21],
      [10, 10.0009],
    ]) {
      expect(createPlotWindow(lap, start, end)).toBeNull();
      const viewport = plotViewport(lap, "time", null, { start, end });
      expect(viewport.custom).toBe(false);
      expect(viewport.width).toBe(1000);
    }
    expect(createPlotWindow(lap, 10, 10.001)).toEqual({
      start: 10,
      end: 10.001,
    });
  });
  it("allows the exact start/finish and retains source inputs", () => {
    const before = structuredClone(lap);
    const range = createPlotWindow(lap, 0, 20)!;
    for (const axis of ["time", "distance"] as const) {
      const viewport = plotViewport(lap, axis, null, range);
      expect(viewport.x).toBe(0);
      expect(viewport.width).toBe(1000);
      expect(viewport.end).toBe(viewport.fullExtent);
      expect(viewport.custom).toBe(true);
    }
    expect(lap).toEqual(before);
    const precise = 10.12345678901234;
    expect(createPlotWindow(lap, precise, precise + 1)?.start).toBe(precise);
  });
  it("rejects endpoints whose distance projection collapses", () => {
    const invalid = {
      ...lap,
      samples: [
        { time: 0, distance: 0 },
        { time: 20, distance: 0 },
      ],
    } as Lap;
    expect(createPlotWindow(invalid, 2, 10)).toBeNull();
  });
  it("maps local pointers without changing full-lap values or hiding outside cursors", () => {
    const viewport = plotViewport(lap, "distance", null, {
      start: 2,
      end: 9.5,
    });
    expect(viewportLapFraction(0.5, viewport)).toBe(0.425);
    expect(viewportLapFraction(-1, viewport)).toBe(0.2);
    expect(viewportLapFraction(2, viewport)).toBe(0.65);
    expect(viewportFraction(42.5, viewport)).toBe(0.5);
    expect(viewportFraction(0, viewport)).toBeLessThan(0);
    expect(viewportFraction(100, viewport)).toBeGreaterThan(1);
  });
  it("keeps six narrow-window ticks distinct while preserving sector/full-lap formatting", () => {
    for (const axis of ["time", "distance"] as const) {
      const viewport = plotViewport(lap, axis, null, {
        start: 10,
        end: 10.001,
      });
      const values = Array.from(
        { length: 6 },
        (_, i) => viewport.start + ((viewport.end - viewport.start) * i) / 5,
      );
      const labels = values.map((value) =>
        plotTickLabel(value, viewport, axis),
      );
      expect(new Set(labels).size).toBe(6);
      labels.forEach((label, i) =>
        expect(Math.abs(Number(label) - values[i])).toBeLessThan(
          (viewport.end - viewport.start) / 10,
        ),
      );
    }
    expect(plotTickLabel(2, plotViewport(lap, "time", 1), "time")).toBe("2.0");
    expect(plotTickLabel(2, plotViewport(lap, "time", null), "time")).toBe("2");
  });
});
