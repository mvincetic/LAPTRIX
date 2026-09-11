import { test, expect } from "@playwright/test";

test("the built trackside asset recovers visibly without changing the engineering workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const errors: string[] = [],
    warnings: string[] = [];
  let downloads = 0,
    ready = false;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "fetch" &&
      new URL(response.url()).pathname.endsWith(".glb") &&
      response.ok()
    )
      ready = true;
  });
  await page.route("**/*.glb*", (route) => {
    if (route.request().resourceType() === "fetch" && ++downloads === 1)
      return route.fulfill({ status: 503, body: "Unavailable" });
    return route.continue();
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect
    .poll(() =>
      warnings.some((warning) =>
        warning.includes("Trackside scenery could not load"),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Chase", exact: true }).click();
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
  const before = await project();
  const cursor = page.getByRole("slider", { name: "Viewer lap position" });
  const time = await cursor.getAttribute("value");
  let solves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) solves++;
  });
  const canvas = page.locator(".scene canvas");
  const options = {
    style:
      ".scene * {visibility:hidden!important} .scene canvas {visibility:visible!important}",
  };
  const missing = await canvas.screenshot({
    ...options,
    path: "artifacts/pylon-delivery-before.png",
  });
  await page.getByRole("tab", { name: "Analysis Layers", exact: true }).click();
  const environment = page.getByRole("checkbox", {
    name: "Environment",
    exact: true,
  });
  await environment.uncheck();
  await environment.check();
  await page.getByRole("tab", { name: "Track View", exact: true }).click();
  await expect.poll(() => ready).toBe(true);
  await expect
    .poll(async () => {
      const restored = await canvas.screenshot(options);
      return page.evaluate(
        async (images) => {
          const bitmaps = await Promise.all(
            images.map(async (base64) =>
              createImageBitmap(
                await (await fetch(`data:image/png;base64,${base64}`)).blob(),
              ),
            ),
          );
          try {
            const { width, height } = bitmaps[0],
              context = new OffscreenCanvas(width, height).getContext("2d")!;
            const pixels = bitmaps.map((bitmap) => {
              context.drawImage(bitmap, 0, 0);
              return context.getImageData(0, 0, width, height).data;
            });
            let count = 0;
            for (let i = 0; i < width * height; i++)
              if (
                [0, 1, 2].some(
                  (c) =>
                    Math.abs(pixels[0][i * 4 + c] - pixels[1][i * 4 + c]) > 24,
                )
              )
                count++;
            return count;
          } finally {
            bitmaps.forEach((bitmap) => bitmap.close());
          }
        },
        [missing.toString("base64"), restored.toString("base64")],
      );
    })
    .toBeGreaterThan(40);
  await canvas.screenshot({
    ...options,
    path: "artifacts/pylon-delivery-after.png",
  });
  expect(await cursor.getAttribute("value")).toBe(time);
  expect(await project()).toEqual(before);
  expect(solves).toBe(0);
  expect(downloads).toBe(2);
  expect(errors).toEqual([]);
});
