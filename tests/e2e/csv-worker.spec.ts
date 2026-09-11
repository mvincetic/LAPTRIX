import { test, expect, type Page } from "@playwright/test";

type WorkerState = {
  created: number;
  terminated: number;
  replies: { type: string; keys: string[]; size: number }[];
  holdNext: boolean;
  held: boolean;
  release?: () => void;
};
type InstrumentedWindow = Window &
  typeof globalThis & { csvWorker: WorkerState };
const simple = "time_s,source_progress\n0,0\n21.5,.25\n80,1";

async function open(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Import timing CSV", exact: true })
    .click();
}
async function upload(page: Page, text = simple) {
  await page.getByLabel("Timing CSV file", { exact: true }).setInputFiles({
    name: "original-worker.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
}
async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function metadata(page: Page) {
  await page
    .getByLabel("Reference label", { exact: true })
    .fill("Original worker timing");
  await page
    .getByLabel("Vehicle label", { exact: true })
    .fill("Original synthetic vehicle");
  await page
    .getByLabel("Declared origin", { exact: true })
    .selectOption("external-simulation");
  await page
    .getByLabel("Provenance and alignment", { exact: true })
    .fill(
      "Synthetic CSV worker browser fixture; source fraction generated for testing.",
    );
  await page
    .getByRole("checkbox", { name: "CSV uses this source track" })
    .check();
}
async function counters(page: Page) {
  return page.evaluate(() => {
    const state = (window as InstrumentedWindow).csvWorker;
    return {
      created: state.created,
      terminated: state.terminated,
      replies: state.replies,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: WorkerState = {
      created: 0,
      terminated: 0,
      replies: [],
      holdNext: false,
      held: false,
    };
    (window as InstrumentedWindow).csvWorker = state;
    const Original = Worker;
    window.Worker = class extends Original {
      private tracked: boolean;
      private stopped = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.tracked = String(url).includes("timingCsv.worker");
        if (!this.tracked) return;
        state.created++;
        this.addEventListener("message", (event) => {
          state.replies.push({
            type: event.data.type,
            keys: Object.keys(event.data),
            size: JSON.stringify(event.data).length,
          });
          if (event.data.type === "prepared" && state.holdNext) {
            state.holdNext = false;
            state.held = true;
            event.stopImmediatePropagation();
            const deliver = this.onmessage;
            state.release = () => {
              deliver?.call(this, event);
              state.held = false;
            };
          }
        });
      }
      terminate() {
        if (this.tracked && !this.stopped) state.terminated++;
        this.stopped = true;
        super.terminate();
      }
    };
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
});

test("the real CSV worker reviews a near-limit file without returning ignored notes, then releases on import", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("slider", { name: "Fuel load" }).fill("21");
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  const before = await project(page);
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) requests++;
  });
  expect((await counters(page)).created).toBe(0);
  await open(page);
  expect((await counters(page)).created).toBe(0);
  const note = '"Original note, with ""quotes""\n' + "a".repeat(170) + '"';
  const source = [
    "time_s,source_progress,original_note",
    ...Array.from({ length: 20000 }, (_, i) => {
      const progress = i / 19999;
      return `${90 * progress},${progress},${note}`;
    }),
  ].join("\n");
  expect(Buffer.byteLength(source)).toBeGreaterThan(4_800_000);
  expect(Buffer.byteLength(source)).toBeLessThanOrEqual(5_000_000);
  await upload(page, source);
  await expect(page.locator(".timing-csv-preview")).toContainText(
    "20,000 records · 1:30.000",
  );
  const worker = await counters(page);
  expect(worker.created).toBe(1);
  expect(worker.terminated).toBe(0);
  expect(worker.replies[0]).toEqual({
    type: "loaded",
    keys: ["type", "id", "headers", "recordCount"],
    size: expect.any(Number),
  });
  expect(worker.replies[0].size).toBeLessThan(200);
  expect(worker.replies.at(-1)?.size).toBeLessThan(1_000_000);
  await metadata(page);
  await page
    .getByRole("button", { name: "Import timing reference", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await counters(page)).terminated).toBe(1);
  const after = await project(page);
  expect({ ...after, reference: before.reference }).toEqual(before);
  expect(after.reference.samples).toHaveLength(20000);
  expect(after.reference.alignment.progress).toHaveLength(20000);
  for (const i of [0, 1, 5000, 19998, 19999]) {
    expect(after.reference.samples[i]).toEqual({ time: 90 * (i / 19999) });
    expect(after.reference.alignment.progress[i]).toBe(i / 19999);
  }
  await expect(
    page.getByRole("slider", { name: "Lap playback position" }),
  ).toHaveValue("20");
  expect(requests).toBe(0);
  expect(errors).toEqual([]);
});

