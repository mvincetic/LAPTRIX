import { describe, expect, it } from "vitest";
import {
  parseTimingCsv,
  prepareTimingCsv,
  timingCsvReference,
  type TimingCsvSelection,
} from "../../apps/web/src/timingCsv";
import { timingReferenceSchema } from "../../packages/shared/schema";

const selection: TimingCsvSelection = {
  timeColumn: 0,
  progressColumn: 1,
  timeUnit: "s",
  progressUnit: "fraction",
};
const valid = "time_s,source_progress\n0,0\n21.5,.25\n80,1";
const metadata = {
  label: " Original CSV lap ",
  vehicleLabel: " Original test vehicle ",
  origin: "external-simulation" as const,
  source: " Original fixture, explicitly aligned for testing. ",
};
const hash =
  "sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689";

describe("bounded timing CSV", () => {
  it("preserves quoted commas, doubled quotes and embedded newlines", () => {
    const text =
      '\ufefftime_s,source_progress,note\r\n0,0,"first, phase"\r\n20,.25,"a ""quote"""\r\n80,1,"last\r\nline"\r\n';
    expect(parseTimingCsv(text)).toEqual({
      headers: ["time_s", "source_progress", "note"],
      rows: [
        ["0", "0", "first, phase"],
        ["20", ".25", 'a "quote"'],
        ["80", "1", "last\r\nline"],
      ],
    });
  });
  it.each(["\n", "\r\n", "\r"])(
    "accepts complete records separated with %j",
    (newline) => {
      expect(parseTimingCsv(valid.replaceAll("\n", newline) + newline)).toEqual(
        parseTimingCsv(valid),
      );
    },
  );
  it("converts selected milliseconds and percentages exactly once and produces only timing", () => {
    const table = parseTimingCsv(
      "note,progress_percent,elapsed_ms\nstart,0,0\nmid,25,21500\nfinish,100,80000",
    );
    const original = structuredClone(table);
    const data = prepareTimingCsv(table, {
      timeColumn: 2,
      progressColumn: 1,
      timeUnit: "ms",
      progressUnit: "percent",
    });
    expect(data).toEqual({
      samples: [{ time: 0 }, { time: 21.5 }, { time: 80 }],
      progress: [0, 0.25, 1],
      lapTime: 80,
    });
    const reference = timingCsvReference(
      data,
      metadata,
      "ardennes-development",
      hash,
    );
    expect(timingReferenceSchema.parse(reference)).toEqual(reference);
    expect(reference.label).toBe("Original CSV lap");
    expect(reference.units).toEqual({ time: "s", progress: "fraction" });
    expect(reference.alignment.trackFingerprint).toBe(hash);
    expect(
      reference.samples.every(
        (sample) => Object.keys(sample).join() === "time",
      ),
    ).toBe(true);
    expect(table).toEqual(original);
    reference.samples[1].time = 22;
    expect(data.samples[1].time).toBe(21.5);
  });
  it("accepts decimal/scientific numbers without evaluating fields", () => {
    const data = prepareTimingCsv(
      parseTimingCsv("time,progress\n 0 , +0 \n2.15e1,2.5e-1\n8e1,1.0"),
      selection,
    );
    expect(data).toEqual(prepareTimingCsv(parseTimingCsv(valid), selection));
  });
  it.each([
    ['time,progress\n0,0\n80,"1', /unclosed/],
    ['time,progress\n0,0\n80,"1"oops', /closing quote/],
    ['time,progress\n0,0\n80,1"', /begin the field/],
    ["time, time\n0,0\n80,1", /unique/],
    ["time,\n0,0\n80,1", /nonempty/],
    ["time,progress\n0,0\n80,1,extra", /record 3/],
    ["time,progress\n0,0\n\n80,1", /record 3/],
    ["time;progress\n0;0\n80;1", /comma-separated/],
    ["time,progress\n0,0", /at least two timing/],
    ["", /header/],
  ])("rejects malformed or ambiguous records: %j", (text, error) =>
    expect(() => parseTimingCsv(text)).toThrow(error),
  );
  it("enforces text, column and individual field bounds", () => {
    expect(() => parseTimingCsv("x".repeat(5_000_001))).toThrow(/5 MB/);
    expect(() =>
      parseTimingCsv(Array.from({ length: 65 }, (_, i) => `c${i}`).join(",")),
    ).toThrow(/64 columns/);
    expect(() =>
      parseTimingCsv(
        `time,progress,note\n0,0,${"x".repeat(100001)}\n80,1,last`,
      ),
    ).toThrow(/100,000/);
  });
  it("accepts 20,000 records and rejects the next record", () => {
    const csv = [
      "time,progress",
      ...Array.from({ length: 20000 }, (_, i) => `${i},${i / 19999}`),
    ].join("\n");
    const data = prepareTimingCsv(parseTimingCsv(csv), selection);
    expect(data.samples).toHaveLength(20000);
    expect(data.lapTime).toBe(19999);
    expect(data.progress.at(-1)).toBe(1);
    expect(() => parseTimingCsv(`${csv}\n20000,1`)).toThrow(/20,000/);
  });
  it.each([
    ["0,0\n0,1", /increase/],
    ["0,0\n80,0", /increase/],
    ["0,0\n21,.5\n20,1", /increase/],
    ["0,0\n21,.7\n80,.6", /increase/],
    ["1,0\n80,1", /complete lap/],
    ["0,.1\n80,1", /complete lap/],
    ["0,0\n80,.99", /complete lap/],
    ["0,0\n86401,1", /86,400/],
    ["0,0\n80,101", /0–1/],
    ["0,0\n,1", /finite decimal/],
    ["0,0\n0x50,1", /finite decimal/],
    ["0,0\nInfinity,1", /finite decimal/],
    ["0,0\n1e309,1", /finite decimal/],
    ["0,0\n=40+40,1", /finite decimal/],
    ["0,0\n80,100%", /finite decimal/],
  ])(
    "rejects invalid converted values without repairing them: %j",
    (rows, error) => {
      expect(() =>
        prepareTimingCsv(parseTimingCsv(`time,progress\n${rows}`), selection),
      ).toThrow(error);
    },
  );
  it("rejects duplicate/out-of-range column choices and unsupported units", () => {
    const table = parseTimingCsv(valid);
    for (const change of [
      { timeColumn: 1 },
      { timeColumn: -1 },
      { progressColumn: 5 },
      { timeColumn: 0.5 },
    ])
      expect(() =>
        prepareTimingCsv(table, { ...selection, ...change }),
      ).toThrow(/different/);
    expect(() =>
      prepareTimingCsv(table, {
        ...selection,
        timeUnit: "min",
      } as unknown as TimingCsvSelection),
    ).toThrow(/units/);
  });
  it("uses the canonical schema for provenance and source identity", () => {
    const data = prepareTimingCsv(parseTimingCsv(valid), selection);
    expect(() =>
      timingCsvReference(
        data,
        { ...metadata, source: " " },
        "ardennes-development",
        hash,
      ),
    ).toThrow();
    expect(() =>
      timingCsvReference(
        data,
        metadata,
        "ardennes-development",
        "guessed-source",
      ),
    ).toThrow();
  });
});
