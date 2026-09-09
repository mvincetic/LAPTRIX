import { test, expect } from "@playwright/test";
import { cornerDelta, signed } from "../../packages/telemetry";

test("vehicle changes keep the reference, source correspondence and saved vehicle snapshots", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const formulaTime = await page.getByTestId("lap-time").textContent();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  const gtResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/simulate") &&
      r.request().postDataJSON()?.vehicleId === "gt-development",
  );
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  const gt = await (await gtResponse).json();
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "GT Development 01",
  );
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Formula Development 01",
  );
  await expect(
    page.locator(".comparison-labels > div").last().locator("strong"),
  ).toHaveText(formulaTime!);
  await page.locator(".vehicle-details summary").click();
  await expect(page.locator(".vehicle-details")).toContainText(
    "1,400 kg base mass excludes fuel",
  );
  await expect(
    page.getByRole("link", { name: "Porsche 911 GT3 RS technical data" }),
  ).toHaveAttribute("href", /^https:/);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("laptrix.project.v1")!),
  );
  expect(saved.reference.vehicle.id).toBe("formula-development");
  const row = page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .locator("xpath=ancestor::tr");
  await expect(row.locator("td").last()).toHaveText(
    signed(cornerDelta(gt, saved.reference, gt.corners[1])!),
  );
  await page.reload();
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "GT Development 01",
  );
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Formula Development 01",
  );
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await downloaded).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.lap.vehicle).toEqual(gt.vehicle);
  expect(exported.reference.vehicle.id).toBe("formula-development");
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("formula-development");
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "Formula Development 01",
  );
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "GT Development 01",
  );
});

test("failed vehicle change keeps the result identified and retry applies the new profile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Vehicle solve unavailable" }),
    }),
  );
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await expect(page.getByRole("alert")).toContainText(
    "Vehicle solve unavailable",
  );
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "Formula Development 01",
  );
  await expect(page.getByText("Setup changed · run to apply")).toBeVisible();
  await page.unroute("**/api/simulate");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "GT Development 01",
  );
  await expect(page.getByText("Setup matches current run")).toBeVisible();
});
