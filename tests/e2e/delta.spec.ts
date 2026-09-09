import { test, expect } from "@playwright/test";
import { signed } from "../../packages/telemetry";

test("delta trace follows reference timing, both axes and the shared playback cursor", async ({
  page,
}) => {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/simulate") &&
      r.request().postDataJSON()?.setup.solver === "optimized",
  );
  await page.goto("/");
  const lap = await (await response).json();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "delta-fixture.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "laptrix-timing-reference-v1",
          label: "Ten percent slower fixture",
          vehicleLabel: "Test vehicle",
          origin: "external-simulation",
          source: "Synthetic test timing derived from the current simulation",
          trackId: lap.trackId,
          lapTime: lap.lapTime * 1.1,
          units: { time: "s", progress: "fraction" },
          alignment: lap.alignment,
          samples: lap.samples.map((s: { time: number }) => ({
            time: s.time * 1.1,
          })),
        }),
      ),
    });
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Ten percent slower fixture",
  );
  await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
  await expect(page.getByTestId("cursor-delta")).toHaveText("0.000 s");
  await page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .click();
  const cornerTime = lap.samples[lap.corners[1].apexIndex].time;
  await expect(page.getByTestId("cursor-delta")).toHaveText(
    `${signed(-0.1 * cornerTime)} s`,
  );
  await page.getByRole("button", { name: "Time", exact: true }).click();
  const chart = page.getByRole("img", {
    name: "Time difference to reference along the lap",
  });
  const box = (await chart.boundingBox())!;
  await chart.click({ position: { x: box.width / 2, y: box.height / 2 } });
  const position = Number(
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue(),
  );
  expect(position).toBeCloseTo(lap.lapTime / 2, 1);
  await expect(page.getByTestId("cursor-delta")).toHaveText(
    `${signed((-0.1 * lap.lapTime) / 2)} s`,
  );
  await page.getByRole("button", { name: "Distance", exact: true }).click();
  await expect(page.getByTestId("cursor-delta")).toHaveText(
    `${signed((-0.1 * lap.lapTime) / 2)} s`,
  );
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole("slider", { name: "Lap playback position" })
          .inputValue(),
      ),
    )
    .toBeGreaterThan(position + 0.1);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  const now = Number(
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue(),
  );
  const delta = parseFloat(
    (await page.getByTestId("cursor-delta").textContent())!,
  );
  expect(delta).toBeCloseTo(-0.1 * now, 2);
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await expect(page.getByTestId("cursor-delta")).toHaveText("0.000 s");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(chart).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
