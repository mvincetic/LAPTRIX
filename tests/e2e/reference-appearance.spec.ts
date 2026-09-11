import { expect, test, type Page } from "@playwright/test";
import { imageDifference } from "../fixtures/image-difference";

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

for (const [track, vehicle, width] of [
  ["ardennes-development", "formula-development", 1600],
  ["red-bull-ring", "gt-development", 390],
] as const) {
  test(`reference overlap preserves the current vehicle's blue silhouette on ${track}`, async ({
    page,
  }, info) => {
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
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    expect(before.reference).toEqual(before.lap);
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    const current = page.getByRole("checkbox", {
      name: "Show current ghost",
      exact: true,
    });
    const reference = page.getByRole("checkbox", {
      name: "Show reference ghost",
      exact: true,
    });
    await reference.uncheck();
    await current.uncheck();
    const capture = () =>
      page.locator(".scene canvas").screenshot({
        style:
          ".scene *{visibility:hidden!important}.scene canvas{visibility:visible!important}",
      });
    const empty = await capture();
    await current.check();
    let currentOnly = empty;
    await expect
      .poll(async () => {
        currentOnly = await capture();
        return (await imageDifference(page, empty, currentOnly)).changed;
      })
      .toBeGreaterThan(200);
    await reference.check();
    let overlap = empty;
    await expect
      .poll(async () => {
        overlap = await capture();
        return (await imageDifference(page, currentOnly, overlap)).changed;
      })
      .toBeGreaterThan(40);
    // Isolate paint pixels belonging to the car by subtracting the car-free view.
    // A whole-canvas count would accidentally include the blue racing line.
    const paint = await page.evaluate(
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
          const context = new OffscreenCanvas(width, height).getContext("2d")!;
          const pixels = bitmaps.map((bitmap) => {
            context.drawImage(bitmap, 0, 0);
            return context.getImageData(0, 0, width, height).data;
          });
          const blue = (p: Uint8ClampedArray, i: number) =>
            p[i + 2] > p[i] + 35 && p[i + 2] > p[i + 1] + 20;
          let current = 0,
            retained = 0;
          for (let i = 0; i < pixels[0].length; i += 4) {
            if (!blue(pixels[0], i) && blue(pixels[1], i)) {
              current++;
              if (blue(pixels[2], i)) retained++;
            }
          }
          return { current, retained };
        } finally {
          bitmaps.forEach((bitmap) => bitmap.close());
        }
      },
      [empty, currentOnly, overlap].map((png) => png.toString("base64")),
    );
    expect(paint.current).toBeGreaterThan(150);
    expect(paint.retained / paint.current).toBeGreaterThan(0.9);
    await info.attach("current-and-reference", {
      body: overlap,
      contentType: "image/png",
    });
    await current.uncheck();
    let referenceOnly = empty;
    await expect
      .poll(async () => {
        referenceOnly = await capture();
        return (await imageDifference(page, empty, referenceOnly)).changed;
      })
      .toBeGreaterThan(200);
    // The reference is still visibly present on its own, with a distinct treatment.
    expect(
      (await imageDifference(page, currentOnly, referenceOnly)).changed,
    ).toBeGreaterThan(200);
    await info.attach("reference-only", {
      body: referenceOnly,
      contentType: "image/png",
    });
    await current.check();
    await expect(cursor).toHaveAttribute("value", "5");
    expect(await project(page)).toEqual(before);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
