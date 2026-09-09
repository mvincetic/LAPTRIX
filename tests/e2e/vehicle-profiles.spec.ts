import { test, expect, type Page } from "@playwright/test";
import formula from "../../data/vehicles/formula-development.json" with { type: "json" };
import crossing from "../fixtures/crossing-track.json" with { type: "json" };
import { formatTime } from "../../packages/telemetry";

const profile = {
  ...formula,
  mass: 950,
  name: "User Formula study",
  assumptions: ["Original synthetic test fixture; no measured calibration."],
};

test("accepted long vehicle metadata remains readable without horizontal panel overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const stress = {
    ...profile,
    id: "long-profile",
    name: "V".repeat(100),
    description: "D".repeat(1000),
    assumptions: ["A".repeat(500)],
  };
  await upload(page, stress);
  await expect(page.getByTestId("result-vehicle")).toHaveText(stress.name);
  await page.getByText("Vehicle data & assumptions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  for (const width of [1600, 1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const selector of [
      ".vehicle-details-body",
      ".lap-result",
      ".comparison-foot",
    ]) {
      const sizes = await page.locator(selector).evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(sizes.scroll, selector).toBeLessThanOrEqual(sizes.client + 1);
    }
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    const ghostSizes = await page
      .getByRole("tabpanel", { name: "Ghost Car", exact: true })
      .evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
    expect(ghostSizes.scroll).toBeLessThanOrEqual(ghostSizes.client + 1);
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Compare aero settings", exact: true })
      .click();
    const sizes = await page.locator(".aero-context").evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  }
});

for (const failedSolver of ["optimized", "centerline"]) {
  test(`an embedded project with a failed ${failedSolver} solve registers neither vehicle nor track`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const before = await exportJson(page);
    const project = {
      ...before,
      projectName: "Embedded study",
      vehicleSource: "embedded",
      vehicle: profile,
      track: crossing,
      lap: null,
      reference: null,
    };
    await page.route("**/api/simulate", (route) =>
      route.request().postDataJSON().setup.solver === failedSolver
        ? route.fulfill({
            status: 503,
            json: { detail: "Embedded solve unavailable" },
          })
        : route.continue(),
    );
    await upload(page, project, "project");
    await expect(page.getByRole("alert")).toContainText(
      "Embedded solve unavailable",
    );
    expect(await exportJson(page)).toEqual(before);
    await expect(
      page.getByRole("combobox", { name: "Car profile" }).locator("option"),
    ).toHaveCount(2);
    await expect(
      page
        .getByRole("combobox", { name: "Track", exact: true })
        .locator("option"),
    ).toHaveCount(1);
    await page.unroute("**/api/simulate");
    await upload(page, project, "project");
    await expect(page.getByTestId("result-vehicle")).toHaveText(profile.name);
    await ready(page);
    const after = await exportJson(page);
    expect(after.track.id).toBe(crossing.id);
    expect(after.vehicle.id).toMatch(/^formula-development-import-/);
    expect(after.lap.vehicle).toEqual(after.vehicle);
    expect(after.reference.vehicle).toEqual(after.vehicle);
    expect(after.reference.setup.solver).toBe("centerline");
  });
}
const file = (value: unknown) => ({
  name: "profile.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});
const upload = (page: Page, value: unknown, kind = "vehicle") =>
  page
    .getByLabel(`Import ${kind} file`, { exact: true })
    .setInputFiles(file(value));
const ready = (page: Page) =>
  expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
async function exportJson(page: Page, action = "Export project", menu = true) {
  if (menu)
    await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: action, exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("vehicle templates, collision-safe imports, reruns, portable files and local saves preserve the full profile and native reference", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const template = await exportJson(page, "Export vehicle JSON");
  expect(template).toEqual(formula);
  const before = await exportJson(page);
  await upload(page, profile);
  await expect(page.getByTestId("result-vehicle")).toHaveText(profile.name);
  await ready(page);
  const imported = await exportJson(page);
  expect(imported.version).toBe(3);
  expect(imported.vehicleSource).toBe("embedded");
  expect(imported.vehicle.id).toMatch(/^formula-development-import-/);
  expect({ ...imported.vehicle, id: profile.id }).toEqual(profile);
  expect(imported.lap.vehicle).toEqual(imported.vehicle);
  expect(imported.reference).toEqual(before.reference);
  expect(imported.reference.vehicle.id).toBe(formula.id);
  expect(await exportJson(page, "Export vehicle JSON")).toEqual(
    imported.vehicle,
  );
  await page.getByText("Vehicle data & assumptions", { exact: true }).click();
  await expect(
    page.getByText(
      "User-supplied profile · unverified parameters and sources",
      { exact: true },
    ),
  ).toBeVisible();
  await upload(page, profile);
  await ready(page);
  await expect(
    page.getByRole("combobox", { name: "Car profile" }).locator("option"),
  ).toHaveCount(3);
  await page.getByRole("slider", { name: "Fuel load" }).focus();
  await page.keyboard.press("End");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await ready(page);
  const rerun = await exportJson(page);
  expect(rerun.lap.vehicle).toEqual(imported.vehicle);
  expect(rerun.lap.setup.fuel).toBe(110);
  expect(rerun.reference).toEqual(before.reference);
  const fresh = await page.context().newPage();
  await fresh.goto("http://127.0.0.1:5173/");
  await expect(fresh.getByTestId("lap-time")).toBeVisible();
  await upload(fresh, rerun, "project");
  await ready(fresh);
  await expect(fresh.getByTestId("lap-time")).toHaveText(
    formatTime(rerun.lap.lapTime),
  );
  const restored = await exportJson(fresh);
  expect(restored.vehicle).toEqual(rerun.vehicle);
  expect(restored.reference).toEqual(before.reference);
  await fresh.getByRole("button", { name: "Save", exact: true }).click();
  await fresh.reload();
  await expect(fresh.getByTestId("lap-time")).toHaveText(
    formatTime(rerun.lap.lapTime),
  );
  const saved = await exportJson(fresh);
  expect(saved.vehicleSource).toBe("embedded");
  expect(saved.vehicle).toEqual(rerun.vehicle);
  expect(saved.reference).toEqual(before.reference);
  expect(saved.lap.vehicle).toEqual(rerun.vehicle);
  await fresh.close();
});

test("custom vehicle physics reach track baselines, every aero candidate, and project recalculation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const custom = { ...profile, id: "user-formula" };
  const requests: {
    vehicle: typeof custom;
    trackId: string;
    setup: { solver: string };
  }[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate"))
      requests.push(request.postDataJSON());
  });
  await upload(page, custom);
  await expect(page.getByTestId("result-vehicle")).toHaveText(custom.name);
  await upload(page, crossing, "track");
  await ready(page);
  expect(
    requests
      .filter((r) => r.trackId === crossing.id)
      .map((r) => r.setup.solver)
      .sort(),
  ).toEqual(["centerline", "optimized"]);
  const before = await exportJson(page);
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Compare aero settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Compare aero settings" });
  await dialog
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await expect(dialog.getByTestId("aero-status")).toHaveText(
    "Comparison complete · 5 checked results",
    { timeout: 30000 },
  );
  const study = await exportJson(page, "Export study JSON", false);
  expect(study.source.vehicle).toEqual(custom);
  for (const candidate of study.candidates)
    expect(candidate.result.vehicle).toEqual(custom);
  await dialog.getByRole("button", { name: "Apply selected result" }).click();
  expect((await exportJson(page)).reference).toEqual(before.reference);
  await upload(page, { ...before, reference: null, lap: null }, "project");
  await ready(page);
  const restored = await exportJson(page);
  expect(restored.lap.vehicle).toEqual(custom);
  expect(restored.reference.vehicle).toEqual(custom);
  expect(restored.reference.setup.solver).toBe("centerline");
  expect(requests).toHaveLength(10); // import + two track solves + five study rows + two project solves
  for (const request of requests) expect(request.vehicle).toEqual(custom);
});

