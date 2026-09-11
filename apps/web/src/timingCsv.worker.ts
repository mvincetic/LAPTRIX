import {
  parseTimingCsv,
  prepareTimingCsv,
  type TimingCsvData,
  type TimingCsvSelection,
  type TimingCsvTable,
} from "./timingCsvData";

export type CsvWorkerCommand =
  | { type: "load"; file: File }
  | { type: "prepare"; selection: TimingCsvSelection };
export type CsvWorkerRequest = CsvWorkerCommand & { id: number };
export type CsvWorkerReply =
  | { type: "loaded"; id: number; headers: string[]; recordCount: number }
  | { type: "prepared"; id: number; data: TimingCsvData }
  | { type: "error"; id: number; message: string };

let table: TimingCsvTable | null = null;
let generation = 0;
self.onmessage = async ({ data: request }: MessageEvent<CsvWorkerRequest>) => {
  const reply = (value: CsvWorkerReply) => self.postMessage(value);
  try {
    if (request.type === "load") {
      const current = ++generation;
      table = null;
      if (request.file.size > 5_000_000)
        throw new Error("CSV is limited to 5 MB.");
      const text = await request.file.text();
      if (current !== generation) throw new Error("A newer CSV was selected.");
      table = parseTimingCsv(text);
      reply({
        type: "loaded",
        id: request.id,
        headers: table.headers,
        recordCount: table.rows.length,
      });
    } else {
      if (!table)
        throw new Error("Choose a CSV file before selecting columns.");
      reply({
        type: "prepared",
        id: request.id,
        data: prepareTimingCsv(table, request.selection),
      });
    }
  } catch (error) {
    reply({
      type: "error",
      id: request.id,
      message:
        error instanceof Error ? error.message : "Could not process CSV.",
    });
  }
};
