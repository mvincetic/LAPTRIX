import { test, expect } from "@playwright/test";

for (const width of [1600, 390]) {
  test(`actions disclosure has usable keyboard focus and dismissal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const trigger = page.getByRole("button", {
      name: "Additional actions",
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", "workspace-actions");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Compare aero settings" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Import project JSON" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Save", exact: true }),
    ).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const actions = page
      .getByRole("group", { name: "Workspace actions" })
      .getByRole("button");
    const count = await actions.count();
    for (let i = 0; i < count; i++) {
      await page.keyboard.press("Tab");
      await expect(actions.nth(i)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Reset settings", exact: true }),
    ).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.focus();
    await page.keyboard.press("Enter");
    for (let i = 0; i < count; i++) await page.keyboard.press("Tab");
    const pending = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    expect((await pending).suggestedFilename()).toBe("laptrix-project.json");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const picker = page.waitForEvent("filechooser");
    await page.keyboard.press("Enter");
    await (await picker).setFiles([]);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
}

test("visible controls have accessible names at desktop and mobile widths", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const role of [
      "button",
      "textbox",
      "combobox",
      "slider",
      "spinbutton",
      "checkbox",
      "tab",
    ] as const) {
      await expect(page.getByRole(role, { name: "", exact: true })).toHaveCount(
        0,
      );
    }
  }
});
