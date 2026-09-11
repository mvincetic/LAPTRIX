import { expect, test } from "@playwright/test";
import { imageDifference } from "../fixtures/image-difference";

test("optional foliage recovers visibly while preserving the paused engineering workspace", async ({
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
  await page.route("**/*spruce-bough*.webp*", (route) => {
    if (route.request().resourceType() === "image" && ++downloads === 1)
      return route.fulfill({ status: 503, body: "Unavailable" });
    return route.continue();
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "image" &&
      response.url().includes("spruce-bough") &&
      response.ok()
    )
      ready = true;
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect
    .poll(() =>
      warnings.some((warning) =>
        warning.includes("Tree detail could not load"),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Chase", exact: true }).click();
  await page.getByRole("slider", { name: "Fuel load" }).fill("21");
  const cursor = page.getByRole("slider", { name: "Viewer lap position" });
  await cursor.fill("5");
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
  let solves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) solves++;
  });
  const canvas = page.locator(".scene canvas"),
    options = {
      style:
        ".scene * {visibility:hidden!important} .scene canvas {visibility:visible!important}",
    };
  const missing = await canvas.screenshot({
    ...options,
    path: "artifacts/foliage-delivery-before.png",
  });
  for (let cycle = 0; cycle < 3; cycle++) {
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    const environment = page.getByRole("checkbox", {
      name: "Environment",
      exact: true,
    });
    await environment.uncheck();
    await environment.check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await expect.poll(() => ready).toBe(true);
    await expect(async () => {
      const after = await canvas.screenshot(options);
      expect(
        (await imageDifference(page, missing, after)).changed,
      ).toBeGreaterThan(40);
    }).toPass({ timeout: 15000 });
    expect(await cursor.getAttribute("value")).toBe("5");
  }
  await canvas.screenshot({
    ...options,
    path: "artifacts/foliage-delivery-after.png",
  });
  expect(await project()).toEqual(before);
  expect(downloads).toBe(2);
  expect(solves).toBe(0);
  expect(errors).toEqual([]);
});
