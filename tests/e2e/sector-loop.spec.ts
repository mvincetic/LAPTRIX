import { expect, test, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

type LoopProbeWindow = Window & {
  loopProbe: { times: number[]; observer: MutationObserver };
};
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
  test(`explicit sector loops retain shared playback and workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const lap: Lap = before.lap;
    const sector = lap.sectors[1];
    const start = sector.split - sector.time,
      end = sector.split;
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    const status = page
      .getByRole("status")
      .filter({ hasText: "Playback loop:" });
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await range.selectOption("2");
    await expect(cursor).toHaveAttribute("value", "0");
    await expect(status).toHaveCount(0);
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await expect(status).toHaveText("Playback loop: Sector 2");
    await expect(
      page.getByRole("button", { name: "Loop sector", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(Number(await cursor.getAttribute("value"))).toBeCloseTo(start, 8);
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Playback speed" })
      .selectOption("4");
    for (let crossing = 0; crossing < 2; crossing++) {
      // The clock caps progress after slow frames. Exercise real boundary crossings
      // without requiring a software WebGL renderer to finish whole sectors on time.
      const nearEnd = (end - 1).toFixed(2);
      await cursor.fill(nearEnd);
      await expect(cursor).toHaveAttribute("value", String(Number(nearEnd)));
      await page.evaluate(() => {
        const slider = document.querySelector<HTMLInputElement>(
          '[aria-label="Lap playback position"]',
        )!;
        const times = [Number(slider.getAttribute("value"))];
        const observer = new MutationObserver(() =>
          times.push(Number(slider.getAttribute("value"))),
        );
        observer.observe(slider, {
          attributes: true,
          attributeFilter: ["value"],
        });
        (window as unknown as LoopProbeWindow).loopProbe = { times, observer };
      });
      await page
        .getByRole("button", { name: "Play playback", exact: true })
        .click();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const times = (window as unknown as LoopProbeWindow).loopProbe
              .times;
            return times
              .slice(1)
              .filter((time, index) => time < times[index] - 1).length;
          }),
        )
        .toBeGreaterThanOrEqual(1);
      await expect(status).toHaveText("Playback loop: Sector 2");
      await page
        .getByRole("button", { name: "Pause playback", exact: true })
        .click();
      const times = await page.evaluate(() => {
        const probe = (window as unknown as LoopProbeWindow).loopProbe;
        probe.observer.disconnect();
        return probe.times;
      });
      expect(times.length).toBeGreaterThan(2);
      expect(
        times.every((time) => time >= start - 1e-8 && time < end + 1e-8),
      ).toBe(true);
    }
    const pausedAt = Number(await cursor.getAttribute("value"));
    await range.selectOption("3");
    await expect(
      page.getByRole("button", { name: "Loop sector", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(status).toHaveText("Playback loop: Sector 2");
    expect(Number(await cursor.getAttribute("value"))).toBe(pausedAt);
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await expect(status).toHaveText("Playback loop: Sector 2");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await expect(status).toHaveText("Playback loop: Sector 2");
    await page
      .getByRole("button", { name: "Full-lap loop", exact: true })
      .click();
    await expect(status).toHaveCount(0);
    expect(Number(await cursor.getAttribute("value"))).toBe(pausedAt);
    await expect(
      page.getByRole("button", { name: "Loop playback", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("tab", { name: "Lap Graphs", exact: true }).click();
    await range.selectOption("2");
    const sectorLoop = page.getByRole("button", {
      name: "Loop sector",
      exact: true,
    });
    await sectorLoop.focus();
    await sectorLoop.press("Space");
    await expect(sectorLoop).toHaveAttribute("aria-pressed", "true");
    await sectorLoop.press("Space");
    await expect(status).toHaveCount(0);
    await expect(sectorLoop).toHaveAttribute("aria-pressed", "false");
    expect(Number(await cursor.getAttribute("value"))).toBe(pausedAt);
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Loop playback", exact: true })
      .click();
    await expect(status).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Loop playback", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await cursor.fill("0");
    await expect(status).toHaveCount(0);
    await expect(cursor).toHaveAttribute("value", "0");
    await expect(
      page.getByRole("button", { name: "Loop playback", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    const solved = page.waitForResponse((response) =>
      response.url().endsWith("/api/simulate"),
    );
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    expect((await solved).ok()).toBe(true);
    await expect(status).toHaveCount(0);
    await expect(cursor).toHaveAttribute("value", "0");
    await expect(range).toHaveValue("all");
    await expect(
      page.getByRole("button", { name: "Play playback", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
