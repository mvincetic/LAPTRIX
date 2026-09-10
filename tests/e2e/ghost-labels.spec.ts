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

for (const width of [1600, 390]) {
  test(`ghost names stay clear of timing and controls at ${width}px`, async ({
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
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("40.31");
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    async function separated() {
      await page.locator(".scene").scrollIntoViewIfNeeded();
      await expect(page.locator(".ghost-tag")).toHaveCount(2);
      // Wait beyond the seek's draw before inspecting label geometry.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expect
        .poll(() =>
          page.locator(".scene").evaluate((scene) => {
            const canvas = scene
              .querySelector("canvas")!
              .getBoundingClientRect();
            const tags = [...scene.querySelectorAll<HTMLElement>(".ghost-tag")];
            const boxes = tags.map((tag) => tag.getBoundingClientRect());
            const controls = [
              ...scene.querySelectorAll<HTMLElement>(
                ".sector-label, .corner-marker, .start-marker, .event-marker, .legend, .viewer-popover, .scene-top-left, .compass, .scene-bottom",
              ),
            ]
              .filter((node) => !node.hidden)
              .map((node) => node.getBoundingClientRect())
              .filter((box) => box.width && box.height);
            const intersects = (a: DOMRect, b: DOMRect) =>
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top;
            return (
              tags.every(
                (tag, index) =>
                  !tag.hidden &&
                  boxes[index].width > 0 &&
                  boxes[index].height > 0,
              ) &&
              boxes.every(
                (box, index) =>
                  box.left >= canvas.left &&
                  box.right <= canvas.right &&
                  box.top >= canvas.top &&
                  box.bottom <= canvas.bottom &&
                  controls.every((other) => !intersects(box, other)) &&
                  boxes
                    .slice(index + 1)
                    .every((other) => !intersects(box, other)),
              )
            );
          }),
        )
        .toBe(true);
    }
    await separated();
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    for (const mode of ["3D View", "Top View"] as const) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      for (const time of [0, 40.31, 78]) {
        await cursor.fill(String(time));
        await separated();
        await expect(cursor).toHaveAttribute("value", String(time));
      }
    }
    await page
      .getByRole("button", { name: "Play playback", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.getAttribute("value")))
      .toBeGreaterThan(78.2);
    await page
      .getByRole("button", { name: "Pause playback", exact: true })
      .click();
    await separated();
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await page.getByRole("button", { name: "3D View", exact: true }).click();
    await cursor.fill("40.31");
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await separated();
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
  });
}
