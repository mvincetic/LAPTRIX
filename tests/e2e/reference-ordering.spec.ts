import { test, expect, type Page } from "@playwright/test";
import type { Lap, TimingReference } from "../../packages/shared/schema";

type ReadGate = {
  releaseReferenceRead?: () => void;
  referenceReadStarted?: boolean;
  referenceReadReturned?: boolean;
  pendingReferenceDigests?: number;
};
async function installGate(
  page: Page,
  phase: "read" | "hash" = "read",
  rejectRead = false,
) {
  await page.evaluate(
    ({ phase, rejectRead }) => {
      const state = window as Window & ReadGate;
      let holdNextDigest = false;
      const pause = async () => {
        state.referenceReadStarted = true;
        await new Promise<void>((resolve) => {
          state.releaseReferenceRead = resolve;
        });
        state.referenceReadReturned = true;
      };
      const original = File.prototype.text;
      File.prototype.text = async function () {
        const text = await original.call(this);
        if (this.name !== "older-reference.json") return text;
        if (phase === "read") {
          await pause();
          if (rejectRead)
            throw new DOMException(
              "Original browser fixture read failure",
              "NotReadableError",
            );
        } else holdNextDigest = true;
        return text;
      };
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      state.pendingReferenceDigests = 0;
      crypto.subtle.digest = async (algorithm, data) => {
        state.pendingReferenceDigests!++;
        try {
          if (holdNextDigest) {
            holdNextDigest = false;
            await pause();
          }
          return await digest(algorithm, data);
        } finally {
          state.pendingReferenceDigests!--;
        }
      };
    },
    { phase, rejectRead },
  );
}
async function releaseAndSettle(page: Page) {
  await page.evaluate(() =>
    (window as Window & ReadGate).releaseReferenceRead!(),
  );
  await page.waitForFunction(
    () => (window as Window & ReadGate).referenceReadReturned,
  );
  // Let the resumed file continuation start its hash, then wait for actual digest work.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await page.waitForFunction(
    () => (window as Window & ReadGate).pendingReferenceDigests === 0,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function upload(page: Page, name: string, contents: string) {
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(contents),
    });
}
function timing(lap: Lap, label: string): TimingReference {
  return {
    format: "laptrix-timing-reference-v1",
    label,
    vehicleLabel: "Test",
    origin: "external-simulation",
    source: "Original browser race fixture",
    trackId: lap.trackId,
    lapTime: 80,
    units: { time: "s", progress: "fraction" },
    alignment: {
      trackFingerprint: lap.alignment!.trackFingerprint,
      progress: [0, 0.5, 1],
    },
    samples: [{ time: 0 }, { time: 40 }, { time: 80 }],
  };
}
for (const [older, phase] of [
  ["valid", "read"],
  ["malformed", "read"],
  ["unreadable", "read"],
  ["valid", "hash"],
] as const) {
  test(`a delayed ${older} reference ${phase} cannot replace a newer imported reference or its feedback`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const initial = await project(page);
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    await installGate(page, phase, older === "unreadable");
    await upload(
      page,
      "older-reference.json",
      older === "malformed"
        ? "{malformed"
        : JSON.stringify(timing(initial.lap, "Older delayed reference")),
    );
    await page.waitForFunction(
      () => (window as Window & ReadGate).referenceReadStarted,
    );
    await upload(
      page,
      "latest-reference.json",
      JSON.stringify(timing(initial.lap, "Latest selected reference")),
    );
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Latest selected reference",
    );
    const before = await project(page);
    await releaseAndSettle(page);
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Latest selected reference",
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(await project(page)).toEqual(before);
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("20");
    expect(calculations).toBe(0);
    if (phase === "hash")
      await page.screenshot({
        path: "artifacts/reference-ordering-latest-1600.png",
        fullPage: true,
      });
  });
}

for (const choice of ["current", "failed import", "workspace"] as const) {
  test(`a newer ${choice} supersedes a pending reference and retains its own result and feedback`, async ({
    page,
  }) => {
    if (choice === "current")
      await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const initial = await project(page);
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    await installGate(page, choice === "current" ? "hash" : "read");
    await upload(
      page,
      "older-reference.json",
      choice === "workspace"
        ? "{malformed"
        : JSON.stringify(timing(initial.lap, "Older delayed reference")),
    );
    await page.waitForFunction(
      () => (window as Window & ReadGate).referenceReadStarted,
    );
    if (choice === "current") {
      await page
        .getByRole("button", { name: "Set reference", exact: true })
        .click();
      await expect(
        page.getByText("Current simulation set as reference"),
      ).toBeVisible();
    } else if (choice === "failed import") {
      await upload(page, "latest-invalid.json", "{latest-invalid");
      await expect(page.getByRole("alert")).toContainText(
        "Current reference kept",
      );
    } else {
      await page
        .getByRole("combobox", { name: "Car profile" })
        .selectOption("gt-development");
      await expect(page.getByTestId("result-vehicle")).toHaveText(
        "GT Development 01",
      );
    }
    const before = await project(page);
    const error = await page.getByRole("alert").allTextContents();
    await releaseAndSettle(page);
    expect(await project(page)).toEqual(before);
    expect(await page.getByRole("alert").allTextContents()).toEqual(error);
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe(choice === "workspace" ? "0" : "20");
    expect(calculations).toBe(choice === "workspace" ? 1 : 0);
    if (choice === "current") {
      expect(before.reference).toEqual(initial.lap);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
      await page.screenshot({
        path: "artifacts/reference-ordering-current-390.png",
        fullPage: true,
      });
    } else if (choice === "failed import") {
      expect(before.reference).toEqual(initial.reference);
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Import reference again", exact: true })
        .click();
      await (
        await chooser
      ).setFiles({
        name: "retry.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify(timing(initial.lap, "Latest retry reference")),
        ),
      });
      await expect(page.getByTestId("reference-vehicle")).toContainText(
        "Latest retry reference",
      );
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect((await project(page)).lap).toEqual(initial.lap);
      expect(calculations).toBe(0);
    }
  });
}
