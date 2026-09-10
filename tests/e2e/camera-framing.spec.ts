import { test, expect, type Page } from "@playwright/test";
import { largeFramingTrack } from "../fixtures/camera";
import { racingLinePixels } from "../fixtures/viewer-pixels";

async function exportProject(page: Page) {
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

test("large imported circuits remain rendered through mobile resize, camera changes and reset", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const track = page.getByRole("combobox", { name: "Track", exact: true });
  const originalID = await track.inputValue();
  await page
    .getByLabel("Import track file", { exact: true })
    .setInputFiles({
      name: "large-framing.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(largeFramingTrack)),
    });
  await expect(track).toHaveValue(largeFramingTrack.id);
  await expect(page.locator(".scene canvas")).toBeVisible();
  const cursor = page.getByRole("slider", { name: "Lap playback position" });
  await cursor.fill("20");
  await page.getByRole("slider", { name: "Fuel load" }).fill("80");
  const before = await exportProject(page);
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/simulate")) requests++;
  });
  for (const [width, height] of [
    [1600, 1000],
    [390, 844],
    [1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const mode of ["3D View", "Top View"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      await page
        .getByRole("button", { name: "Reset camera", exact: true })
        .click();
      await expect
        .poll(async () => (await racingLinePixels(page)).count)
        .toBeGreaterThan(100);
      expect((await racingLinePixels(page)).error).toBe(0);
      expect(await cursor.inputValue()).toBe("20");
    }
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  }
  await page.getByRole("button", { name: "Chase", exact: true }).click();
  await expect
    .poll(async () => (await racingLinePixels(page)).count)
    .toBeGreaterThan(100);
  await page.getByRole("button", { name: "3D View", exact: true }).click();
  await expect
    .poll(async () => (await racingLinePixels(page)).count)
    .toBeGreaterThan(100);
  expect(await cursor.inputValue()).toBe("20");
  expect(requests).toBe(0);
  expect(await exportProject(page)).toEqual(before);
  await track.selectOption(originalID);
  await expect(track).toHaveValue(originalID);
  await expect
    .poll(async () => (await racingLinePixels(page)).count)
    .toBeGreaterThan(100);
  expect(requests).toBe(2);
});
