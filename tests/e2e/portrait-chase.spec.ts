import { expect, test, type Page } from "@playwright/test";

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

async function carPixels(page: Page) {
  const canvas = page.locator(".scene canvas");
  const options = {
    style:
      ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
  };
  const visible = await canvas.screenshot(options);
  await page.getByRole("checkbox", { name: "Show current ghost" }).uncheck();
  const hidden = await canvas.screenshot(options);
  const result = await page.evaluate(
    async (images) => {
      const bitmaps = await Promise.all(
        images.map(async (base64) =>
          createImageBitmap(
            await (await fetch(`data:image/png;base64,${base64}`)).blob(),
          ),
        ),
      );
      try {
        const { width, height } = bitmaps[0];
        const copy = new OffscreenCanvas(width, height);
        const context = copy.getContext("2d")!;
        const pixels = bitmaps.map((bitmap) => {
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, width, height).data;
        });
        let count = 0,
          left = width,
          right = 0,
          top = height,
          bottom = 0;
        for (let i = 0; i < pixels[0].length; i += 4) {
          if (
            Math.max(
              ...[0, 1, 2].map((c) =>
                Math.abs(pixels[0][i + c] - pixels[1][i + c]),
              ),
            ) < 24
          )
            continue;
          const x = (i / 4) % width,
            y = Math.floor(i / 4 / width);
          count++;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
        return {
          count,
          left,
          right: width - 1 - right,
          top,
          bottom: height - 1 - bottom,
        };
      } finally {
        bitmaps.forEach((bitmap) => bitmap.close());
      }
    },
    [visible.toString("base64"), hidden.toString("base64")],
  );
  await page.getByRole("checkbox", { name: "Show current ghost" }).check();
  return result;
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
