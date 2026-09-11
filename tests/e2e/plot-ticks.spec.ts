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

test("telemetry ticks fit after resize, axis and precise-window changes without changing the workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("slider", { name: "Fuel load" }).fill("21");
  const cursor = page.getByRole("slider", { name: "Lap playback position" });
  await cursor.fill("5");
  await page
    .getByRole("checkbox", { name: "Reference traces", exact: true })
    .check();
  const before = await project(page);
  let solves = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) solves++;
  });
  const curves = new Map<string, (string | null)[]>();
  async function inspect(name: string, width: number) {
    const ticks = page.locator(".plot-axis-ticks");
    await ticks.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        ticks.evaluate((row) => {
          const area = row.getBoundingClientRect();
          const nodes = [...row.children].filter(
            (node) => getComputedStyle(node).visibility === "visible",
          );
          const boxes = nodes.map((node) => node.getBoundingClientRect());
          const first = row.firstElementChild!.getBoundingClientRect();
          const last = row.lastElementChild!.getBoundingClientRect();
          const endpointsFit = first.width + last.width + 6 <= area.width;
          return (
            nodes.length >= (endpointsFit ? 2 : 1) &&
            (!endpointsFit || nodes[0] === row.firstElementChild) &&
            nodes.at(-1) === row.lastElementChild &&
            boxes.every(
              (box, i) =>
                box.left >= area.left - 0.5 &&
                box.right <= area.right + 0.5 &&
                (!i || box.left - boxes[i - 1].right >= 5.9),
            )
          );
        }),
      )
      .toBe(true);
    await expect(ticks.locator("span")).toHaveCount(6);
    const paths = await page
      .locator('.telemetry-panel svg[role="img"] path')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d")));
    expect(paths.length).toBeGreaterThan(0);
    if (curves.has(name)) expect(paths).toEqual(curves.get(name));
    else curves.set(name, paths);
    expect(await cursor.getAttribute("value")).toBe("5");
    await page
      .locator(".telemetry-panel")
      .screenshot({ path: `artifacts/plot-ticks-${width}-${name}.png` });
  }
  for (const width of [320, 1600]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const group of ["overview", "loads", "delta"]) {
      await page
        .getByRole("tab", {
          name: group === "delta" ? "Time Delta" : "Lap Graphs",
          exact: true,
        })
        .click();
      if (group !== "delta")
        await page
          .getByRole("combobox", { name: "Graph channels" })
          .selectOption(group);
      for (const axis of ["Distance", "Time"]) {
        await page.getByRole("button", { name: axis, exact: true }).click();
        await inspect(`${group}-${axis}`, width);
      }
    }
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await page
    .getByRole("button", { name: "Custom window", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Window start (s)" })
    .fill("18.125");
  const end = page.getByRole("spinbutton", { name: "Window end (s)" });
  await end.fill("18.1265");
  await end.press("Enter");
  for (const group of ["delta", "overview", "loads"]) {
    await page
      .getByRole("tab", {
        name: group === "delta" ? "Time Delta" : "Lap Graphs",
        exact: true,
      })
      .click();
    if (group !== "delta")
      await page
        .getByRole("combobox", { name: "Graph channels" })
        .selectOption(group);
    for (const axis of ["Distance", "Time"]) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      await inspect(`precise-${group}-${axis}`, 320);
    }
  }
  expect(await project(page)).toEqual(before);
  expect(solves).toBe(0);
  expect(errors).toEqual([]);
});
