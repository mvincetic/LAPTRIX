import { expect, test, type Page } from "@playwright/test";

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

for (const [width, height] of [
  [1600, 1000],
  [390, 844],
  [780, 390],
]) {
  test(`viewer transport controls the same lap through fullscreen, loops and completion at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    if (width === 390) await page.emulateMedia({ reducedMotion: "reduce" });
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
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const canvas = await page.locator(".scene canvas").elementHandle();
    await page
      .getByRole("combobox", { name: "Playback speed", exact: true })
      .selectOption("2");
    await page
      .getByRole("combobox", { name: "Plot range", exact: true })
      .selectOption("2");
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const footer = page.getByRole("group", {
      name: "Current lap playback",
      exact: true,
    });
    await expect(footer.locator(".scene-loop-summary")).toContainText(
      "Interval loop",
    );
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page
      .getByRole("button", { name: "Fullscreen viewer", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.fullscreenElement?.classList.contains("track-panel"),
        ),
      )
      .toBe(true);
    const viewer = page.getByRole("slider", {
      name: "Viewer lap position",
      exact: true,
    });
    const plot = page.locator('[aria-label="Lap playback position"]');
    const loop = page.getByRole("button", {
      name: "Loop viewer playback",
      exact: true,
    });
    await expect(viewer).toBeInViewport();
    await expect(loop).toHaveAttribute("aria-pressed", "true");
    await expect(footer).toContainText("2× playback");
    async function synchronized() {
      const values = await page.evaluate(() => ({
        viewer: document
          .querySelector('[aria-label="Viewer lap position"]')!
          .getAttribute("value"),
        plot: document
          .querySelector('[aria-label="Lap playback position"]')!
          .getAttribute("value"),
        sceneTime: document.querySelector('[data-testid="scene-time"]')!
          .textContent,
        plotTime: document.querySelector('[data-testid="playback-time"]')!
          .textContent,
      }));
      expect(values.viewer).toBe(values.plot);
      expect(values.sceneTime).toBe(values.plotTime);
      return Number(values.viewer);
    }
    await expect
      .poll(() =>
        footer.evaluate((element) => {
          const panel = element
            .closest(".track-panel")!
            .getBoundingClientRect();
          return [
            ...element.querySelectorAll(
              "button, input, dt, dd, .scene-playback-state, .scene-loop-summary",
            ),
          ].every((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.width > 0 &&
              box.height > 0 &&
              box.left >= panel.left &&
              box.right <= panel.right &&
              box.top >= panel.top &&
              box.bottom <= panel.bottom
            );
          });
        }),
      )
      .toBe(true);
    await synchronized();
    // A viewer seek outside the selected sector restores the existing full-lap loop.
    await viewer.fill("20");
    await expect(footer.locator(".scene-loop-summary")).toHaveCount(0);
    expect(await synchronized()).toBe(20);
    const play = page.getByRole("button", {
      name: "Play viewer lap",
      exact: true,
    });
    await play.focus();
    await play.press("Space");
    await expect.poll(synchronized).toBeGreaterThan(20);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    const paused = await synchronized();
    await expect(footer).toContainText("Paused");
    await page.waitForTimeout(150);
    expect(await synchronized()).toBe(paused);
    await viewer.focus();
    await viewer.press("Home");
    expect(await synchronized()).toBe(0);
    await loop.click();
    await expect(loop).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator('[aria-label="Loop playback"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const end = before.lap.lapTime;
    await viewer.fill((Math.floor(end * 100) / 100 - 0.04).toFixed(2));
    await play.click();
    await expect(footer).toContainText("Lap complete");
    expect(await synchronized()).toBe(end);
    await expect(plot).toHaveAttribute("value", String(end));
    await play.click();
    await expect(
      page.getByRole("button", { name: "Pause viewer lap", exact: true }),
    ).toBeVisible();
    expect(await synchronized()).toBeLessThan(3);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    const finalTime = await viewer.getAttribute("value");
    await page
      .getByRole("button", { name: "Exit fullscreen viewer", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement))
      .toBeNull();
    await expect(plot).toHaveAttribute("value", finalTime!);
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector(".scene canvas"),
      ),
    ).toBe(true);
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
