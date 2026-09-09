import { test, expect, type Page } from "@playwright/test";
import crossing from "../fixtures/crossing-track.json" with { type: "json" };

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

for (const workflow of ["run", "track", "project"] as const) {
  test(`cancelling a ${workflow} calculation aborts every request and preserves the complete workspace`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByLabel("Project name").fill("Keep this study");
    await page.getByRole("slider", { name: "Fuel load" }).focus();
    await page.keyboard.press("End");
    const before = await exportProject(page);
    const start = async () => {
      if (workflow === "run")
        await page
          .getByRole("button", { name: "Run Simulation", exact: true })
          .click();
      else
        await page
          .getByLabel(
            workflow === "track" ? "Import track file" : "Import project file",
            { exact: true },
          )
          .setInputFiles({
            name: "cancel-study.json",
            mimeType: "application/json",
            buffer: Buffer.from(
              JSON.stringify(
                workflow === "track"
                  ? crossing
                  : {
                      ...before,
                      projectName: "New imported study",
                      track: crossing,
                      lap: null,
                      reference: null,
                    },
              ),
            ),
          });
    };
    let release = () => {};
    let ready = () => {};
    let requestCount = 0;
    const expectedCount = workflow === "run" ? 1 : 2;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const allStarted = new Promise<void>((resolve) => {
      ready = resolve;
    });
    await page.route("**/api/simulate", async (route) => {
      if (++requestCount === expectedCount) ready();
      await gate;
      await route.abort("aborted");
    });
    try {
      await start();
      await allStarted;
      let abortedCount = 0;
      const allAborted = new Promise<void>((resolve) => {
        page.on("requestfailed", (request) => {
          if (
            request.url().endsWith("/api/simulate") &&
            ++abortedCount === expectedCount
          )
            resolve();
        });
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Cancel calculation", exact: true })
        .click();
      await allAborted;
      await expect(
        page.getByRole("button", { name: "Run Simulation", exact: true }),
      ).toBeEnabled();
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(await exportProject(page)).toEqual(before);
      expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
      expect(requestCount).toBe(expectedCount);
    } finally {
      release();
      await page.unrouteAll({ behavior: "wait" });
    }
    await start();
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    const after = await exportProject(page);
    expect(after.lap.trackId).toBe(
      workflow === "run" ? before.track.id : crossing.id,
    );
    expect(after.lap.setup.fuel).toBe(110);
    if (workflow !== "run") expect(after.reference.trackId).toBe(crossing.id);
    expect(after.projectName).toBe(
      workflow === "project" ? "New imported study" : before.projectName,
    );
  });
}
