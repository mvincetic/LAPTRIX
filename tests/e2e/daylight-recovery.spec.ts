import { expect, test } from "@playwright/test";
import { imageDifference } from "../fixtures/image-difference";

type LightingRecoveryWindow = Window & {
  lightingRecovery: {
    canvas: HTMLCanvasElement;
    extension: WEBGL_lose_context;
    lost: number;
    restored: number;
  };
};

for (const [track, vehicle, width] of [
  ["ardennes-development", "formula-development", 1600],
  ["red-bull-ring", "gt-development", 390],
] as const) {
  test(`the complete paused daylight image survives two graphics restorations on ${track}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption(track);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
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
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    async function project() {
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
    const saved = await project();
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    const canvas = page.locator(".scene canvas"),
      options = {
        style:
          ".scene * {visibility:hidden!important} .scene canvas {visibility:visible!important}",
      };
    const before = await canvas.screenshot(options);
    expect((await imageDifference(page, before, before)).blue).toBeGreaterThan(
      100,
    );
    await page.evaluate(() => {
      const canvas =
          document.querySelector<HTMLCanvasElement>(".scene canvas")!,
        extension = canvas
          .getContext("webgl2")!
          .getExtension("WEBGL_lose_context")!;
      if (!extension)
        throw new Error("Graphics-loss simulation is unavailable.");
      const state = { canvas, extension, lost: 0, restored: 0 };
      (window as unknown as LightingRecoveryWindow).lightingRecovery = state;
      canvas.addEventListener("webglcontextlost", () => state.lost++);
      canvas.addEventListener("webglcontextrestored", () => state.restored++);
    });
    for (const cycle of [1, 2]) {
      await page.evaluate(() =>
        (
          window as unknown as LightingRecoveryWindow
        ).lightingRecovery.extension.loseContext(),
      );
      await page.waitForFunction(
        (cycle) =>
          (window as unknown as LightingRecoveryWindow).lightingRecovery
            .lost === cycle,
        cycle,
      );
      await page.evaluate(() =>
        (
          window as unknown as LightingRecoveryWindow
        ).lightingRecovery.extension.restoreContext(),
      );
      await page.waitForFunction(
        (cycle) =>
          (window as unknown as LightingRecoveryWindow).lightingRecovery
            .restored === cycle,
        cycle,
      );
      // No playback, resize, camera or layer action may repair the paused result.
      await expect(async () => {
        const restored = await canvas.screenshot(options),
          difference = await imageDifference(page, before, restored);
        expect(difference.mean).toBeLessThan(0.1);
        expect(difference.changed).toBeLessThan(20);
      }).toPass({ timeout: 15000 });
      await canvas.screenshot({
        ...options,
        path: `artifacts/daylight-recovery-${width}-${cycle}.png`,
      });
      expect(
        await page.evaluate(
          () =>
            document.querySelector(".scene canvas") ===
            (window as unknown as LightingRecoveryWindow).lightingRecovery
              .canvas,
        ),
      ).toBe(true);
      expect(await cursor.getAttribute("value")).toBe("5");
    }
    expect(await project()).toEqual(saved);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
