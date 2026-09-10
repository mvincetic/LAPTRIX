import { expect, test } from "@playwright/test";
import { slopedTerrainTrack } from "../fixtures/terrain";
import { racingLinePixels } from "../fixtures/viewer-pixels";

for (const width of [1600, 390]) {
  test(`synthetic ground preserves the visible racing line on an imported slope at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const source = slopedTerrainTrack();
    await page
      .getByLabel("Import track file", { exact: true })
      .setInputFiles({
        name: "original-sloped-circle.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(source)),
      });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(source.id);
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    const lapTime = await page.getByTestId("lap-time").textContent();
    const canvas = await page.locator("canvas").elementHandle();
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show current ghost", exact: true })
      .uncheck();
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    for (const name of [
      "Braking zones",
      "Apex points",
      "Corner numbers",
      "Sector labels",
    ])
      await page.getByRole("checkbox", { name, exact: true }).uncheck();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    for (const mode of ["Top View", "3D View"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      const terrain = page.getByRole("checkbox", {
        name: "Terrain & trees",
        exact: true,
      });
      await terrain.uncheck();
      await expect
        .poll(async () => (await racingLinePixels(page)).count)
        .toBeGreaterThan(100);
      const without = (await racingLinePixels(page)).count;
      await terrain.check();
      // A 2% rasterization allowance retains antialiasing differences; the old
      // terrain hid full runs of source segments rather than edge pixels.
      await expect
        .poll(async () => (await racingLinePixels(page)).count / without)
        .toBeGreaterThan(0.98);
      expect((await racingLinePixels(page)).error).toBe(0);
    }
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
    await expect(cursor).toHaveAttribute("value", "20");
    await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
      "21",
    );
    await expect(page.getByTestId("lap-time")).toHaveText(lapTime!);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
  });
}