test("changing units invalidates pending previews and Cancel terminates work before a fresh review", async ({
  page,
}) => {
  const before = await project(page);
  await open(page);
  await upload(page);
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  await metadata(page);
  const apply = page.getByRole("button", {
    name: "Import timing reference",
    exact: true,
  });
  await expect(apply).toBeEnabled();
  await page.evaluate(() => {
    (window as InstrumentedWindow).csvWorker.holdNext = true;
  });
  await page.getByLabel("Time units", { exact: true }).selectOption("ms");
  await page.waitForFunction(
    () => (window as InstrumentedWindow).csvWorker.held,
  );
  await expect(
    page.getByText("Preparing preview…", { exact: true }),
  ).toBeVisible();
  await expect(apply).toBeDisabled();
  await page.getByLabel("Time units", { exact: true }).selectOption("s");
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  await page.evaluate(() =>
    (window as InstrumentedWindow).csvWorker.release!(),
  );
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  await expect(apply).toBeEnabled();
  await page.evaluate(() => {
    (window as InstrumentedWindow).csvWorker.holdNext = true;
  });
  await page.getByLabel("Time units", { exact: true }).selectOption("ms");
  await page.waitForFunction(
    () => (window as InstrumentedWindow).csvWorker.held,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await counters(page)).terminated).toBe(1);
  await page.evaluate(() =>
    (window as InstrumentedWindow).csvWorker.release!(),
  );
  expect(await project(page)).toEqual(before);
  await open(page);
  await upload(page);
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  expect((await counters(page)).created).toBe(2);
  await page.keyboard.press("Escape");
  expect((await counters(page)).terminated).toBe(2);
  expect(await project(page)).toEqual(before);
});

test("a failed worker module gives a local recoverable error and choosing again succeeds", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = await project(page);
  const workerUrl = /timingCsv\.worker[^/]*(?:\?|\.js|\.ts)/;
  await page.route(workerUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: 'throw new Error("Original injected CSV worker startup failure");',
    }),
  );
  await open(page);
  await upload(page);
  await expect(page.getByRole("alert")).toContainText("Choose the file again");
  await expect(
    page.getByRole("button", { name: "Import timing reference", exact: true }),
  ).toBeDisabled();
  expect((await counters(page)).terminated).toBe(1);
  await page.unroute(workerUrl);
  await upload(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  await page.keyboard.press("Escape");
  expect((await counters(page)).terminated).toBe(2);
  expect(await project(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test("Cancel stays usable while the CSV worker is actively occupied", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 300 });
  const before = await project(page);
  const workerUrl = /timingCsv\.worker[^/]*(?:\?|\.js|\.ts)/;
  // A deterministic occupied worker tests cancellation during work, separately
  // from the real large-file parser test and held-result ordering tests.
  await page.route(workerUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `self.onmessage = () => {
      self.postMessage({ type: "original-test-processing" });
      const start = performance.now();
      while (performance.now() - start < 20000) { /* occupied */ }
      self.postMessage({ type: "original-test-finished" });
    };`,
    }),
  );
  await open(page);
  await upload(page);
  await expect
    .poll(async () => (await counters(page)).replies.map((reply) => reply.type))
    .toEqual(["original-test-processing"]);
  await expect(page.getByText("Reading CSV…", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await counters(page)).terminated).toBe(1);
  expect((await counters(page)).replies.map((reply) => reply.type)).toEqual([
    "original-test-processing",
  ]);
  await expect(
    page.getByRole("button", { name: "Additional actions" }),
  ).toBeFocused();
  expect(await project(page)).toEqual(before);
  await page.unroute(workerUrl);
  await open(page);
  await upload(page);
  await expect(page.locator(".timing-csv-preview")).toContainText("1:20.000");
  await page.keyboard.press("Escape");
  expect((await counters(page)).terminated).toBe(2);
  expect(await project(page)).toEqual(before);
});
