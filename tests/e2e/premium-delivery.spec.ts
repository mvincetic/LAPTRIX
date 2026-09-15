import { expect, test } from "@playwright/test";
import { imageDifference } from "../fixtures/image-difference";

for (const [asset, vehicle, label] of [
  ["gt", "gt-development", "GT Development 01"],
  ["formula26", "formula-development", "Formula Development 01"],
] as const) {
  test(`the built Blender ${asset} visibly replaces its fallback while preserving the paused workspace`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let downloads = 0,
      delivered = false;
    await page.route(`**/${asset}*.glb*`, async (route) => {
      if (route.request().resourceType() !== "fetch") return route.continue();
      downloads++;
      await held;
      await route.continue();
    });
    page.on("response", (response) => {
      if (
        response.request().resourceType() === "fetch" &&
        new RegExp(`/${asset}(?:-[\\w-]+)?\\.glb$`).test(
          new URL(response.url()).pathname,
        ) &&
        response.ok()
      )
        delivered = true;
    });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    if (asset === "gt") expect(downloads).toBe(0);
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption("red-bull-ring");
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption(vehicle);
    await expect(page.getByTestId("result-vehicle")).toHaveText(label);
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    await cursor.fill("5");
    await expect.poll(() => downloads).toBe(1);
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
    const canvas = page.locator(".scene canvas");
    const options = {
      style:
        ".scene * {visibility:hidden!important} .scene canvas {visibility:visible!important}",
    };
    try {
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
        .toBeGreaterThan(150);
      await page.getByRole("button", { name: "Onboard", exact: true }).click();
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      expect(downloads).toBe(1);
      expect(await cursor.getAttribute("value")).toBe("5");
      expect(await project()).toEqual(before);
      expect(solves).toBe(0);
      expect(errors).toEqual([]);
    } finally {
      release();
    }
  });
}
