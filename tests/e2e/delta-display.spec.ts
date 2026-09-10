import { test, expect, type Page } from "@playwright/test";
import type { Lap, TimingReference } from "../../packages/shared/schema";

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
async function timing(page: Page, lap: Lap, delta: number, label: string) {
  const lapTime = lap.lapTime - delta;
  const reference: TimingReference = {
    format: "laptrix-timing-reference-v1",
    label,
    vehicleLabel: "Test",
    origin: "external-simulation",
    source: "Original display-precision browser fixture",
    trackId: lap.trackId,
    lapTime,
    units: { time: "s", progress: "fraction" },
    alignment: lap.alignment!,
    samples: lap.samples.map((sample) => ({
      time: (sample.time * lapTime) / lap.lapTime,
    })),
  };
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "precision-reference.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(reference)),
    });
  await expect(page.getByTestId("reference-vehicle")).toContainText(label);
  return reference;
}
for (const width of [1600, 390]) {
  test(`displayed zero deltas stay neutral while exact data and meaningful comparison directions survive at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const before = await project(page);
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    const badge = page.locator(".delta-badge");
    await expect(badge).toHaveText("0.000 s");
    await expect(badge).toHaveClass(/\bneutral\b/);
    await expect(badge.locator("svg")).toHaveCount(0);
    await expect(
      page.locator(".analysis-column .positive, .analysis-column .negative"),
    ).toHaveCount(0);
    await expect(
      page.locator(".analysis-column").getByText(/^[+-]0\.000$/),
    ).toHaveCount(0);
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await expect(page.getByTestId("cursor-delta")).toHaveText("0.000 s");
    await expect(page.getByTestId("cursor-delta")).toHaveClass(/\bneutral\b/);
    const paths = page
      .getByRole("img", { name: "Time difference to reference along the lap" })
      .locator("path");
    await expect(paths).toHaveCount(2);
    for (const path of await paths.all())
      await expect(path).toHaveAttribute("stroke", "#526379");
    expect((await project(page)).reference).toEqual(before.lap);
    await page
      .getByRole("button", { name: "Dismiss notification" })
      .evaluateAll((buttons) =>
        buttons.forEach((button) => (button as HTMLElement).click()),
      );
    await page.screenshot({
      path: `artifacts/delta-display-equal-${width}.png`,
      fullPage: true,
    });

    const tiny = await timing(
      page,
      before.lap,
      0.0004,
      "Sub-millisecond fixture",
    );
    await expect(badge).toHaveText("0.000 s");
    await expect(badge).toHaveClass(/\bneutral\b/);
    const exact = await project(page);
    expect(exact.lap).toEqual(before.lap);
    expect(exact.track).toEqual(before.track);
    expect(exact.reference).toEqual(tiny);
    expect(exact.lap.lapTime - exact.reference.lapTime).toBeGreaterThan(0);

    await timing(page, before.lap, 0.002, "Percentage precision fixture");
    await expect(badge).toHaveText("+0.002 s");
    await expect(badge).toHaveClass(/\bnegative\b/);
    await expect(page.locator(".comparison-foot strong")).toHaveText("0.00%");
    await expect(page.locator(".comparison-foot strong")).toHaveClass(
      /\bneutral\b/,
    );
    for (const [delta, tone, text] of [
      [1, "negative", "+1.000 s"],
      [-1, "positive", "-1.000 s"],
    ] as const) {
      const reference = await timing(
        page,
        before.lap,
        delta,
        `Visible ${tone} fixture`,
      );
      await expect(badge).toHaveText(text);
      await expect(badge).toHaveClass(new RegExp(`\\b${tone}\\b`));
      await expect(page.getByTestId("cursor-delta")).toHaveClass(
        new RegExp(`\\b${tone}\\b`),
      );
      expect((await project(page)).reference).toEqual(reference);
    }
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("20");
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(calculations).toBe(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Dismiss notification" })
      .evaluateAll((buttons) =>
        buttons.forEach((button) => (button as HTMLElement).click()),
      );
    await page.screenshot({
      path: `artifacts/delta-display-gain-${width}.png`,
      fullPage: true,
    });
  });
}
