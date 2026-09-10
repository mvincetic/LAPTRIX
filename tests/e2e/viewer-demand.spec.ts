import { expect, test } from "@playwright/test";

for (const width of [1600, 390]) {
  test(`a settled viewer stops drawing and wakes for playback and interaction at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      const stats = { draws: 0 };
      Object.assign(window, { laptrixRenderProbe: stats });
      const seen = new WeakSet();
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        ...args
      ) {
        const context = original.apply(
          this,
          args as Parameters<typeof original>,
        );
        if (!context || !String(args[0]).includes("webgl") || seen.has(context))
          return context;
        seen.add(context);
        const gl = context as WebGL2RenderingContext;
        for (const name of [
          "drawArrays",
          "drawElements",
          "drawArraysInstanced",
          "drawElementsInstanced",
        ] as const) {
          const draw = gl[name];
          if (!draw) continue;
          Object.assign(gl, {
            [name]: function (
              this: WebGL2RenderingContext,
              ...values: number[]
            ) {
              stats.draws++;
              return Reflect.apply(draw, this, values);
            },
          });
        }
        return context;
      } as typeof original;
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await expect(page.locator(".ghost-tag")).toHaveCount(2);
    const draws = () =>
      page.evaluate(
        () =>
          (window as unknown as { laptrixRenderProbe: { draws: number } })
            .laptrixRenderProbe.draws,
      );
    async function settled() {
      await expect
        .poll(async () => {
          const start = await draws();
          await page.waitForTimeout(300);
          return (await draws()) - start;
        })
        .toBe(0);
      const start = await draws();
      await page.waitForTimeout(500);
      expect(await draws()).toBe(start);
    }
    await expect.poll(draws).toBeGreaterThan(0);
    await settled();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    let previous = await draws();
    await cursor.fill("20");
    await expect.poll(draws).toBeGreaterThan(previous);
    expect(await cursor.inputValue()).toBe("20");
    await settled();
    previous = await draws();
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect.poll(draws).toBeGreaterThan(previous);
    await expect
      .poll(async () => Number(await cursor.inputValue()))
      .toBeGreaterThan(20);
    previous = await draws();
    await expect.poll(draws).toBeGreaterThan(previous);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await settled();
    const paused = await cursor.inputValue();
    previous = await draws();
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect.poll(draws).toBeGreaterThan(previous);
    await settled();
    previous = await draws();
    const canvas = page.locator(".scene canvas");
    await canvas.scrollIntoViewIfNeeded();
    const bounds = (await canvas.boundingBox())!;
    await page.mouse.move(
      bounds.x + bounds.width * 0.75,
      bounds.y + bounds.height * 0.6,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.5,
      bounds.y + bounds.height * 0.6,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect.poll(draws).toBeGreaterThan(previous);
    await settled();
    previous = await draws();
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await expect.poll(draws).toBeGreaterThan(previous);
    await settled();
    expect(await cursor.inputValue()).toBe(paused);
    await page
      .getByRole("button", { name: "Loop playback", exact: true })
      .click();
    const duration = Number(await cursor.getAttribute("max"));
    await cursor.fill((Math.floor(duration * 100) / 100 - 0.04).toFixed(2));
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    await expect(cursor).toHaveAttribute("value", String(duration));
    await expect(cursor).toHaveAttribute(
      "aria-valuetext",
      new RegExp(`^${duration.toFixed(3).replace(".", "\\.")} seconds,`),
    );
    await settled();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
