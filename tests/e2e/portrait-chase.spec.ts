import { expect, test, type Page } from "@playwright/test";
import { carPixels } from "../fixtures/viewer-pixels";

async function footerContained(page: Page) {
  await expect
    .poll(() =>
      page.locator(".scene-footer").evaluate((footer) => {
        const bounds = footer.getBoundingClientRect();
        return (
          footer.scrollWidth <= footer.clientWidth &&
          [
            ...footer.querySelectorAll(
              "button, input, dt, dd, .scene-playback-state",
            ),
          ].every((node) => {
            const b = node.getBoundingClientRect();
            return (
              b.width > 0 &&
              b.left >= bounds.left &&
              b.right <= bounds.right &&
              b.top >= bounds.top &&
              b.bottom <= bounds.bottom
            );
          })
        );
      }),
    )
    .toBe(true);
}

for (const vehicle of ["formula-development", "gt-development"]) {
  test(`portrait fullscreen retains the ${vehicle} car at the showcase hairpin`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await page
      .getByRole("combobox", { name: "Car profile", exact: true })
      .selectOption(vehicle);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const cursor = page.getByRole("slider", {
      name: "Viewer lap position",
      exact: true,
    });
    const time = String(
      Number((Number(await cursor.getAttribute("max")) * 0.3).toFixed(2)),
    );
    await cursor.fill(time);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost" })
      .uncheck();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await footerContained(page);
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
      await expect
        .poll(() =>
          page
            .locator(".scene canvas")
            .evaluate((node) => node.getBoundingClientRect().width),
        )
        .toBe(width - 2);
      // Fullscreen CSS can settle before ResizeObserver updates the WebGL buffer.
      await expect
        .poll(() =>
          page.locator(".scene canvas").evaluate((node) => {
            const canvas = node as HTMLCanvasElement,
              box = canvas.getBoundingClientRect();
            return (
              canvas.width === Math.floor(box.width) &&
              canvas.height === Math.floor(box.height)
            );
          }),
        )
        .toBe(true);
      await footerContained(page);
      const pixels = await carPixels(page);
      await testInfo.attach(`car-pixels-${width}`, {
        body: JSON.stringify(pixels),
        contentType: "application/json",
      });
      expect(pixels.count).toBeGreaterThan(100);
      for (const edge of ["left", "right", "top", "bottom"] as const)
        expect(
          pixels[edge],
          `${width}px ${edge} margin`,
        ).toBeGreaterThanOrEqual(16);
      await expect(cursor).toHaveAttribute("value", String(Number(time)));
      await page
        .getByRole("button", { name: "Exit fullscreen viewer", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => document.fullscreenElement))
        .toBeNull();
    }
    await expect(cursor).toHaveAttribute("value", String(Number(time)));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
  });
}
