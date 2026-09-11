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

for (const track of ["ardennes-development", "red-bull-ring"])
  for (const width of [1600, 320]) {
    test(`sector times stay clear of annotations on ${track} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page
        .getByRole("combobox", { name: "Track", exact: true })
        .selectOption(track);
      await page
        .getByRole("combobox", { name: "Car profile", exact: true })
        .selectOption("gt-development");
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Inspect corner 1", exact: true }),
      ).toBeVisible();
      const cursor = page.getByRole("slider", {
        name: "Viewer lap position",
        exact: true,
      });
      await cursor.fill("20");
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const before = await project(page);
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      async function separated() {
        await page.locator(".scene").scrollIntoViewIfNeeded();
        await expect(page.locator(".sector-label strong")).toHaveText(
          before.lap.sectors.map((s: { time: number }) => s.time.toFixed(3)),
        );
        await expect
          .poll(() =>
            page.locator(".scene").evaluate((scene) => {
              const canvas = scene
                .querySelector("canvas")!
                .getBoundingClientRect();
              const badges = [
                ...scene.querySelectorAll<HTMLElement>(".sector-label"),
              ];
              const boxes = badges.map((node) => node.getBoundingClientRect());
              const obstacles = [
                ...scene.querySelectorAll<HTMLElement>(
                  ".corner-marker,.start-marker,.event-marker,.ghost-tag,.legend,.viewer-popover,.scene-top-left,.compass,.scene-bottom",
                ),
              ]
                .filter((node) => !node.hidden)
                .map((node) => node.getBoundingClientRect())
                .filter((b) => b.width && b.height);
              const overlap = (a: DOMRect, b: DOMRect) =>
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top;
              return (
                badges.length === 3 &&
                badges.every((node) => !node.hidden) &&
                boxes.every(
                  (box, i) =>
                    box.width > 0 &&
                    box.height > 0 &&
                    box.left >= canvas.left &&
                    box.right <= canvas.right &&
                    box.top >= canvas.top &&
                    box.bottom <= canvas.bottom &&
                    obstacles.every((other) => !overlap(box, other)) &&
                    boxes.slice(i + 1).every((other) => !overlap(box, other)),
                )
              );
            }),
          )
          .toBe(true);
      }
      await separated();
      await page.getByRole("button", { name: "Top View", exact: true }).click();
      await separated();
      await page
        .getByRole("button", { name: "Inspect corner 3", exact: true })
        .click();
      await separated();
      if (track === "red-bull-ring" && width === 320) {
        // The selected event group plus both ghosts previously crowded out every badge.
        await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
        await page
          .getByRole("checkbox", { name: "Show reference ghost", exact: true })
          .check();
        await separated();
        await page
          .getByRole("tab", { name: "Track View", exact: true })
          .click();
        await separated();
      }
      await cursor.fill("20");
      for (let i = 0; i < 2; i++) {
        await page
          .getByRole("button", { name: "Track key", exact: true })
          .click();
        await separated();
      }
      await page
        .getByRole("tab", { name: "Analysis Layers", exact: true })
        .click();
      const sectors = page.getByRole("checkbox", {
        name: "Sector labels",
        exact: true,
      });
      await sectors.uncheck();
      await expect(page.locator(".sector-label")).toHaveCount(0);
      await sectors.check();
      await page.getByRole("tab", { name: "Track View", exact: true }).click();
      await separated();
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      await expect(page.locator(".sector-label")).toHaveCount(0);
      await page.getByRole("button", { name: "3D View", exact: true }).click();
      await separated();
      await expect(cursor).toHaveAttribute("value", "20");
      expect(await project(page)).toEqual(before);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
    });
  }
