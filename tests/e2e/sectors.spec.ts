import { test, expect } from "@playwright/test";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import { lapSchema } from "../../packages/shared/schema";

test("fixed source sectors compare legacy references correctly and remain fixed after resampling", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("sector-basis")).toHaveText(
    "Fixed sector gates",
  );
  const oldResponse = await page.request.post("/api/simulate", {
    data: { track: { ...source, schemaVersion: 1 } },
  });
  expect(oldResponse.ok()).toBe(true);
  const legacy = await oldResponse.json();
  expect(legacy.sectorBasis).toBe("racing-line-distance");
  // Reproduce an older export that predates explicit gate metadata.
  delete legacy.sectorBasis;
  for (const sector of legacy.sectors) {
    delete sector.startProgress;
    delete sector.endProgress;
  }
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "legacy-track-v1.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await expect(
    page.getByText("Reference imported · current simulation retained", {
      exact: true,
    }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const text = await page
      .locator(".sector-table tbody tr")
      .nth(i)
      .locator("td")
      .nth(2)
      .textContent();
    expect(Math.abs(Number(text?.replace("−", "-")))).toBeLessThan(0.0005);
  }
  await page.locator(".advanced summary").click();
  await page
    .getByRole("combobox", { name: "Spatial sampling" })
    .selectOption("3m");
  const solving = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/simulate") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  const lap = lapSchema.parse(await (await solving).json());
  expect(lap.sectors.map((s) => s.endProgress)).toEqual(source.sectorFractions);
  expect(lap.sectorBasis).toBe("source-progress");
  expect(lap.samples.length).toBeGreaterThan(legacy.samples.length);
  await expect(page.getByTestId("sector-basis")).toHaveText(
    "Fixed sector gates",
  );
  const invalid = structuredClone(lap);
  invalid.sectors[0].endProgress! += 0.01;
  invalid.sectors[1].startProgress! += 0.01;
  expect(lapSchema.safeParse(invalid).success).toBe(false);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("sector-basis")).toHaveText(
    "Fixed sector gates",
  );
  await expect(page.getByTestId("sampling-summary")).toContainText(
    "1,869 samples",
  );
  await expect(
    page.getByText("legacy-track-v1.json", { exact: false }),
  ).toBeVisible();
  const unsupported = await page.request.post("/api/simulate", {
    data: { track: { ...source, schemaVersion: 3 } },
  });
  expect(unsupported.status()).toBe(422);
});
