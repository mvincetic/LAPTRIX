import { test, expect, type Locator } from "@playwright/test";
import type { Lap, TimingReference } from "../../packages/shared/schema";

async function position(node: Locator) {
  return node.evaluate((element) => {
    const x = element.getAttribute("data-anchor-x");
    const y = element.getAttribute("data-anchor-y");
    if (!x || !y || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y)))
      throw new Error("Rendered vehicle anchor is unavailable");
    const box = element
      .closest(".scene")!
      .querySelector("canvas")!
      .getBoundingClientRect();
    return {
      x: box.x + Number(x) + window.scrollX,
      y: box.y + Number(y) + window.scrollY,
    };
  });
}

for (const width of [1600, 390]) {
  test(`native reference ghosts use independent vehicles and hold the finish on the shared clock at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const initial = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON()?.setup.solver === "optimized",
    );
    await page.goto("/");
    const formula: Lap = await (await initial).json();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    const showReference = page.getByRole("checkbox", {
      name: "Show reference ghost",
      exact: true,
    });
    await expect(showReference).toBeEnabled();
    await expect(showReference).not.toBeChecked();
    await showReference.focus();
    await page.keyboard.press("Space");
    const reference = page.getByRole("img", {
      name: "Reference ghost: Formula Development 01",
      exact: true,
    });
    const current = page.getByRole("img", {
      name: "Current ghost: GT Development 01",
      exact: true,
    });
    await expect(reference).toBeVisible();
    await expect(current).toBeVisible();
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const atTime = page.getByRole("spinbutton", {
      name: "Inspect at time (s)",
    });
    await atTime.fill(String(formula.lapTime + 1));
    await atTime.press("Enter");
    // Wait for an actual rendered frame before taking the held reference position.
    await page.waitForTimeout(300);
    const finished = await position(reference),
      moving = await position(current);
    await atTime.fill(String(formula.lapTime + 5));
    await atTime.press("Enter");
    await expect
      .poll(async () => {
        const next = await position(current);
        return Math.hypot(next.x - moving.x, next.y - moving.y);
      })
      .toBeGreaterThan(5);
    const held = await position(reference);
    expect(Math.hypot(held.x - finished.x, held.y - finished.y)).toBeLessThan(
      1,
    );
    await page.getByRole("button", { name: "Restart lap" }).click();
    await expect(page.getByTestId("playback-time")).toHaveText("0:00.000");
    await page
      .getByRole("checkbox", { name: "Show current ghost", exact: true })
      .uncheck();
    await expect(current).toHaveCount(0);
    await expect(reference).toBeVisible();
    await page
      .getByRole("checkbox", { name: "Show current ghost", exact: true })
      .check();
    const timing: TimingReference = {
      format: "laptrix-timing-reference-v1",
      label: "Timing fixture",
      vehicleLabel: "Formula timing",
      origin: "external-simulation",
      source: "Original test timing, no vehicle positions",
      trackId: formula.trackId,
      lapTime: formula.lapTime,
      units: { time: "s", progress: "fraction" },
      alignment: formula.alignment!,
      samples: formula.samples.map(({ time }) => ({ time })),
    };
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(timing)),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Timing fixture",
    );
    await expect(showReference).toBeDisabled();
    await expect(showReference).not.toBeChecked();
    await expect(reference).toHaveCount(0);
    await expect(
      page.getByText("This timing-only reference has no vehicle positions.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Time Delta", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
}
