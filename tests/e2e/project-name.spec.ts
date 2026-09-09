import { test, expect, type Page } from "@playwright/test";

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

async function openNaming(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const action = page.getByRole("button", {
    name: "Rename project",
    exact: true,
  });
  await action.focus();
  await action.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Rename project",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const width of [1600, 390]) {
  test(`project naming keeps metadata drafts separate and preserves the workspace at ${width}px`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByLabel("Project name", { exact: true })
      .fill("Original workspace");
    await page.getByRole("slider", { name: "Fuel load" }).fill("100");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("10");
    await page.setViewportSize({ width, height: 1000 });
    const before = await exportProject(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const trigger = page.getByRole("button", { name: "Additional actions" });
    let dialog = await openNaming(page);
    let input = dialog.getByRole("textbox", {
      name: "Project name",
      exact: true,
    });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(before.projectName);
    expect(
      await input.evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        element.selectionEnd,
      ]),
    ).toEqual([0, before.projectName.length]);
    await input.fill("Discard this name");
    await input.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await exportProject(page)).toEqual(before);
    for (const name of ["Cancel", "Close project naming"]) {
      dialog = await openNaming(page);
      input = dialog.getByRole("textbox", {
        name: "Project name",
        exact: true,
      });
      await expect(input).toHaveValue(before.projectName);
      await input.fill("Discard this too");
      await dialog.getByRole("button", { name, exact: true }).click();
      await expect(trigger).toBeFocused();
    }
    dialog = await openNaming(page);
    input = dialog.getByRole("textbox", { name: "Project name", exact: true });
    await input.fill("N".repeat(90));
    await expect(input).toHaveValue("N".repeat(80));
    const projectName = `Österreich · ${width} study`;
    await input.fill(projectName);
    await input.press("Enter");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(cursor).toHaveValue("10");
    expect(await exportProject(page)).toEqual({ ...before, projectName });
    expect(requests).toBe(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    dialog = await openNaming(page);
    input = dialog.getByRole("textbox", { name: "Project name", exact: true });
    await expect(input).toHaveValue(projectName);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await input.fill("");
    await dialog.getByRole("button", { name: "Rename", exact: true }).click();
    expect((await exportProject(page)).projectName).toBe("");
  });
}
