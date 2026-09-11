import { test, expect, type Page } from "@playwright/test";

async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function clearActions(page: Page) {
  const overlap = await page.evaluate(() => {
    const panel = document
      .querySelector(".viewer-popover:not([hidden])")!
      .getBoundingClientRect();
    const actions = document
      .querySelector(".view-actions")!
      .getBoundingClientRect();
    return (
      Math.max(
        0,
        Math.min(panel.right, actions.right) -
          Math.max(panel.left, actions.left),
      ) *
      Math.max(
        0,
        Math.min(panel.bottom, actions.bottom) -
          Math.max(panel.top, actions.top),
      )
    );
  });
  expect(overlap).toBe(0);
}

for (const viewport of [
  { width: 1600, height: 1000 },
  { width: 320, height: 900 },
  { width: 780, height: 390 },
])
  test(`open layer controls leave camera actions reachable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    if (viewport.width !== 1600) {
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption("red-bull-ring");
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
    }
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("20");
    const before = await project(page);
    const canvas = await page.locator(".scene canvas").elementHandle();
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    if (viewport.height < 500)
      await page
        .getByRole("button", { name: "Fullscreen viewer", exact: true })
        .click();
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    const panel = page.getByRole("tabpanel", {
      name: "Analysis Layers",
      exact: true,
    });
    await expect(panel).toBeVisible();
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/layer-clearance-${viewport.width}.png` });
    await clearActions(page);
    await expect(
      panel.getByRole("group", { name: "Lap overlays" }),
    ).toBeVisible();
    const environment = panel
      .getByRole("group", { name: "Scene", exact: true })
      .getByRole("checkbox", { name: "Environment" });
    await environment.uncheck();
    await environment.check();
    const source = panel.locator(".viewer-source-layers > summary");
    await expect(
      panel.getByRole("checkbox", { name: "Source centerline" }),
    ).toHaveCount(0);
    await source.focus();
    await source.press("Enter");
    for (const name of ["Source centerline", "Source road edges"]) {
      await page.keyboard.press("Tab");
      const input = panel.getByRole("checkbox", { name, exact: true });
      await expect(input).toBeFocused();
      await input.press("Space");
      await expect(input).toBeChecked();
      expect(
        await input.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return (
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ) === node
          );
        }),
      ).toBe(true);
    }
    await clearActions(page);
    await source.focus();
    await source.press("Enter");
    await page.getByRole("button", { name: "Onboard", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Onboard", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      panel.getByText("Markers and labels appear in 3D and Top views."),
    ).toBeVisible();
    for (const name of ["Ghost Car", "Camera"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await clearActions(page);
    }
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await source.focus();
    await source.press("Enter");
    for (const name of ["Source centerline", "Source road edges"])
      await expect(
        panel.getByRole("checkbox", { name, exact: true }),
      ).toBeChecked();
    await expect(cursor).toHaveAttribute("value", "20");
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page
      .getByRole("button", { name: "Play viewer lap", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.getAttribute("value")))
      .toBeGreaterThan(20.2);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    await cursor.fill("20");
    if (viewport.height < 500)
      await page
        .getByRole("button", { name: "Exit fullscreen viewer", exact: true })
        .click();
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector(".scene canvas"),
      ),
    ).toBe(true);
    expect(await project(page)).toEqual(before);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
