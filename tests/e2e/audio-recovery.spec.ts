import { test, expect, type Page } from "@playwright/test";

type AudioHarness = {
  attempts: number;
  contexts: AudioContext[];
  release?: () => void;
};
type AudioWindow = Window & { audioHarness?: AudioHarness };

async function rejectFirstAudioStart(page: Page, delayRetry = false) {
  await page.addInitScript(
    ({ delayRetry }) => {
      const harness: AudioHarness = { attempts: 0, contexts: [] };
      (window as AudioWindow).audioHarness = harness;
      const Native = window.AudioContext;
      const resume = Native.prototype.resume;
      window.AudioContext = class extends Native {
        constructor() {
          super();
          harness.contexts.push(this);
        }
      };
      Native.prototype.resume = function () {
        harness.attempts++;
        if (harness.attempts === 1)
          return Promise.reject(
            new DOMException("Original audio-start fixture", "NotAllowedError"),
          );
        if (delayRetry && harness.attempts === 2)
          return new Promise<void>((resolve, reject) => {
            harness.release = () => {
              void resume.call(this).then(resolve, reject);
            };
          });
        return resume.call(this);
      };
    },
    { delayRetry },
  );
}

async function project(page: Page) {
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

for (const previousStorageError of [false, true]) {
  test(`audio failure retries audio without inheriting another action (${previousStorageError ? "phone after failed Save" : "desktop"})`, async ({
    page,
  }) => {
    const width = previousStorageError ? 390 : 1600;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await rejectFirstAudioStart(page);
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    const before = await project(page);
    if (previousStorageError) {
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "laptrix.project.v1")
            throw new DOMException(
              "Original storage fixture",
              "QuotaExceededError",
            );
          return original.call(this, key, value);
        };
      });
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Device storage");
    }
    let calculations = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) calculations++;
    });
    await page
      .getByRole("button", { name: "Enable engine audio", exact: true })
      .click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Audio could not start");
    const retry = alert.getByRole("button", {
      name: "Enable audio again",
      exact: true,
    });
    await expect(retry).toBeVisible();
    expect(await project(page)).toEqual(before);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    await page.screenshot({
      path: `artifacts/audio-recovery-error-${width}.png`,
      fullPage: true,
    });
    await retry.click();
    await expect(
      page.getByRole("button", { name: "Mute audio", exact: true }),
    ).toBeVisible();
    await expect(alert).toHaveCount(0);
    await expect(
      page.getByText(
        "Procedural engine audio enabled · play the lap to listen",
        { exact: true },
      ),
    ).toBeVisible();
    expect(await project(page)).toEqual(before);
    expect(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ).toBe("20");
    expect(calculations).toBe(0);
    expect(
      await page.evaluate(() => {
        const harness = (window as AudioWindow).audioHarness!;
        return {
          attempts: harness.attempts,
          contexts: harness.contexts.length,
          state: harness.contexts[0].state,
        };
      }),
    ).toEqual({ attempts: 2, contexts: 1, state: "running" });
    await page.getByRole("button", { name: "Mute audio", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Enable engine audio", exact: true }),
    ).toBeVisible();
  });
}

test("a delayed successful audio retry retains a newer reference error and its recovery", async ({
  page,
}) => {
  await rejectFirstAudioStart(page, true);
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("slider", { name: "Fuel load" }).fill("80");
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  const before = await project(page);
  let calculations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) calculations++;
  });
  await page
    .getByRole("button", { name: "Enable engine audio", exact: true })
    .click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Audio could not start");
  await alert
    .getByRole("button", { name: "Enable audio again", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as AudioWindow).audioHarness?.release),
      ),
    )
    .toBe(true);
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "invalid-reference.json",
      mimeType: "application/json",
      buffer: Buffer.from("{invalid"),
    });
  await expect(alert).toContainText("Current reference kept");
  const message = await alert.textContent();
  await page.evaluate(() => (window as AudioWindow).audioHarness!.release!());
  await expect(
    page.getByRole("button", { name: "Mute audio", exact: true }),
  ).toBeVisible();
  await expect(alert).toHaveText(message!);
  await expect(
    alert.getByRole("button", { name: "Import reference again", exact: true }),
  ).toBeVisible();
  expect(await project(page)).toEqual(before);
  expect(
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .inputValue(),
  ).toBe("20");
  expect(calculations).toBe(0);
});
