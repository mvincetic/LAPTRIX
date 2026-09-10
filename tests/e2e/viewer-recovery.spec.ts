import { expect, test, type Page } from "@playwright/test";
import { racingLinePixels } from "../fixtures/viewer-pixels";

type RecoveryWindow = Window & {
  recovery: {
    canvas: HTMLCanvasElement;
    extension: WEBGL_lose_context;
    lost: number;
    restored: number;
  };
};

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

for (const width of [1600, 390]) {
  test(`a paused circuit redraws after repeated graphics restoration at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).toBeHidden();
    await expect
      .poll(async () => (await racingLinePixels(page)).count)
      .toBeGreaterThan(100);
    const north = await page
      .getByRole("img", { name: /^North / })
      .getAttribute("aria-label");
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page.evaluate(() => {
      const canvas =
        document.querySelector<HTMLCanvasElement>(".scene canvas")!;
      const extension = canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context");
      if (!extension)
        throw new Error("Graphics-loss simulation is unavailable.");
      const recovery = { canvas, extension, lost: 0, restored: 0 };
      (window as unknown as RecoveryWindow).recovery = recovery;
      canvas.addEventListener("webglcontextlost", () => recovery.lost++);
      canvas.addEventListener(
        "webglcontextrestored",
        () => recovery.restored++,
      );
    });
    for (const cycle of [1, 2]) {
      await page.evaluate(() =>
        (window as unknown as RecoveryWindow).recovery.extension.loseContext(),
      );
      await page.waitForFunction(
        (expected) =>
          (window as unknown as RecoveryWindow).recovery.lost === expected,
        cycle,
      );
      await page.evaluate(() =>
        (
          window as unknown as RecoveryWindow
        ).recovery.extension.restoreContext(),
      );
      await page.waitForFunction(
        (expected) =>
          (window as unknown as RecoveryWindow).recovery.restored === expected,
        cycle,
      );
      // No click, resize, playback or clock action may wake the restored paused scene.
      await expect
        .poll(async () => (await racingLinePixels(page)).count)
        .toBeGreaterThan(100);
      expect((await racingLinePixels(page)).error).toBe(0);
      expect(
        await page.evaluate(
          () =>
            document.querySelector(".scene canvas") ===
            (window as unknown as RecoveryWindow).recovery.canvas,
        ),
      ).toBe(true);
      expect(await cursor.inputValue()).toBe("20");
      await expect(
        page.getByRole("button", { name: "Play playback", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".event-marker:visible")).toHaveCount(3);
      await expect(page.getByRole("img", { name: /^North / })).toHaveAttribute(
        "aria-label",
        north!,
      );
    }
    expect(await project(page)).toEqual(before);
    await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
      "21",
    );
    expect(requests).toBe(0);
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.inputValue()))
      .toBeGreaterThan(20);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
