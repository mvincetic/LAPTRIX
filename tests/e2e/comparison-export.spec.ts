import { expect, test, type Page } from "@playwright/test";
import type { Lap, TimingReference } from "../../packages/shared/schema";

async function jsonDownload(page: Page, action: () => Promise<void>) {
  const pending = page.waitForEvent("download");
  await action();
  const download = await pending;
  const chunks = [];
  for await (const chunk of (await download.createReadStream())!)
    chunks.push(chunk);
  return {
    fileName: download.suggestedFilename(),
    value: JSON.parse(Buffer.concat(chunks).toString()),
  };
}
async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  return (
    await jsonDownload(page, () =>
      page.getByRole("button", { name: "Export project", exact: true }).click(),
    )
  ).value;
}

for (const width of [1600, 390]) {
  test(`comparison export preserves native/timing inputs and the inspected sector at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    const result = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON()?.setup.sampling === "5m",
    );
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    const lap: Lap = await (await result).json();
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    await range.selectOption("2");
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    const time = String(
      Number((lap.sectors[1].split - lap.sectors[1].time / 2).toFixed(2)),
    );
    await cursor.fill(time);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const control = page.getByRole("button", {
      name: "Export full-lap comparison JSON",
      exact: true,
    });
    const before = await project(page);
    const exported = await jsonDownload(page, async () => {
      await control.focus();
      await page.keyboard.press("Enter");
    });
    const report = exported.value;
    expect(exported.fileName).toBe("laptrix-comparison.json");
    expect(report.format).toBe("laptrix-comparison-v1");
    expect(report.scope).toBe("full-lap");
    expect(report.referenceKind).toBe("native");
    expect(Number.isFinite(Date.parse(report.exportedAt))).toBe(true);
    expect(report.inputs.current).toEqual(before.lap);
    expect(report.inputs.reference).toEqual(before.reference);
    expect(report.inputs.current.samples.length).not.toBe(
      report.inputs.reference.samples.length,
    );
    expect(
      report.samples.map((row: { progress: number }) => row.progress),
    ).toEqual(
      [
        ...new Set<number>([
          ...before.lap.alignment.progress,
          ...before.reference.alignment.progress,
        ]),
      ].sort((a, b) => a - b),
    );
    expect(report.samples[0]).toMatchObject({
      progress: 0,
      current: { time: 0 },
      reference: { time: 0 },
      deltaTime: 0,
    });
    expect(report.samples.at(-1)).toMatchObject({
      progress: 1,
      current: { time: before.lap.lapTime },
      reference: { time: before.reference.lapTime },
    });
    expect(report.summary.deltaTime).toBeCloseTo(
      before.lap.lapTime - before.reference.lapTime,
      10,
    );
    expect(report.availableFields.current).toContain("normalLoadG");
    expect(report.availableFields.reference).toContain("speed");
    expect(await project(page)).toEqual(before);

    const indices = [
      ...new Set([
        0,
        ...lap.samples
          .map((_, index) => index)
          .filter((index) => index % 17 === 0),
        lap.samples.length - 1,
      ]),
    ];
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Export timing fixture",
      vehicleLabel: "Original fixture",
      origin: "external-simulation",
      source:
        "Current simulation sampled every seventeenth point and slowed by ten percent for export testing",
      trackId: lap.trackId,
      lapTime: lap.lapTime * 1.1,
      units: { time: "s", progress: "fraction" },
      alignment: {
        trackFingerprint: lap.alignment!.trackFingerprint,
        progress: indices.map((index) => lap.alignment!.progress[index]),
      },
      samples: indices.map((index) => ({
        time: lap.samples[index].time * 1.1,
      })),
    };
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "export-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(timing)),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      timing.label,
    );
    const timingBefore = await project(page);
    const timingReport = (await jsonDownload(page, () => control.click()))
      .value;
    expect(timingReport.inputs.current).toEqual(before.lap);
    expect(timingReport.inputs.reference).toEqual(timingBefore.reference);
    expect(timingReport.referenceKind).toBe("timing-only");
    expect(timingReport.availableFields.reference).toEqual(["time"]);
    expect(
      timingReport.samples.every(
        (row: { reference: Record<string, number> }) =>
          Object.keys(row.reference).join() === "time",
      ),
    ).toBe(true);
    expect(timingReport.summary.deltaTime).toBeCloseTo(-0.1 * lap.lapTime, 10);
    expect(await project(page)).toEqual(timingBefore);
    await expect(cursor).toHaveAttribute("value", time);
    await expect(range).toHaveValue("2");
    await expect(
      page.getByRole("button", { name: "Time", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("status").filter({ hasText: "Playback loop:" }),
    ).toHaveText("Playback loop: Sector 2");
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
