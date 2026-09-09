import { test, expect } from "@playwright/test";
import { cornerDelta, signed } from "../../packages/telemetry";

test("resampling keeps source geometry and reference alignment through save and reload", async ({
  page,
}) => {
  const firstResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/simulate") &&
      r.request().postDataJSON()?.setup.solver === "optimized",
  );
  await page.goto("/");
  const initial = await (await firstResponse).json();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const initialTime = await page.getByTestId("lap-time").textContent();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page.locator(".advanced summary").click();
  await page
    .getByRole("combobox", { name: "Spatial sampling" })
    .selectOption("5m");
  await expect(page.getByText("Setup changed · run to apply")).toBeVisible();
  const sampledResponse = page.waitForResponse((r) =>
    r.url().endsWith("/api/simulate"),
  );
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  const sampled = await (await sampledResponse).json();
  expect(sampled.samples.length).not.toBe(initial.samples.length);
  expect(sampled.alignment.trackFingerprint).toBe(
    initial.alignment.trackFingerprint,
  );
  expect(sampled.sampling.meanSpacing).toBeLessThanOrEqual(5.001);
  await expect(page.getByTestId("sampling-summary")).toContainText(
    "1,121 samples",
  );
  const row = page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .locator("xpath=ancestor::tr");
  await expect(row.locator("td").last()).toHaveText(
    signed(cornerDelta(sampled, initial, sampled.corners[1])!),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("laptrix.project.v1")!),
  );
  expect(saved.setup.sampling).toBe("5m");
  expect(saved.reference.samples.length).toBe(initial.samples.length);
  await page.reload();
  await expect(page.getByTestId("sampling-summary")).toContainText(
    "1,121 samples",
  );
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(initialTime!);
  await page.locator(".advanced summary").click();
  await expect(
    page.getByRole("combobox", { name: "Spatial sampling" }),
  ).toHaveValue("5m");
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await downloaded).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.track.points.length).toBe(initial.sampling.sourcePointCount);
  expect(exported.lap.sampling.pointCount).toBe(sampled.sampling.pointCount);
});
