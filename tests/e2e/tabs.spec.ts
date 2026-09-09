import { test, expect, type Page, type Locator } from "@playwright/test";

async function selected(page: Page, list: Locator, label: string) {
  const tab = list.getByRole("tab", { name: label, exact: true });
  await expect(tab).toBeFocused();
  await expect(tab).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel", { name: label, exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute(
    "id",
    (await tab.getAttribute("aria-controls"))!,
  );
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    (await tab.getAttribute("id"))!,
  );
  await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
  const relations = await list.getByRole("tab").evaluateAll((tabs) =>
    tabs.map((node) => {
      const target = document.getElementById(
        node.getAttribute("aria-controls")!,
      );
      return (
        target?.getAttribute("role") === "tabpanel" &&
        target.getAttribute("aria-labelledby") === node.id &&
        target.hidden === (node.getAttribute("aria-selected") !== "true")
      );
    }),
  );
  expect(relations.every(Boolean)).toBe(true);
  return panel;
}

for (const width of [1600, 390]) {
  test(`viewer and telemetry tabs support keyboard selection, panel focus and persistent state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const canvas = await page.locator("canvas").elementHandle();
    const viewer = page.getByRole("tablist", { name: "Viewer tools" });
    await viewer.getByRole("tab", { name: "Track View", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    const layers = await selected(page, viewer, "Analysis Layers");
    await page.keyboard.press("Tab");
    await expect(layers).toBeFocused();
    await page.keyboard.press("Tab");
    const racingLine = page.getByRole("checkbox", {
      name: "Racing line",
      exact: true,
    });
    await expect(racingLine).toBeFocused();
    await page.keyboard.press("Space");
    await expect(racingLine).not.toBeChecked();
    await page.keyboard.press("Space");
    await expect(racingLine).toBeChecked();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("End");
    const camera = await selected(page, viewer, "Camera");
    await page.keyboard.press("Tab");
    await expect(camera).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Orbit · perspective" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Top · engineering" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Top View", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Home");
    await selected(page, viewer, "Track View");
    await page.keyboard.press("ArrowLeft");
    await selected(page, viewer, "Camera");
    await page.keyboard.press("ArrowRight");
    await selected(page, viewer, "Track View");
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);

    const seek = page.getByRole("slider", { name: "Lap playback position" });
    await seek.focus();
    await page.keyboard.press("End");
    const time = await seek.inputValue();
    const telemetry = page.getByRole("tablist", { name: "Telemetry view" });
    await telemetry
      .getByRole("tab", { name: "Lap Graphs", exact: true })
      .focus();
    await page.keyboard.press("ArrowLeft");
    await selected(page, telemetry, "Cursor Data");
    await page.keyboard.press("ArrowLeft");
    const delta = await selected(page, telemetry, "Time Delta");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Distance", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    const timeAxis = page.getByRole("button", { name: "Time", exact: true });
    await expect(timeAxis).toBeFocused();
    await page.keyboard.press("Space");
    await expect(timeAxis).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Distance", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Tab");
    await expect(delta).toBeFocused();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Home");
    await selected(page, telemetry, "Lap Graphs");
    await page.keyboard.press("ArrowRight");
    await selected(page, telemetry, "Sector Analysis");
    await page.keyboard.press("End");
    await selected(page, telemetry, "Cursor Data");
    await page.keyboard.press("ArrowLeft");
    await selected(page, telemetry, "Time Delta");
    await expect(seek).toHaveValue(time);
    await expect(timeAxis).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
}
