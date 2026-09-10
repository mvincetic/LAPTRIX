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

for (const [width, height, short] of [
  [1600, 1000, false],
  [390, 844, false],
  [780, 390, true],
] as const) {
  test(`track key exposes compact corner markers and retains explicit choices at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    const cursor = page.locator('[aria-label="Lap playback position"]');
    const fuel = page.locator('[aria-label="Fuel load"]');
    await cursor.fill("20");
    const top = page.getByRole("button", { name: "Top View", exact: true });
    await top.click();
    const before = await project(page);
    const canvas = await page.locator("canvas").elementHandle();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const key = page.getByRole("button", { name: "Track key", exact: true });
    const enter = page.getByRole("button", {
      name: "Fullscreen viewer",
      exact: true,
    });
    const exit = page.getByRole("button", {
      name: "Exit fullscreen viewer",
      exact: true,
    });
    const contents = page.locator(".legend-items");
    await expect(key).toHaveAttribute("aria-expanded", String(width >= 480));
    if (width >= 480) await expect(contents).toBeVisible();
    else await expect(contents).toBeHidden();
    expect(await key.getAttribute("aria-controls")).toBe(
      await contents.getAttribute("id"),
    );
    if (short) {
      // Automatic sizing remains reversible until the user makes a choice.
      await enter.click();
      await expect(key).toHaveAttribute("aria-expanded", "false");
      await exit.click();
      await expect(key).toHaveAttribute("aria-expanded", "true");
      await enter.click();
      await expect(key).toHaveAttribute("aria-expanded", "false");
    }
    await key.scrollIntoViewIfNeeded();
    const positions = () =>
      page.locator(".scene").evaluate((scene) => {
        const origin = scene.querySelector("canvas")!.getBoundingClientRect();
        return [...scene.querySelectorAll(".corner-marker")].map((node) => {
          const box = node.getBoundingClientRect();
          return {
            name: node.getAttribute("aria-label"),
            x: box.x - origin.x,
            y: box.y - origin.y,
          };
        });
      });
    // Let the final camera draw settle before comparing world-projected badges.
    await page.waitForTimeout(300);
    const badges = await positions();
    const initiallyOpen = width >= 480 && !short;
    await key.focus();
    await key.press("Enter");
    await expect(key).toHaveAttribute("aria-expanded", String(!initiallyOpen));
    await expect(key).toBeFocused();
    await key.press("Space");
    await expect(key).toHaveAttribute("aria-expanded", String(initiallyOpen));
    expect(await positions()).toEqual(badges);
    if (initiallyOpen) await key.click();
    await expect(contents).toBeHidden();
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await expect(key).toHaveAttribute("aria-expanded", "false");
    if (!short) await enter.click();
    await expect(key).toHaveAttribute("aria-expanded", "false");
    await expect(fuel, "fuel before corner activation").toHaveAttribute(
      "value",
      "21",
    );
    if (short || width < 480) {
      // This native pointer click was intercepted by the fixed legend before the change.
      const corner = page.getByRole("button", {
        name: "Inspect corner 1",
        exact: true,
      });
      await expect
        .poll(() =>
          corner.evaluate((node) => {
            const box = node.getBoundingClientRect();
            return node.contains(
              document.elementFromPoint(
                box.x + box.width / 2,
                box.y + box.height / 2,
              ),
            );
          }),
        )
        .toBe(true);
      await expect(cursor).toHaveAttribute("value", "20");
      await corner.click();
      await expect(corner).toHaveClass(/selected/);
      await expect(fuel, "fuel after corner activation").toHaveAttribute(
        "value",
        "21",
      );
    }
    await key.click();
    await expect(contents).toBeVisible();
    await exit.click();
    await expect(enter).toBeVisible();
    await expect(fuel, "fuel after fullscreen exit").toHaveAttribute(
      "value",
      "21",
    );
    await page.setViewportSize({ width, height: height + 200 });
    await expect(key).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width, height });
    await expect(key).toHaveAttribute("aria-expanded", "true");
    await expect(fuel, "fuel after window resize").toHaveAttribute(
      "value",
      "21",
    );
    await enter.click();
    await expect(key).toHaveAttribute("aria-expanded", "true");
    await key.click();
    await exit.click();
    await expect(fuel, "fuel after final fullscreen exit").toHaveAttribute(
      "value",
      "21",
    );
    await expect(key).toHaveAttribute("aria-expanded", "false");
    await expect(top).toHaveAttribute("aria-pressed", "true");
    if (!short && width >= 480)
      await expect(cursor).toHaveAttribute("value", "20");
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
