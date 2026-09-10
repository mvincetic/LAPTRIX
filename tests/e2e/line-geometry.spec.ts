import { test, expect, type Page } from "@playwright/test";
import { gradedWideTrack } from "../fixtures/line-geometry";

const track = gradedWideTrack();
const points = track.points;
const file = {
  name: "graded-wide.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(track)),
};

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

test("an unsupported optimized slope preserves the workspace and can be imported in centerline mode", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const cursor = page.getByRole("slider", { name: "Lap playback position" });
  await cursor.fill("20");
  await page.getByRole("slider", { name: "Fuel load" }).fill("80");
  const before = await exportProject(page);
  const rejected = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/simulate") &&
      r.request().postDataJSON().trackId === track.id &&
      r.request().postDataJSON().setup.solver === "optimized",
  );
  await page
    .getByLabel("Import track file", { exact: true })
    .setInputFiles(file);
  expect((await rejected).status()).toBe(422);
  await expect(page.getByRole("alert")).toContainText("slope limit");
  await expect(page.getByRole("alert")).toContainText("Centerline");
  await expect(page.getByRole("alert")).toContainText("Current workspace kept");
  await expect(
    page.getByRole("option", { name: track.name, exact: true }),
  ).toHaveCount(0);
  expect(await exportProject(page)).toEqual(before);
  expect(await cursor.inputValue()).toBe("20");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page
    .getByRole("combobox", { name: "Solver mode" })
    .selectOption("centerline");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import track again", exact: true })
    .click();
  await (await chooser).setFiles(file);
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(track.id);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const imported = await exportProject(page);
  expect(imported.track.points).toEqual(points);
  expect(imported.lap.setup.solver).toBe("centerline");
  expect(imported.lap.setup.fuel).toBe(80);
  expect(imported.reference.setup.solver).toBe("centerline");
  expect(imported.lap.numericalChecks.maxDemandRatio).toBeLessThanOrEqual(
    1.015,
  );

  await page
    .getByRole("combobox", { name: "Solver mode" })
    .selectOption("optimized");
  const pendingSetup = await exportProject(page);
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("slope limit");
  expect(await exportProject(page)).toEqual(pendingSetup);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
});
