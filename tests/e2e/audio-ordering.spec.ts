import { expect, test, type Page } from "@playwright/test";

type AudioHarness = {
  attempts: number;
  contexts: AudioContext[];
  release?: () => Promise<void>;
};
type AudioWindow = Window & { audioOrdering: AudioHarness };

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
  for (const outcome of ["success", "failure"] as const) {
    test(`late audio ${outcome} preserves the newer ${outcome === "success" ? "mute" : "activation"} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        ({ outcome }) => {
          const harness: AudioHarness = { attempts: 0, contexts: [] };
          (window as unknown as AudioWindow).audioOrdering = harness;
          const Native = window.AudioContext,
            resume = Native.prototype.resume;
          window.AudioContext = class extends Native {
            constructor() {
              super();
              harness.contexts.push(this);
            }
          };
          Native.prototype.resume = function () {
            harness.attempts++;
            if (harness.attempts === 1)
              return new Promise<void>((resolve, reject) => {
                harness.release = async () => {
                  if (outcome === "success") {
                    await resume.call(this);
                    resolve();
                  } else
                    reject(
                      new DOMException(
                        "Original delayed audio failure",
                        "NotAllowedError",
                      ),
                    );
                };
              });
            return resume.call(this);
          };
        },
        { outcome },
      );
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const cursor = page.getByRole("slider", {
        name: "Lap playback position",
      });
      await cursor.fill("20");
      const before = await project(page);
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      const enable = page.getByRole("button", {
        name: "Enable engine audio",
        exact: true,
      });
      const mute = page.getByRole("button", {
        name: "Mute audio",
        exact: true,
      });
      await enable.click();
      await expect
        .poll(() =>
          page.evaluate(
            () => !!(window as unknown as AudioWindow).audioOrdering.release,
          ),
        )
        .toBe(true);
      await enable.click();
      await expect(mute).toBeVisible();
      if (outcome === "success") {
        await mute.click();
        await expect(enable).toBeVisible();
      }
      await page.evaluate(() =>
        (window as unknown as AudioWindow).audioOrdering.release!(),
      );
      // Export after completion so the final assertions observe the resulting React state.
      expect(await project(page)).toEqual(before);
      if (outcome === "success") {
        await expect(enable).toBeVisible();
        await expect(mute).toHaveCount(0);
        await expect(
          page.getByText(
            "Procedural engine audio enabled · play the lap to listen",
            { exact: true },
          ),
        ).toHaveCount(0);
      } else await expect(mute).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(cursor).toHaveAttribute("value", "20");
      expect(
        await page.evaluate(() => ({
          attempts: (window as unknown as AudioWindow).audioOrdering.attempts,
          contexts: (window as unknown as AudioWindow).audioOrdering.contexts
            .length,
        })),
      ).toEqual({ attempts: 2, contexts: 1 });
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    });
  }
}
