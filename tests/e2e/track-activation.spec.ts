import { test, expect, type Page } from "@playwright/test";
import crossing from "../fixtures/crossing-track.json" with { type: "json" };
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };

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
const file = {
  name: "crossing.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(crossing)),
};

test("a superseded import cannot add its source or overwrite the newer completed workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = () => {};
  let waiting = 0;
  const bothRequested = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/api/simulate", async (route) => {
    if (route.request().postDataJSON().trackId === crossing.id) {
      if (++waiting === 2) requested();
      await gate;
    }
    await route.continue();
  });
  try {
    await page
      .getByLabel("Import track file", { exact: true })
      .setInputFiles(file);
    await bothRequested;
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toBeDisabled();
    const newer = {
      ...crossing,
      id: "newer-crossing",
      name: "Newer crossing source",
      synthetic: false,
    };
    await page
      .getByLabel("Import track file", { exact: true })
      .setInputFiles({ ...file, buffer: Buffer.from(JSON.stringify(newer)) });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(newer.id);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveAccessibleDescription("Imported · unverified");
    await expect(
      page.locator('optgroup[label="Imported Tracks"] option'),
    ).toHaveText([newer.name]);
    const before = await exportProject(page);
    const responses = ["optimized", "centerline"].map((solver) =>
      page.waitForResponse((response) => {
        if (!response.url().endsWith("/api/simulate")) return false;
        const body = response.request().postDataJSON();
        return body.trackId === crossing.id && body.setup.solver === solver;
      }),
    );
    release();
    await Promise.all(
      (await Promise.all(responses)).map((response) => response.finished()),
    );
    expect(await exportProject(page)).toEqual(before);
    await expect(
      page.getByRole("option", { name: crossing.name, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

for (const failedSolver of ["optimized", "centerline"]) {
  test(`a failed ${failedSolver} import solve preserves the workspace and supports importing the same ID again`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByLabel("Project name").fill("Keep my study");
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    const before = await exportProject(page);
    await page.route("**/api/simulate", (route) => {
      const body = route.request().postDataJSON();
      return body.trackId === crossing.id && body.setup.solver === failedSolver
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Track solve unavailable" }),
          })
        : route.continue();
    });
    await page
      .getByLabel("Import track file", { exact: true })
      .setInputFiles(file);
    await expect(page.getByRole("alert")).toContainText(
      "Current workspace kept",
    );
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(source.id);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveAccessibleDescription("Development");
    await expect(
      page.getByRole("option", { name: crossing.name, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Track imported and simulated", { exact: true }),
    ).toHaveCount(0);
    expect(await exportProject(page)).toEqual(before);
    await page.unroute("**/api/simulate");
    const pending = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Import track again", exact: true })
      .click();
    await (await pending).setFiles(file);
    await expect(
      page.getByText("Track imported and simulated", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(crossing.id);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveAccessibleDescription("Imported · unverified");
    await expect(
      page.locator('optgroup[label="Imported Tracks"] option'),
    ).toHaveText([crossing.name]);
    await expect(page.getByRole("alert")).toHaveCount(0);
    const after = await exportProject(page);
    expect(after.lap.trackId).toBe(crossing.id);
    expect(after.reference.trackId).toBe(crossing.id);
    expect(after.reference.setup.solver).toBe("centerline");
    expect(after.projectName).toBe(before.projectName);
  });
}

test("a failed track selection keeps its old source and retry activates the intended track with a matching reference", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByLabel("Import track file", { exact: true })
    .setInputFiles(file);
  await expect(
    page.getByText("Track imported and simulated", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Track", exact: true })
    .selectOption(source.id);
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  const before = await exportProject(page);
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Selected track unavailable" }),
    }),
  );
  await page
    .getByRole("combobox", { name: "Track", exact: true })
    .selectOption(crossing.id);
  await expect(page.getByRole("alert")).toContainText(
    "Selected track unavailable",
  );
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(source.id);
  expect(await exportProject(page)).toEqual(before);
  await page.unroute("**/api/simulate");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(crossing.id);
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  const after = await exportProject(page);
  expect(after.lap.trackId).toBe(crossing.id);
  expect(after.reference.trackId).toBe(crossing.id);
  expect(after.reference.setup.solver).toBe("centerline");
});
