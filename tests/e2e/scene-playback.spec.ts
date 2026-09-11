import { expect, test, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

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

async function readout(page: Page, lap: Lap) {
  // Read one DOM state atomically, so ongoing playback cannot race separate assertions.
  const values = await page.evaluate(() => ({
    time: Number(
      document
        .querySelector('[aria-label="Lap playback position"]')!
        .getAttribute("value"),
    ),
    speed: document.querySelector('[data-testid="scene-speed"]')!.textContent,
    gear: document.querySelector('[data-testid="scene-gear"]')!.textContent,
    elapsed: document.querySelector('[data-testid="scene-time"]')!.textContent,
    transport: document.querySelector('[data-testid="playback-time"]')!
      .textContent,
  }));
  const upper = lap.samples.findIndex((sample) => sample.time > values.time);
  const a =
    lap.samples[upper < 0 ? lap.samples.length - 1 : Math.max(0, upper - 1)];
  const b = lap.samples[upper < 0 ? lap.samples.length - 1 : upper];
  const fraction =
    b.time === a.time ? 0 : (values.time - a.time) / (b.time - a.time);
  expect(values.speed).toBe(
    `${Math.round((a.speed + (b.speed - a.speed) * fraction) * 3.6)} km/h`,
  );
  expect(values.gear).toBe(String(a.gear));
  expect(values.elapsed).toBe(values.transport);
  return values.time;
}

for (const width of [1600, 390]) {
  test(`scene playback follows canonical telemetry through seek, rate, loop and finish at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const panel = page.getByRole("group", {
      name: "Current lap playback",
      exact: true,
    });
    await expect(panel).toContainText("Ready");
    await expect(panel).toHaveAttribute("aria-live", "off");
    await expect(page.locator(".track-caption strong")).toHaveText(
      "LAPTRIX Dev Track",
    );
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page),
      lap: Lap = before.lap;
    let calls = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calls++;
    });
    expect(await readout(page, lap)).toBe(0);
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const atTime = page.getByRole("spinbutton", {
      name: "Inspect at time (s)",
    });
    const change = lap.samples.findIndex(
      (a, i) =>
        i < lap.samples.length - 1 && a.gear !== lap.samples[i + 1].gear,
    );
    const exact =
      lap.samples[change].time +
      ((lap.samples[change + 1].time - lap.samples[change].time) * 3) / 7;
    await atTime.fill(String(exact));
    await atTime.press("Enter");
    await expect(panel).toContainText("Paused");
    expect(await readout(page, lap)).toBe(exact);
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await expect(page.locator(".scene-instruction")).toHaveText(
      "Chase camera · playback controls below",
    );
    await page
      .getByRole("combobox", { name: "Playback speed" })
      .selectOption("2");
    await expect(panel).toContainText("2× playback");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect(panel).toContainText("Playing");
    await expect
      .poll(async () => (await readout(page, lap)) > exact)
      .toBe(true);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await expect(panel).toContainText("Paused");
    await readout(page, lap);
    await atTime.fill(String(lap.lapTime - 0.05));
    await atTime.press("Enter");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect.poll(() => readout(page, lap)).toBeLessThan(2);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Loop playback", exact: true })
      .click();
    await atTime.fill(String(lap.lapTime - 0.05));
    await atTime.press("Enter");
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect(panel).toContainText("Lap complete");
    expect(await readout(page, lap)).toBe(lap.lapTime);
    await page
      .getByRole("button", { name: "Restart lap", exact: true })
      .click();
    await expect(panel).toContainText("Ready");
    expect(await readout(page, lap)).toBe(0);
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect(page.locator(".scene-instruction")).toContainText(
      "Drag to orbit",
    );
    expect(await project(page)).toEqual(before);
    expect(calls).toBe(0);
    expect(errors).toEqual([]);
  });
}
