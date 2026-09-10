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

for (const width of [1600, 390]) {
  for (const failure of ["enter", "exit"] as const) {
    test(`fullscreen ${failure} rejection recovers without replacing the viewer at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        ({ failure }) => {
          let attempts = 0;
          if (failure === "enter") {
            const native = Element.prototype.requestFullscreen;
            Element.prototype.requestFullscreen = function (options) {
              if (++attempts === 1)
                return Promise.reject(
                  new TypeError("Original denied fullscreen entry"),
                );
              return native.call(this, options);
            };
          } else {
            const native = Document.prototype.exitFullscreen;
            Document.prototype.exitFullscreen = function () {
              if (++attempts === 1)
                return Promise.reject(
                  new TypeError("Original denied fullscreen exit"),
                );
              return native.call(this);
            };
          }
        },
        { failure },
      );
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
      const cursor = page.getByRole("slider", {
        name: "Lap playback position",
      });
      await cursor.fill("20");
      await page.getByRole("button", { name: "Top View", exact: true }).click();
      const canvas = await page.locator("canvas").elementHandle();
      const before = await project(page);
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      const enter = page.getByRole("button", {
        name: "Fullscreen viewer",
        exact: true,
      });
      const exit = page.getByRole("button", {
        name: "Exit fullscreen viewer",
        exact: true,
      });
      const status = page.getByRole("status", {
        name: "Fullscreen status",
        exact: true,
      });
      const isFullscreen = () =>
        page.evaluate(
          () =>
            document.fullscreenElement ===
            document.querySelector(".track-panel"),
        );
      await enter.click();
      if (failure === "enter") {
        await expect(status).toContainText("could not open");
        expect(await isFullscreen()).toBe(false);
        await expect(enter).toHaveAttribute("aria-pressed", "false");
        await expect(cursor).toHaveAttribute("value", "20");
        expect(await project(page)).toEqual(before);
        await enter.click();
      }
      await expect.poll(isFullscreen).toBe(true);
      await expect(exit).toHaveAttribute("aria-pressed", "true");
      await expect(status).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Top View", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      const bounds = await page.locator("canvas").boundingBox();
      expect(bounds!.width).toBeGreaterThan(width * 0.8);
      expect(bounds!.height).toBeGreaterThan(700);
      await exit.click();
      if (failure === "exit") {
        await expect(status).toContainText("could not close");
        expect(await isFullscreen()).toBe(true);
        await expect(exit).toHaveAttribute("aria-pressed", "true");
        await exit.click();
      }
      await expect.poll(isFullscreen).toBe(false);
      await expect(enter).toHaveAttribute("aria-pressed", "false");
      await expect(status).toHaveCount(0);
      // Browser-originated transitions also update the control, independently of its click handler.
      await enter.click();
      await expect.poll(isFullscreen).toBe(true);
      await page.evaluate(() => document.exitFullscreen());
      await expect.poll(isFullscreen).toBe(false);
      await expect(enter).toHaveAttribute("aria-pressed", "false");
      expect(
        await canvas!.evaluate(
          (node) => node === document.querySelector("canvas"),
        ),
      ).toBe(true);
      await expect(cursor).toHaveAttribute("value", "20");
      expect(await project(page)).toEqual(before);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      await expect(page.locator(".event-marker")).toHaveCount(3);
      await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
      await expect(
        page.getByRole("checkbox", {
          name: "Show reference ghost",
          exact: true,
        }),
      ).toBeChecked();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    });
  }
}

test("a browser without fullscreen support keeps the viewer usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      value: undefined,
      configurable: true,
    }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByRole("button", { name: "Fullscreen viewer", exact: true })
    .click();
  const status = page.getByRole("status", {
    name: "Fullscreen status",
    exact: true,
  });
  await expect(status).toContainText("not available");
  await page
    .getByRole("button", { name: "Dismiss fullscreen message", exact: true })
    .click();
  await expect(status).toHaveCount(0);
  await page.getByRole("button", { name: "Top View", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Top View", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("short landscape fullscreen keeps the header, camera controls and footer reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 780, height: 390 });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByRole("button", { name: "Fullscreen viewer", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("track-panel"),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.locator(".track-panel").evaluate((panel) => {
        const nodes = [
          ...panel.querySelectorAll(
            ".panel-tabs, .view-actions button, .scene-footer",
          ),
        ];
        return nodes.every((node) => {
          const box = node.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.left >= 0 &&
            box.right <= window.innerWidth &&
            box.top >= 0 &&
            box.bottom <= window.innerHeight
          );
        });
      }),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Exit fullscreen viewer", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull();
});

test("an older fullscreen rejection cannot overwrite a newer native transition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const native = Element.prototype.requestFullscreen;
    let attempts = 0;
    Element.prototype.requestFullscreen = function (options) {
      if (++attempts === 1)
        return new Promise<void>((_resolve, reject) => {
          Object.assign(window, {
            rejectOldFullscreen: () =>
              reject(new TypeError("Original delayed fullscreen rejection")),
          });
        });
      return native.call(this, options);
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const enter = page.getByRole("button", {
    name: "Fullscreen viewer",
    exact: true,
  });
  await enter.click();
  await enter.click();
  const exit = page.getByRole("button", {
    name: "Exit fullscreen viewer",
    exact: true,
  });
  await expect(exit).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() =>
    (
      window as unknown as { rejectOldFullscreen: () => void }
    ).rejectOldFullscreen(),
  );
  await page.getByRole("button", { name: "Top View", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Fullscreen status", exact: true }),
  ).toHaveCount(0);
  await expect(exit).toHaveAttribute("aria-pressed", "true");
  await exit.click();
  await expect(enter).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});
