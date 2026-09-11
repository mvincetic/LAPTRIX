import type { TimingCsvSelection } from "./timingCsvData";
import type {
  CsvWorkerCommand,
  CsvWorkerReply,
  CsvWorkerRequest,
} from "./timingCsv.worker";

/** Own one file's worker and reject every pending request when that review ends. */
export class TimingCsvReader {
  private worker: Worker;
  private nextId = 0;
  private closed = false;
  private pending = new Map<
    number,
    { resolve: (reply: CsvWorkerReply) => void; reject: (error: Error) => void }
  >();

  constructor() {
    this.worker = new Worker(
      new URL("./timingCsv.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = ({ data }: MessageEvent<CsvWorkerReply>) => {
      const request = this.pending.get(data.id);
      if (!request || this.closed) return;
      this.pending.delete(data.id);
      if (data.type === "error") request.reject(new Error(data.message));
      else request.resolve(data);
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.dispose(
        new Error(
          "CSV processing could not start or stopped unexpectedly. Choose the file again.",
        ),
      );
    };
    this.worker.onmessageerror = () => {
      this.dispose(
        new Error(
          "CSV processing returned unreadable data. Choose the file again.",
        ),
      );
    };
  }
  private request(command: CsvWorkerCommand): Promise<CsvWorkerReply> {
    if (this.closed)
      return Promise.reject(
        new DOMException("CSV review closed.", "AbortError"),
      );
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.worker.postMessage({ ...command, id } satisfies CsvWorkerRequest);
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  async load(file: File) {
    const reply = await this.request({ type: "load", file });
    if (reply.type !== "loaded")
      throw new Error("CSV header response was invalid.");
    return { headers: reply.headers, recordCount: reply.recordCount };
  }
  async prepare(selection: TimingCsvSelection) {
    const reply = await this.request({ type: "prepare", selection });
    if (reply.type !== "prepared")
      throw new Error("CSV preview response was invalid.");
    return reply.data;
  }
  dispose(
    reason: Error = new DOMException("CSV review closed.", "AbortError"),
  ) {
    if (this.closed) return;
    this.closed = true;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    for (const request of this.pending.values()) request.reject(reason);
    this.pending.clear();
  }
}
