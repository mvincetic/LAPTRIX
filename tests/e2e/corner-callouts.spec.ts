import { expect, test, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

for (const width of [1600, 390]) {
  test(`corner event callouts stay separate and seek authoritative telemetry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toContainText(
      "GT Development 01",
    );
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    await page
      .getByRole("combobox", { name: "Solver mode" })
      .selectOption("lap-time");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByTestId("refinement-summary")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const lap: Lap = before.lap;
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    await page.locator(".scene").scrollIntoViewIfNeeded();
    const callouts = page.locator(".event-marker");
    await expect(callouts).toHaveCount(3);
    async function assertSeparated() {
      await expect
        .poll(async () =>
          callouts.evaluateAll((nodes) => {
            const boxes = nodes.map((node) => node.getBoundingClientRect());
            return boxes.every((a, i) =>
              boxes
                .slice(i + 1)
                .every(
                  (b) =>
                    a.right <= b.left ||
                    b.right <= a.left ||
                    a.bottom <= b.top ||
                    b.bottom <= a.top,
                ),
            );
          }),
        )
        .toBe(true);
      const scene = await page.locator("canvas").boundingBox();
      for (const button of await callouts.all()) {
        const box = await button.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(scene!.x);
        expect(box!.y).toBeGreaterThanOrEqual(scene!.y);
        expect(box!.x + box!.width).toBeLessThanOrEqual(
          scene!.x + scene!.width,
        );
        expect(box!.y + box!.height).toBeLessThanOrEqual(
          scene!.y + scene!.height,
        );
      }
    }
    await assertSeparated();
    const corner = lap.corners.find((corner) => corner.id === 2)!;
    const anchors = () =>
      page
        .locator(".corner-callouts circle")
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            Number(node.getAttribute("cx")),
            Number(node.getAttribute("cy")),
          ]),
        );
    for (const [i, event] of [
      "brakingIndex",
      "turnInIndex",
      "throttleIndex",
    ].entries()) {
      await callouts.nth(i).click();
      const index =
        corner[event as "brakingIndex" | "turnInIndex" | "throttleIndex"];
      expect(
        Number(
          await page
            .getByRole("slider", { name: "Lap playback position" })
            .inputValue(),
        ),
      ).toBeCloseTo(lap.samples[index].time, 1);
      await expect(
        page.getByRole("button", { name: "Play playback", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: `artifacts/corner-callouts-${width}.png`,
      fullPage: true,
    });
    const orbitAnchors = await anchors();
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect.poll(anchors).not.toEqual(orbitAnchors);
    await assertSeparated();
    const topAnchors = await anchors();
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const x = box!.x + box!.width * 0.8,
      y = box!.y + box!.height * 0.65;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - box!.width * 0.25, y, { steps: 8 });
    await page.mouse.up();
    await expect.poll(anchors).not.toEqual(topAnchors);
    await assertSeparated();
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await assertSeparated();
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await expect(callouts).toHaveCount(0);
    await page.getByRole("button", { name: "3D View", exact: true }).click();
    await expect(callouts).toHaveCount(3);
    await assertSeparated();
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Sector labels", exact: true })
      .uncheck();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await assertSeparated();
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Sector labels", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await assertSeparated();
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}
