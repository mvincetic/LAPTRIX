import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import crossing from "../fixtures/crossing-track.json" with { type: "json" };

test("source geometry diagnostics survive importing, resampling, exporting and mobile restore", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.locator(".track-details summary").click();
  await expect(page.getByTestId("geometry-summary")).toHaveText(
    "No projected segment contacts found.",
  );
  await page.getByLabel("Import track file", { exact: true }).setInputFiles({
    name: "crossing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(crossing)),
  });
  await expect(
    page.getByText("Track imported and simulated", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("geometry-summary")).toHaveText(
    "1 projected segment contact.",
  );
  await expect(page.getByTestId("geometry-height-gap")).toHaveText("7.998 m");
  await expect(
    page.getByRole("img", {
      name: "Top view of source centerline with selected contact segments highlighted",
    }),
  ).toBeVisible();
  await page.locator(".advanced summary").click();
  await page
    .getByRole("combobox", { name: "Spatial sampling" })
    .selectOption("5m");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("sampling-summary")).not.toContainText(
    "160 samples",
  );
  await expect(page.getByTestId("geometry-height-gap")).toHaveText("7.998 m");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export geometry report" }).click();
  const exported = await pending;
  const report = JSON.parse(await readFile((await exported.path())!, "utf8"));
  expect(report.format).toBe("laptrix-track-diagnostics-v1");
  expect(report.track).toEqual(crossing);
  expect(report.trackFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(report.diagnostics).toMatchObject({
    scanComplete: true,
    sourceSampleCount: 160,
    contactCount: 1,
    omittedContacts: 0,
  });
  expect(report.diagnostics.contacts[0].minHeightGap).toBeCloseTo(
    8 * Math.cos(Math.PI / 160),
    9,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.locator(".track-details summary").click();
  await expect(page.getByTestId("geometry-height-gap")).toHaveText("7.998 m");
  await expect(page.getByTestId("geometry-summary")).toHaveText(
    "1 projected segment contact.",
  );
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
});
