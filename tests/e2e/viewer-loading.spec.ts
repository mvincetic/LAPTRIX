import { test, expect } from "@playwright/test";

const viewerModule =
  /\/(?:apps\/web\/src\/components\/TrackView\.tsx|assets\/TrackView-[^/]+\.js)(?:\?.*)?$/;

test("the workspace calculates and edits setup while the 3D module is delayed", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(viewerModule, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const original = await page.getByTestId("lap-time").textContent();
    await expect(
      page.getByText("Loading 3D viewer…", { exact: true }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).focus();
    await page.keyboard.press("End");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByTestId("lap-time")).not.toHaveText(original!);
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await expect(
      page.getByText("Time delta at cursor", { exact: true }),
    ).toBeVisible();
    release();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
      "110",
    );
    await expect(
      page.getByText("Loading 3D viewer…", { exact: true }),
    ).not.toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("a failed viewer download leaves the workspace usable and recovers after explicit save and reload", async ({
  page,
}) => {
  let requests = 0;
  await page.route(viewerModule, async (route) => {
    requests++;
    if (requests === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByText("The 3D viewer could not load", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByLabel("Project name").fill("Recover viewer study");
  await page.getByRole("slider", { name: "Fuel load" }).focus();
  await page.keyboard.press("End");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  const lap = await page.getByTestId("lap-time").textContent();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Reload page", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(requests).toBeGreaterThan(1);
  await expect(page.getByTestId("lap-time")).toHaveText(lap!);
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Recover viewer study",
  );
  await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
    "110",
  );
});
