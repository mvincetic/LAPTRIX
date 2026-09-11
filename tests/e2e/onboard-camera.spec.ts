import { expect, test, type Page } from "@playwright/test";
import { carPixels } from "../fixtures/viewer-pixels";

async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

for (const track of ["ardennes-development", "red-bull-ring"])
  for (const vehicle of ["formula-development", "gt-development"])
    test(`onboard preserves the ${vehicle} lap and forward sight on ${track}`, async ({
      page,
    }, testInfo) => {
      const width = vehicle === "gt-development" ? 320 : 1600;
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await page
        .getByRole("combobox", { name: "Car profile" })
        .selectOption(vehicle);
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Inspect corner 1", exact: true }),
      ).toBeVisible();
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const before = await project(page);
      let solves = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) solves++;
      });
      const canvas = await page.locator(".scene canvas").elementHandle();
      const onboard = page.getByRole("button", {
        name: "Onboard",
        exact: true,
      });
      const cursor = page.getByRole("slider", { name: "Viewer lap position" });
      const time = String(
        Math.floor(Number(await cursor.getAttribute("max")) * 30) / 100,
      );
      await cursor.fill(time);
      await page.getByRole("tab", { name: "Camera", exact: true }).click();
      await page
        .getByRole("button", { name: "Onboard · vehicle mounted" })
        .focus();
      await page
        .getByRole("button", { name: "Onboard · vehicle mounted" })
        .press("Enter");
      await expect(onboard).toHaveAttribute("aria-pressed", "true");
      await expect(cursor).toHaveAttribute("value", time);
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await expect
        .poll(async () => Number(await cursor.getAttribute("value")))
        .toBeGreaterThan(Number(time));
      await page
        .getByRole("button", { name: "Pause viewer lap", exact: true })
        .click();
      await expect(onboard).toHaveAttribute("aria-pressed", "true");
      const paused = (await cursor.getAttribute("value"))!;
      for (const name of ["Top View", "Chase", "Onboard"]) {
        await page.getByRole("button", { name, exact: true }).click();
        await expect(cursor).toHaveAttribute("value", paused);
      }
      await page
        .getByRole("button", { name: "Reset camera", exact: true })
        .click();
      await expect(onboard).toHaveAttribute("aria-pressed", "true");
      await expect(cursor).toHaveAttribute("value", paused);
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
          page.locator(".scene canvas").evaluate((node) => {
            const canvas = node as HTMLCanvasElement,
              b = node.getBoundingClientRect();
            return (
              canvas.width === Math.floor(b.width) &&
              canvas.height === Math.floor(b.height)
            );
          }),
        )
        .toBe(true);
      await page
        .getByRole("combobox", { name: "Viewer playback rate", exact: true })
        .selectOption("0.5");
      await expect(page.locator('[aria-label="Playback speed"]')).toHaveValue(
        "0.5",
      );
      await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
      const pixels = await carPixels(page);
      await testInfo.attach("onboard-foreground", {
        body: JSON.stringify(pixels),
        contentType: "application/json",
      });
      // Its own body is visible below the road sightline, never across the horizon.
      expect(pixels.count).toBeGreaterThan(100);
      expect(pixels.top).toBeGreaterThan(pixels.height * 0.5);
      expect(pixels.count / (pixels.width * pixels.height)).toBeLessThan(0.45);
      await expect(cursor).toHaveAttribute("value", paused);
      await page
        .getByRole("button", { name: "Exit fullscreen viewer" })
        .click();
      await expect(
        page.getByRole("button", { name: "Play viewer lap", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
        "21",
      );
      expect(await project(page)).toEqual(before);
      expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      expect(solves).toBe(0);
      expect(errors).toEqual([]);
    });
