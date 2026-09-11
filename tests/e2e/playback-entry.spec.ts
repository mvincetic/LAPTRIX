import { expect, test } from "@playwright/test";

for (const width of [1600, 390]) {
  test(`playback finds the current vehicle and respects later camera choices at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await expect(page.locator(".track-caption strong")).toHaveText(
      "Red Bull Ring",
    );
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    const chase = page.getByRole("button", { name: "Chase", exact: true });
    const top = page.getByRole("button", { name: "Top View", exact: true });
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    const identity = page.locator(".scene-identity");
    await expect(chase).toHaveAttribute("aria-pressed", "false");
    await expect(cursor).toHaveAttribute("value", "0");
    await expect(identity).toContainText("CurrentGT Development 01");
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    // Both transports must enter follow mode, including with reduced motion.
    await page
      .getByRole("button", {
        name: width === 390 ? "Play playback" : "Play viewer lap",
        exact: true,
      })
      .click();
    await expect(chase).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => Number(await cursor.getAttribute("value")))
      .toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    const paused = await cursor.getAttribute("value");
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page.getByRole("checkbox", { name: "Show reference ghost" }).check();
    await expect(identity).toContainText("ReferenceFormula Development 01");
    await top.click();
    await page
      .getByRole("button", { name: "Play viewer lap", exact: true })
      .click();
    await expect(top).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    expect(Number(await cursor.getAttribute("value"))).toBeGreaterThan(
      Number(paused),
    );
    await page.getByRole("checkbox", { name: "Show current ghost" }).uncheck();
    await expect(identity).toContainText("Current · hidden");
    const beforeFollow = await cursor.getAttribute("value");
    await page.getByRole("button", { name: "Follow current car" }).click();
    await expect(chase).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("checkbox", { name: "Show current ghost" }),
    ).toBeChecked();
    await expect(cursor).toHaveAttribute("value", beforeFollow!);
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page
      .getByRole("button", { name: "Fullscreen viewer", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Exit fullscreen viewer" }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Viewer playback rate", exact: true })
      .selectOption("0.5");
    await expect(page.locator('[aria-label="Playback speed"]')).toHaveValue(
      "0.5",
    );
    await page.getByRole("button", { name: "Restart viewer lap" }).focus();
    await page
      .getByRole("button", { name: "Restart viewer lap" })
      .press("Enter");
    await expect(cursor).toHaveAttribute("value", "0");
    await expect(
      page.getByRole("button", { name: "Play viewer lap", exact: true }),
    ).toBeVisible();
    await expect(identity).toBeInViewport();
    await expect
      .poll(() =>
        identity.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      )
      .toBe(true);
    await page.getByRole("button", { name: "Exit fullscreen viewer" }).click();
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