test("invalid, failed and cancelled vehicle imports preserve pending edits and do not reserve an ID", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByLabel("Project name").fill("Keep my pending work");
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole("slider", { name: "Fuel load" }).focus();
  await page.keyboard.press("End");
  const before = await exportJson(page);
  const custom = { ...profile, id: "transactional-vehicle" };
  await upload(page, { ...custom, mass: 1e12 });
  await expect(page.getByRole("alert")).toContainText("Current workspace kept");
  expect(await exportJson(page)).toEqual(before);
  await page.route("**/api/simulate", (route) =>
    route.fulfill({
      status: 503,
      json: { detail: "Profile solve unavailable" },
    }),
  );
  await upload(page, custom);
  await expect(page.getByRole("alert")).toContainText(
    "Profile solve unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Import vehicle again", exact: true }),
  ).toBeVisible();
  expect(await exportJson(page)).toEqual(before);
  await page.unroute("**/api/simulate");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/simulate", async (route) => {
    await gate;
    await route.abort("aborted");
  });
  try {
    const started = page.waitForRequest("**/api/simulate");
    await upload(page, custom);
    await started;
    const aborted = page.waitForEvent("requestfailed", (request) =>
      request.url().endsWith("/api/simulate"),
    );
    await page
      .getByRole("button", { name: "Cancel calculation", exact: true })
      .click();
    await aborted;
    await ready(page);
    expect(await exportJson(page)).toEqual(before);
    await expect(
      page.getByRole("combobox", { name: "Car profile" }).locator("option"),
    ).toHaveCount(2);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
  await upload(page, custom);
  await expect(page.getByTestId("result-vehicle")).toHaveText(custom.name);
  const after = await exportJson(page);
  expect(after.vehicle.id).toBe(custom.id);
  expect(after.lap.setup.fuel).toBe(110);
  expect(after.reference).toEqual(before.reference);
});

test("a superseded vehicle import cannot register a stale profile or replace the latest workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const old = {
    ...profile,
    id: "older-import",
    name: "Older imported profile",
  };
  const current = {
    ...profile,
    id: "latest-import",
    name: "Latest imported profile",
  };
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/simulate", async (route) => {
    if (route.request().postDataJSON().vehicleId !== old.id)
      return route.continue();
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  try {
    const started = page.waitForRequest("**/api/simulate");
    await upload(page, old);
    await started;
    await upload(page, current);
    await expect(page.getByTestId("result-vehicle")).toHaveText(current.name);
    const before = await exportJson(page);
    const finished = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON().vehicleId === old.id,
    );
    release();
    await (await finished).finished();
    expect(await exportJson(page)).toEqual(before);
    await expect(
      page.getByRole("combobox", { name: "Car profile" }).locator("option"),
    ).toHaveCount(3);
    await expect(
      page.getByRole("option", { name: old.name, exact: true }),
    ).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
