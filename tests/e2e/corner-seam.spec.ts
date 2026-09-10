import { expect, test, type Page } from "@playwright/test";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import {
  defaultSetup,
  lapSchema,
  type Lap,
  type TimingReference,
} from "../../packages/shared/schema";

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

for (const width of [1600, 390]) {
  test(`closed corner events seek and compare across start/finish at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await request.post("/api/simulate", {
      data: {
        trackId: source.id,
        vehicleId: "formula-development",
        setup: { ...defaultSetup, solver: "centerline" },
      },
    });
    expect(response.ok()).toBe(true);
    const original = lapSchema.parse(await response.json());
    const originalCorner = original.corners[1];
    const shift = originalCorner.apexIndex;
    const track = {
      ...source,
      id: "corner-seam-circuit",
      name: "Start-rotated development circuit",
      points: [...source.points.slice(shift), ...source.points.slice(0, shift)],
    };
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Solver mode" })
      .selectOption("centerline");
    await page.getByLabel("Import track file", { exact: true }).setInputFiles({
      name: "corner-seam.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(track)),
    });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(track.id);
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const lap: Lap = before.lap;
    const corner = lap.corners.find((item) => item.apexIndex === 0)!;
    expect(corner).toBeDefined();
    expect(lap.cornerAnalysis).toBe("closed-windows-v1");
    expect(corner.entryIndex).toBeGreaterThan(corner.exitIndex);
    expect(corner.brakingDistance).toBeCloseTo(
      originalCorner.brakingDistance,
      8,
    );
    expect(corner.time).toBeCloseTo(originalCorner.time, 8);
    let requests = 0;
    page.on("request", (item) => {
      if (item.url().endsWith("/api/simulate")) requests++;
    });
    await page
      .getByRole("button", { name: `Select corner ${corner.id}`, exact: true })
      .click();
    await expect(page.getByTestId("corner-seam-note")).toContainText(
      "Events cross start / finish",
    );
    await expect(page.locator(".corner-detail")).toContainText(
      `${corner.brakingDistance.toFixed(0)} m to apex`,
    );
    const row = page
      .getByRole("button", { name: `Select corner ${corner.id}`, exact: true })
      .locator("xpath=ancestor::tr");
    await expect(row.locator("td").last()).toHaveText("0.000");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    for (const [name, key] of [
      ["Brake", "brakingIndex"],
      ["Turn-in", "turnInIndex"],
      ["Apex", "apexIndex"],
      ["Throttle", "throttleIndex"],
    ] as const) {
      await page
        .locator(".corner-events")
        .getByRole("button", { name: new RegExp(`^${name}`) })
        .click();
      await expect(cursor).toHaveAttribute(
        "value",
        String(lap.samples[corner[key]].time),
      );
      await expect(
        page.getByRole("button", { name: "Play playback", exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await page.locator(".event-marker").first().click();
    await expect(cursor).toHaveAttribute(
      "value",
      String(lap.samples[corner.brakingIndex].time),
    );
    // A complete known scale change gives an independent wrapped-interval delta.
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Closed interval timing",
      vehicleLabel: "Test",
      origin: "external-simulation",
      source: "Synthetic timing scaled from this solver lap",
      trackId: lap.trackId,
      lapTime: lap.lapTime * 1.1,
      units: { time: "s", progress: "fraction" },
      alignment: lap.alignment!,
      samples: lap.samples.map((sample) => ({ time: sample.time * 1.1 })),
    };
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "closed-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(timing)),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      timing.label,
    );
    await expect(row.locator("td").last()).toHaveText(
      (-0.1 * corner.time).toFixed(3),
    );
    const after = await project(page);
    expect(after.lap).toEqual(before.lap);
    expect(after.track).toEqual(before.track);
    expect(after.setup).toEqual(before.setup);
    expect(after.reference).toEqual(timing);
    await expect(cursor).toHaveAttribute(
      "value",
      String(lap.samples[corner.brakingIndex].time),
    );
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
  });
}
