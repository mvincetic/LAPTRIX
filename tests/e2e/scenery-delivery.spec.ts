import { expect, test } from "@playwright/test";
import { imageDifference } from "../fixtures/image-difference";

test("source-aligned scenery loads lazily, recovers after failure and preserves the paused workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let attempts = 0,
    delivered = false,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/red-bull-ring-slice*.glb*", async (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    attempts++;
    if (attempts === 1)
      return route.fulfill({ status: 503, body: "unavailable" });
    await held;
    await route.continue();
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "fetch" &&
      /red-bull-ring-slice.*\.glb$/.test(new URL(response.url()).pathname) &&
      response.ok()
    )
      delivered = true;
  });
  try {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    expect(attempts).toBe(0);
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await expect.poll(() => attempts).toBe(1);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("3");
    const lap = await page.getByTestId("lap-time").textContent();
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    const environment = page.getByRole("checkbox", {
      name: "Environment",
      exact: true,
    });
    await environment.uncheck();
    await environment.check();
    await expect.poll(() => attempts).toBe(2);
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    const canvas = page.locator(".scene canvas");
    const options = {
      style:
        ".scene * {visibility:hidden!important} .scene canvas {visibility:visible!important}",
    };
    const fallback = await canvas.screenshot(options);
    release();
    await expect.poll(() => delivered).toBe(true);
    await expect
      .poll(
        async () =>
          (
            await imageDifference(
              page,
              fallback,
              await canvas.screenshot(options),
            )
          ).changed,
      )
      .toBeGreaterThan(500);
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await environment.uncheck();
    await environment.check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await imageDifference(
              page,
              fallback,
              await canvas.screenshot(options),
            )
          ).changed,
      )
      .toBeGreaterThan(500);
    expect(attempts).toBe(2);
    expect(await cursor.getAttribute("value")).toBe("3");
    expect(await page.getByTestId("lap-time").textContent()).toBe(lap);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
