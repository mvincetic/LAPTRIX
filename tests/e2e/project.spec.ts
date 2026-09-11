import { test, expect, type Page } from "@playwright/test";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };
import { formatTime } from "../../packages/telemetry";

async function exportProject(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("portable project restores its name, custom track, setup and cross-vehicle reference on a fresh page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByLabel("Import track file", { exact: true }).setInputFiles({
    name: "portable-track.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...source,
        id: "portable-elevation-loop",
        name: "Portable elevation loop",
      }),
    ),
  });
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue("portable-elevation-loop");
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveAccessibleDescription("Imported · unverified");
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "GT Development 01",
  );
  await page.getByLabel("Project name").fill("Portable GT study");
  await page.getByRole("slider", { name: "Fuel load" }).focus();
  await page.keyboard.press("End");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  const exported = await exportProject(page);
  expect(exported.version).toBe(3);
  expect(exported.vehicleSource).toBe("catalog");
  expect(exported.projectName).toBe("Portable GT study");
  expect(exported.setup.fuel).toBe(110);
  const fresh = await page.context().newPage();
  await fresh.goto("http://127.0.0.1:5173/");
  await expect(fresh.getByTestId("lap-time")).toBeVisible();
  await fresh.getByLabel("Import project file", { exact: true }).setInputFiles({
    name: "portable-project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(fresh.getByLabel("Project name")).toHaveValue(
    "Portable GT study",
  );
  await expect(
    fresh.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue("portable-elevation-loop");
  await expect(
    fresh.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveAccessibleDescription("Imported · unverified");
  await expect(
    fresh.locator('optgroup[label="Imported Tracks"] option'),
  ).toHaveText(["Portable elevation loop"]);
  await expect(
    fresh.getByRole("combobox", { name: "Car profile" }),
  ).toHaveValue("gt-development");
  await expect(fresh.getByRole("slider", { name: "Fuel load" })).toHaveValue(
    "110",
  );
  await expect(fresh.getByTestId("reference-vehicle")).toContainText(
    "Formula Development 01",
  );
  await expect(fresh.getByTestId("lap-time")).toHaveText(
    formatTime(exported.lap.lapTime),
  );
  await fresh.getByRole("button", { name: "Save", exact: true }).click();
  await fresh.reload();
  await expect(
    fresh.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveAccessibleDescription("Imported · unverified");
  await expect(fresh.getByTestId("lap-time")).toHaveText(
    formatTime(exported.lap.lapTime),
  );
  await expect(fresh.getByLabel("Project name")).toHaveValue(
    "Portable GT study",
  );
  await expect(fresh.getByTestId("reference-vehicle")).toContainText(
    "Formula Development 01",
  );
  await fresh.close();
});

test("failed project validation or recalculation leaves the current workspace intact", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByLabel("Project name").fill("Original work");
  const currentTime = await page.getByTestId("lap-time").textContent();
  const project = await exportProject(page);
  project.projectName = "Imported work";
  const upload = async (value: unknown) =>
    page.getByLabel("Import project file", { exact: true }).setInputFiles({
      name: "project.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
  await upload({ ...project, version: 99 });
  await expect(page.getByRole("alert")).toContainText("Current workspace kept");
  await expect(page.getByLabel("Project name")).toHaveValue("Original work");
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Project solve unavailable" }),
    }),
  );
  await upload(project);
  await expect(page.getByRole("alert")).toContainText(
    "Project solve unavailable",
  );
  await expect(page.getByLabel("Project name")).toHaveValue("Original work");
  await expect(page.getByTestId("lap-time")).toHaveText(currentTime!);
  await page.unroute("**/api/simulate");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Import project again", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByLabel("Project name")).toHaveValue("Imported work");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
