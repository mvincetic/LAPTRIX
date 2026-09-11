import { test, expect } from "@playwright/test";

test.use({
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: [
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  },
});

test("compact native-scrollbar header keeps branding clear of simulation actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  async function inspect(state: string) {
    for (const width of [320, 700]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator(".topbar")
        .screenshot({ path: `artifacts/track-select-${width}-${state}.png` });
      const layout = await page.evaluate(() => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(".brand-word")!);
        const word = range.getBoundingClientRect(),
          actions = document
            .querySelector(".topbar-actions")!
            .getBoundingClientRect();
        const track = document
            .querySelector(".track-field")!
            .getBoundingClientRect(),
          vehicle = document
            .querySelector(".vehicle-field")!
            .getBoundingClientRect();
        return {
          fieldsAligned:
            Math.abs(track.top - vehicle.top) < 1 &&
            Math.min(track.top, vehicle.top) >= actions.bottom + 6,
          gap: actions.left - word.right,
          sameRow:
            Math.min(word.bottom, actions.bottom) >
            Math.max(word.top, actions.top),
          inside:
            actions.right <=
            document.querySelector(".topbar")!.getBoundingClientRect().right,
        };
      });
      expect(layout.gap).toBeGreaterThanOrEqual(6);
      expect(layout.sameRow).toBe(true);
      expect(layout.inside).toBe(true);
      expect(layout.fieldsAligned).toBe(true);
    }
    await page.setViewportSize({ width: 320, height: 900 });
  }
  let releaseCatalog = () => {},
    releaseCalculation = () => {};
  const catalogGate = new Promise<void>((resolve) => {
    releaseCatalog = resolve;
  });
  const calculationGate = new Promise<void>((resolve) => {
    releaseCalculation = resolve;
  });
  await page.route("**/api/catalog", async (route) => {
    await catalogGate;
    await route.continue();
  });
  try {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Connecting…", exact: true }),
    ).toBeDisabled();
    await inspect("loading");
    releaseCatalog();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const lap = await page.getByTestId("lap-time").textContent();
    await inspect("ready");
    await page.route("**/api/simulate", async (route) => {
      await calculationGate;
      await route.abort("aborted");
    });
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    const cancel = page.getByRole("button", {
      name: "Cancel calculation",
      exact: true,
    });
    await expect(cancel).toBeEnabled();
    await inspect("cancelling");
    await cancel.click();
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(page.getByTestId("lap-time")).toHaveText(lap!);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveAccessibleDescription("Development");
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    releaseCatalog();
    releaseCalculation();
    await page.unrouteAll({ behavior: "wait" });
  }
});
