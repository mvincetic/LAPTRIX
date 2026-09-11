export type TimingCsvTable = { headers: string[]; rows: string[][] };
export type TimingCsvSelection = {
  timeColumn: number;
  progressColumn: number;
  timeUnit: "s" | "ms";
  progressUnit: "fraction" | "percent";
};
export type TimingCsvData = {
  progress: number[];
  samples: { time: number }[];
  lapTime: number;
};
/** Bounded comma-delimited records, preserving quoted content and logical rows. */
export function parseTimingCsv(input: string): TimingCsvTable {
  if (input.length > 5_000_000)
    throw new Error("CSV must be smaller than 5 MB.");
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closedQuote = false,
    line = 1;
  const fail = (message: string): never => {
    throw new Error(`CSV line ${line}: ${message}`);
  };
  const finishField = () => {
    row.push(field);
    if (row.length > 64) fail("at most 64 columns are supported.");
    field = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishField();
    records.push(row);
    if (records.length > 20_001)
      fail("at most 20,000 timing records are supported.");
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
        if (character === "\n" || (character === "\r" && text[i + 1] !== "\n"))
          line++;
      }
    } else if (character === ",") finishField();
    else if (character === "\n" || character === "\r") {
      finishRow();
      if (character === "\r" && text[i + 1] === "\n") i++;
      line++;
    } else if (closedQuote) fail("unexpected text after a closing quote.");
    else if (character === '"') {
      if (field.length) fail("a quote must begin the field.");
      quoted = true;
    } else field += character;
    if (field.length > 100_000) fail("a field exceeds 100,000 characters.");
  }
  if (quoted) fail("unclosed quoted field.");
  if (field.length || row.length || closedQuote) finishRow();
  const [rawHeaders, ...rows] = records;
  if (!rawHeaders || rawHeaders.length < 2)
    throw new Error(
      "CSV needs a comma-separated header with at least two columns.",
    );
  const headers = rawHeaders.map((header) => header.trim());
  if (
    headers.some((header) => !header || header.length > 100) ||
    new Set(headers).size !== headers.length
  )
    throw new Error(
      "CSV headers must be unique, nonempty and at most 100 characters.",
    );
  if (rows.length < 2)
    throw new Error(
      "CSV needs at least two timing records for a complete lap.",
    );
  rows.forEach((record, i) => {
    if (record.length !== headers.length)
      throw new Error(
        `CSV record ${i + 2} has ${record.length} columns; expected ${headers.length}.`,
      );
  });
  return { headers, rows };
}

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
function numeric(value: string, record: number, name: string) {
  const text = value.trim(),
    number = Number(text);
  if (!decimal.test(text) || !Number.isFinite(number))
    throw new Error(
      `CSV record ${record}: ${name} must be a finite decimal number.`,
    );
  return number;
}

export function prepareTimingCsv(
  table: TimingCsvTable,
  selection: TimingCsvSelection,
): TimingCsvData {
  const { timeColumn, progressColumn, timeUnit, progressUnit } = selection;
  if (
    [timeColumn, progressColumn].some(
      (column) =>
        !Number.isInteger(column) ||
        column < 0 ||
        column >= table.headers.length,
    ) ||
    timeColumn === progressColumn
  )
    throw new Error("Choose different time and source-progress columns.");
  if (
    !(timeUnit === "s" || timeUnit === "ms") ||
    !(progressUnit === "fraction" || progressUnit === "percent")
  )
    throw new Error("Unsupported CSV units.");
  if (table.rows.length < 2 || table.rows.length > 20000)
    throw new Error("CSV needs 2–20,000 timing records.");
  const samples: TimingCsvData["samples"] = [],
    progress: number[] = [];
  table.rows.forEach((row, i) => {
    const time =
      numeric(row[timeColumn] ?? "", i + 2, "time") /
      (timeUnit === "ms" ? 1000 : 1);
    const position =
      numeric(row[progressColumn] ?? "", i + 2, "source progress") /
      (progressUnit === "percent" ? 100 : 1);
    if (time < 0 || time > 86400 || position < 0 || position > 1)
      throw new Error(
        `CSV record ${i + 2}: time must be 0–86,400 seconds and source progress 0–1 after conversion.`,
      );
    if (i > 0 && (time <= samples[i - 1].time || position <= progress[i - 1]))
      throw new Error(
        `CSV record ${i + 2}: time and source progress must strictly increase.`,
      );
    samples.push({ time });
    progress.push(position);
  });
  if (samples[0].time !== 0 || progress[0] !== 0 || progress.at(-1) !== 1)
    throw new Error(
      "A complete lap must start at time/progress 0 and end at source progress 1.",
    );
  return { samples, progress, lapTime: samples.at(-1)!.time };
}
