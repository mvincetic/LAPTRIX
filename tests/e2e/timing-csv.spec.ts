import { test, expect, type Page } from "@playwright/test";

const csv =
  '\ufeffelapsed_ms,progress_pct,note\r\n0,0,"start, finish"\r\n21500,25,"a ""quote"""\r\n80000,100,"final\r\nrecord"\r\n';
const simple = "time_s,source_progress\n0,0\n21.5,.25\n80,1";
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
async function open(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Import timing CSV", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Import timing CSV" }),
  ).toBeVisible();
}
async function upload(page: Page, text = simple, name = "original-timing.csv") {
  await page
    .getByLabel("Timing CSV file", { exact: true })
    .setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
}
async function metadata(page: Page, label = "Original CSV reference") {
  await page.getByLabel("Reference label", { exact: true }).fill(label);
  await page
    .getByLabel("Vehicle label", { exact: true })
    .fill("Original test vehicle");
  await page
    .getByLabel("Declared origin", { exact: true })
    .selectOption("external-simulation");
  await page
    .getByLabel("Provenance and alignment", { exact: true })
    .fill(
      "Original synthetic browser fixture, aligned to this source for testing.",
    );
  await page
    .getByRole("checkbox", { name: "CSV uses this source track" })
    .check();
}
for (const width of [1600, 390]) {
  test(`CSV mapping, review, rejection and persistence retain the current workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await open(page);
    await expect(
      page.getByRole("button", { name: "Choose CSV", exact: true }),
    ).toBeFocused();
    await upload(page, "time_s,source_progress\n0,0\n4,0\n80,1");
    await expect(page.getByRole("alert")).toContainText("strictly increase");
    await expect(
      page.getByRole("button", {
        name: "Import timing reference",
        exact: true,
      }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Additional actions" }),
    ).toBeFocused();
    expect(await project(page)).toEqual(before);
    await open(page);
    await upload(page, csv);
    await page.getByLabel("Time column", { exact: true }).selectOption("0");
    await page
      .getByLabel("Source-progress column", { exact: true })
      .selectOption("1");
    await expect(page.getByRole("alert")).toContainText("after conversion");
    await page.getByLabel("Time units", { exact: true }).selectOption("ms");
    await page
      .getByLabel("Progress units", { exact: true })
      .selectOption("percent");
    await expect(page.locator(".timing-csv-preview")).toContainText(
      "3 records · 1:20.000",
    );
    await expect(
      page.locator(".timing-csv-preview tbody tr").nth(1),
    ).toContainText("21.500");
    await metadata(page);
    await page
      .getByRole("button", { name: "Import timing reference", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Original CSV reference",
    );
    const after = await project(page);
    expect({ ...after, reference: before.reference }).toEqual(before);
    expect(after.reference).toEqual({
      format: "laptrix-timing-reference-v1",
      label: "Original CSV reference",
      vehicleLabel: "Original test vehicle",
      origin: "external-simulation",
      source:
        "Original synthetic browser fixture, aligned to this source for testing.",
      trackId: before.lap.trackId,
      lapTime: 80,
      units: { time: "s", progress: "fraction" },
      alignment: {
        trackFingerprint: before.lap.alignment.trackFingerprint,
        progress: [0, 0.25, 1],
      },
      samples: [{ time: 0 }, { time: 21.5 }, { time: 80 }],
    });
    await expect(
      page.getByRole("slider", { name: "Lap playback position" }),
    ).toHaveValue("20");
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Show reference ghost", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText("This timing-only reference has no vehicle positions.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(requests).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Original CSV reference",
    );
    expect((await project(page)).reference).toEqual(after.reference);
    expect(errors).toEqual([]);
  });
}

type Gate = {
  csvStarted?: boolean;
  csvReturned?: boolean;
  csvRelease?: () => void;
};

test("reviewing and applying CSV timing leaves live playback running on its existing lap", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) requests++;
  });
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await open(page);
  await upload(page);
  await metadata(page);
  const cursor = page.locator('[aria-label="Lap playback position"]');
  const before = Number(await cursor.inputValue());
  expect(before).toBeGreaterThan(20);
  await page
    .getByRole("button", { name: "Import timing reference", exact: true })
    .click();
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Original CSV reference",
  );
  await expect(
    page.getByRole("button", { name: "Pause playback", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Number(await cursor.inputValue()))
    .toBeGreaterThan(before);
  expect(requests).toBe(0);
});
async function gate(page: Page, phase: "read" | "hash", reject = false) {
  await page.evaluate(
    ({ phase, reject }) => {
      const state = window as Window & Gate;
      const pause = async () => {
        state.csvStarted = true;
        await new Promise<void>((resolve) => {
          state.csvRelease = resolve;
        });
        if (phase === "read") state.csvReturned = true;
        if (reject) throw new Error("Original CSV delayed read failure");
      };
      if (phase === "read") {
        const Original = Worker;
        window.Worker = class extends Original {
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            this.addEventListener("message", (event) => {
              if (!String(url).includes("timingCsv.worker") || state.csvStarted)
                return;
              event.stopImmediatePropagation();
              state.csvStarted = true;
              // Preserve the old delivery callback even after worker termination.
              // A completion already queued by a reader must not update the new file.
              const deliver = this.onmessage;
              state.csvRelease = () => {
                deliver?.call(
                  this,
                  new MessageEvent("message", {
                    data: reject
                      ? {
                          type: "error",
                          id: event.data.id,
                          message: "Original CSV delayed read failure",
                        }
                      : event.data,
                  }),
                );
                state.csvReturned = true;
              };
            });
          }
        };
      } else {
        const original = crypto.subtle.digest.bind(crypto.subtle);
        let first = true;
        crypto.subtle.digest = async (algorithm, data) => {
          const held = first;
          if (held) {
            first = false;
            await pause();
          }
          try {
            return await original(algorithm, data);
          } finally {
            if (held) state.csvReturned = true;
          }
        };
      }
    },
    { phase, reject },
  );
}
async function release(page: Page) {
  await page.evaluate(() => (window as Window & Gate).csvRelease!());
  await page.waitForFunction(() => (window as Window & Gate).csvReturned);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
for (const rejects of [false, true]) {
  test(`newer CSV selection supersedes a delayed ${rejects ? "failed" : "valid"} worker read response`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const before = await project(page);
    await open(page);
    await gate(page, "read", rejects);
    await upload(page, simple, "older.csv");
    await page.waitForFunction(() => (window as Window & Gate).csvStarted);
    await upload(page, simple.replace("80,1", "81,1"), "latest.csv");
    await expect(page.locator(".timing-csv-preview")).toContainText("1:21.000");
    await metadata(page, "Latest CSV reference");
    await release(page);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".timing-csv-preview")).toContainText("1:21.000");
    await page
      .getByRole("button", { name: "Import timing reference", exact: true })
      .click();
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Latest CSV reference",
    );
    const after = await project(page);
    expect(after.reference.lapTime).toBe(81);
    expect({ ...after, reference: before.reference }).toEqual(before);
  });
}
for (const newer of ["cancel", "JSON"] as const) {
  test(`a cancelled CSV hash cannot overwrite a newer ${newer} result`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const initial = await project(page);
    await open(page);
    await upload(page);
    await metadata(page);
    await gate(page, "hash");
    await page
      .getByRole("button", { name: "Import timing reference", exact: true })
      .click();
    await page.waitForFunction(() => (window as Window & Gate).csvStarted);
    if (newer === "cancel") {
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page
        .getByRole("button", { name: "Set reference", exact: true })
        .click();
    } else {
      await page
        .getByLabel("Import reference file", { exact: true })
        .setInputFiles({
          name: "latest.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(initial.lap)),
        });
      await expect(
        page.getByText("Reference imported · current simulation retained", {
          exact: true,
        }),
      ).toBeVisible();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const before = await project(page);
    await release(page);
    expect(await project(page)).toEqual(before);
    expect(before.reference).toEqual(
      newer === "JSON"
        ? { ...initial.lap, referenceImport: { fileName: "latest.json" } }
        : initial.lap,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
