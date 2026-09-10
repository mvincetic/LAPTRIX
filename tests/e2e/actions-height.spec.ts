import { test, expect, type Page } from "@playwright/test";

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

test("an open actions menu follows viewport size and contains wheel scrolling without changing the workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("slider", { name: "Fuel load" }).fill("21");
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  const before = await project(page);
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) requests++;
  });
  const trigger = page.getByRole("button", {
    name: "Additional actions",
    exact: true,
  });
  const group = page.getByRole("group", { name: "Workspace actions" });
  await trigger.click();
  for (const [width, height] of [
    [780, 390],
    [390, 300],
    [1600, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(async () => {
        const box = await group.boundingBox();
        return box!.y + box!.height;
      })
      .toBeLessThanOrEqual(height - 12);
    const initialScroll = await page.evaluate(() => window.scrollY);
    await group.hover();
    await page.mouse.wheel(0, 1600);
    await expect
      .poll(() =>
        group.evaluate(
          (element) =>
            element.scrollTop + element.clientHeight >=
            element.scrollHeight - 1,
        ),
      )
      .toBe(true);
    // At the boundary a second wheel event must not scroll the document behind it.
    await page.mouse.wheel(0, 1200);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
    const last = await group
      .getByRole("button", { name: "Export project", exact: true })
      .boundingBox();
    expect(last!.y).toBeGreaterThanOrEqual(0);
    expect(last!.y + last!.height).toBeLessThanOrEqual(height - 12);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(group).toHaveCount(0);
  expect(await project(page)).toEqual(before);
  await expect(
    page.getByRole("slider", { name: "Lap playback position" }),
  ).toHaveValue("20");
  expect(requests).toBe(0);
  expect(errors).toEqual([]);
});
