import { test, expect, type Page } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { interpolate } from "../../packages/telemetry";
import type { Lap } from "../../packages/shared/schema";

async function exportProject(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
const difference = (a: number, b: number) =>
  Math.abs(((a - b + 540) % 360) - 180);

/** Build the documented chase pose, then independently rotate world north into camera space. */
function chaseNorth(lap: Lap, time: number) {
  const current = interpolate(lap.samples, time);
  const ahead = interpolate(lap.samples, (time + 0.3) % lap.lapTime);
  const dx = ahead.x - current.x,
    dz = ahead.z - current.z;
  const run = Math.hypot(dx, dz) || 1;
  const camera = new PerspectiveCamera();
  camera.position.set(
    current.x - (dx / run) * 50,
    current.y + 25,
    current.z - (dz / run) * 50,
  );
  camera.lookAt(ahead.x, ahead.y + 2, ahead.z);
  const north = new Vector3(0, 0, -1).applyQuaternion(
    camera.quaternion.clone().invert(),
  );
  return ((Math.atan2(north.x, north.y) * 180) / Math.PI + 360) % 360;
}

for (const width of [1600, 390])
  test(`north follows orbit, reset and authoritative chase rotation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    const before = await exportProject(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const compass = page.getByRole("img", { name: /^North / });
    const arrow = compass.locator("svg");
    const angle = () =>
      arrow.evaluate((element) =>
        Number.parseFloat(
          element.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1] ?? "NaN",
        ),
      );
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect
      .poll(async () => difference(await angle(), 0))
      .toBeLessThan(0.02);
    await expect(compass).toHaveAttribute(
      "aria-label",
      "North points up on screen.",
    );
    await expect(arrow).toHaveCSS("visibility", "visible");
    const canvas = page.locator(".scene canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const start = {
      x: box!.x + box!.width * 0.8,
      y: box!.y + box!.height * 0.65,
    };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - box!.width * 0.35, start.y, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => difference(await angle(), 0))
      .toBeGreaterThan(5);
    expect(await cursor.inputValue()).toBe("20");
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await expect
      .poll(async () => difference(await angle(), 0))
      .toBeLessThan(0.02);
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await expect
      .poll(async () => difference(await angle(), chaseNorth(before.lap, 20)))
      .toBeLessThan(0.02);
    expect(await cursor.inputValue()).toBe("20");
    await cursor.fill("40");
    await expect
      .poll(async () => difference(await angle(), chaseNorth(before.lap, 40)))
      .toBeLessThan(0.02);
    await cursor.fill("20");
    await page.getByRole("button", { name: "3D View", exact: true }).click();
    const overview = new PerspectiveCamera();
    overview.position.set(0.1, 0.79, 0.62);
    overview.lookAt(0, 0, 0);
    const north = new Vector3(0, 0, -1).applyQuaternion(
      overview.quaternion.clone().invert(),
    );
    const expected =
      ((Math.atan2(north.x, north.y) * 180) / Math.PI + 360) % 360;
    await expect
      .poll(async () => difference(await angle(), expected))
      .toBeLessThan(0.02);
    expect(await cursor.inputValue()).toBe("20");
    expect(requests).toBe(0);
    expect(await exportProject(page)).toEqual(before);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
