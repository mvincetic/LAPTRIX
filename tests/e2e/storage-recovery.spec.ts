import { test, expect, type Page } from "@playwright/test";

async function readDownload(page: Page, click: () => Promise<void>) {
  const pending = page.waitForEvent("download");
  await click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function project(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  return readDownload(page, () =>
    page.getByRole("button", { name: "Export project", exact: true }).click(),
  );
}
for (const earlierImportError of [false, true]) {
  test(`failed local Save offers project preservation without inheriting another action (${earlierImportError ? "after reference error" : "fresh workspace"})`, async ({
    page,
  }) => {
    const width = earlierImportError ? 390 : 1600;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const savedBefore = await page.evaluate(() =>
      localStorage.getItem("laptrix.project.v1"),
    );
    expect(savedBefore).not.toBeNull();
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    if (earlierImportError) {
      await page
        .getByLabel("Import reference file", { exact: true })
        .setInputFiles({
          name: "invalid-reference.json",
          mimeType: "application/json",
          buffer: Buffer.from("{invalid"),
        });
      await expect(page.getByRole("alert")).toContainText(
        "Current reference kept",
      );
    }
    const before = await project(page);
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      (window as Window & { restoreStorage?: () => void }).restoreStorage =
        () => {
          Storage.prototype.setItem = original;
        };
      Storage.prototype.setItem = function (key, value) {
        if (key === "laptrix.project.v1")
          throw new DOMException(
            "Original storage failure fixture",
            "QuotaExceededError",
          );
        return original.call(this, key, value);
      };
    });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(/storage/i);
    const recovery = alert.getByRole("button", {
      name: "Download project",
      exact: true,
    });
    await expect(recovery).toBeVisible();
    await expect(
      page.getByText("Project saved on this device", { exact: true }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    await page.screenshot({
      path: `artifacts/storage-recovery-error-${width}.png`,
      fullPage: true,
    });
    const downloaded = await readDownload(page, () => recovery.click());
    expect(downloaded).toEqual(before);
    expect(downloaded.setup.fuel).toBe(80);
    expect(downloaded.lap.setup.fuel).toBe(15);
    await expect(alert).toContainText(/storage/i);
    expect(await project(page)).toEqual(before);
    expect(
      await page.evaluate(() => localStorage.getItem("laptrix.project.v1")),
    ).toBe(savedBefore);
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("20");
    expect(calculations).toBe(0);
    await page.evaluate(() =>
      (window as Window & { restoreStorage?: () => void }).restoreStorage!(),
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(alert).toHaveCount(0);
    const savedAfter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("laptrix.project.v1")!),
    );
    expect(savedAfter.setup).toEqual(before.setup);
    expect(savedAfter.reference).toEqual(before.reference);
    expect(calculations).toBe(0);
  });
}

test("successful local Save preserves an unrelated reference error and its retry action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "invalid-reference.json",
      mimeType: "application/json",
      buffer: Buffer.from("{invalid"),
    });
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Current reference kept");
  const error = await alert.textContent();
  await page.getByRole("slider", { name: "Fuel load" }).fill("80");
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  const before = await project(page);
  let calculations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) calculations++;
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Project saved on this device", { exact: true }),
  ).toBeVisible();
  await expect(alert).toHaveText(error!);
  await expect(
    alert.getByRole("button", { name: "Import reference again", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("laptrix.project.v1")!),
  );
  expect(saved.setup).toEqual(before.setup);
  expect(saved.reference).toEqual(before.reference);
  expect(await project(page)).toEqual(before);
  expect(
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue(),
  ).toBe("20");
  expect(calculations).toBe(0);
});
