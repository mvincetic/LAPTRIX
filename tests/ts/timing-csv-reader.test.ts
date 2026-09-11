import { afterEach, expect, it, vi } from "vitest";
import { TimingCsvReader } from "../../apps/web/src/TimingCsvReader";
import type {
  CsvWorkerReply,
  CsvWorkerRequest,
} from "../../apps/web/src/timingCsv.worker";

afterEach(() => vi.unstubAllGlobals());
const selection = {
  timeColumn: 0,
  progressColumn: 1,
  timeUnit: "s",
  progressUnit: "fraction",
} as const;
const data = {
  lapTime: 80,
  samples: [{ time: 0 }, { time: 80 }],
  progress: [0, 1],
};
function setup() {
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: { data: CsvWorkerReply }) => void) | null = null;
    onerror: ((event: { preventDefault: () => void }) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    postMessage = vi.fn<(request: CsvWorkerRequest) => void>();
    terminate = vi.fn();
    constructor() {
      workers.push(this);
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  const reader = new TimingCsvReader();
  return { reader, worker: workers[0] };
}

it("routes out-of-order conversion replies to their own request", async () => {
  const { reader, worker } = setup();
  const first = reader.prepare(selection),
    second = reader.prepare({ ...selection, timeUnit: "ms" });
  const [a, b] = worker.postMessage.mock.calls.map(([request]) => request.id);
  worker.onmessage!({
    data: { type: "prepared", id: b, data: { ...data, lapTime: 0.08 } },
  });
  worker.onmessage!({
    data: { type: "error", id: a, message: "Original invalid time column" },
  });
  await expect(first).rejects.toThrow("Original invalid time column");
  await expect(second).resolves.toEqual({ ...data, lapTime: 0.08 });
  reader.dispose();
});

it("termination rejects all pending work and ignores already queued replies", async () => {
  const { reader, worker } = setup();
  const first = reader.load(
    new File(["time_s,source_progress\n0,0\n80,1"], "original.csv"),
  );
  const second = reader.prepare(selection);
  const deliver = worker.onmessage!;
  reader.dispose();
  await expect(first).rejects.toMatchObject({ name: "AbortError" });
  await expect(second).rejects.toMatchObject({ name: "AbortError" });
  deliver({ data: { type: "prepared", id: 2, data } });
  reader.dispose();
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(worker.onmessage).toBeNull();
  await expect(reader.prepare(selection)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
});

for (const failure of ["onerror", "onmessageerror"] as const) {
  it(`a worker ${failure} rejects pending work and releases the worker`, async () => {
    const { reader, worker } = setup();
    const pending = reader.prepare(selection);
    const preventDefault = vi.fn();
    if (failure === "onerror") worker.onerror!({ preventDefault });
    else worker.onmessageerror!();
    await expect(pending).rejects.toThrow("Choose the file again");
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessageerror).toBeNull();
    if (failure === "onerror") expect(preventDefault).toHaveBeenCalledOnce();
  });
}

it("a request cloning failure rejects that request without stranding the next one", async () => {
  const { reader, worker } = setup();
  worker.postMessage.mockImplementationOnce(() => {
    throw new DOMException("Original cloning failure", "DataCloneError");
  });
  await expect(reader.prepare(selection)).rejects.toMatchObject({
    name: "DataCloneError",
  });
  const next = reader.prepare(selection);
  worker.onmessage!({ data: { type: "prepared", id: 2, data } });
  await expect(next).resolves.toEqual(data);
  reader.dispose();
});
