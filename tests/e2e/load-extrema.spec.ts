import { expect, test, type Page } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

async function exported(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await download).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
for (const width of [1600, 390]) {
  test(`load extrema pause at exact current samples and preserve the project at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
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
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await exported(page);
    const lap: Lap = before.lap;
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await expect(page.locator(".load-extrema")).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Graph channels" })
      .selectOption("loads");
    await page.getByRole("checkbox", { name: "Reference traces" }).check();
    const disclosure = page.locator(".load-extrema");
    await expect(disclosure).not.toHaveAttribute("open");
    await disclosure.locator("summary").focus();
    await disclosure.locator("summary").press("Enter");
    await expect(disclosure).toHaveAttribute("open", "");
    const cases = [
      ["min-load", "minimum tyre load", "normalLoadG", "min"],
      ["max-load", "maximum tyre load", "normalLoadG", "max"],
      ["min-vertical", "minimum vertical G", "verticalG", "min"],
      ["max-vertical", "maximum vertical G", "verticalG", "max"],
    ] as const;
    for (const axis of ["Time", "Distance"]) {
      await page.getByRole("button", { name: axis, exact: true }).click();
      for (const [id, label, key, kind] of cases) {
        const value = Math[kind](...lap.samples.map((sample) => sample[key]!));
        const sample = lap.samples.find((sample) => sample[key] === value)!;
        await expect(
          page.getByTestId(`load-extreme-${id}`).locator("strong"),
        ).toContainText(value.toFixed(3));
        await page
          .getByRole("combobox", { name: "Plot range" })
          .selectOption("2");
        await page
          .getByRole("button", { name: "Play playback", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Pause playback", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: new RegExp(`^Inspect ${label}$`, "i") })
          .click();
        await expect(
          page.getByRole("button", { name: "Play playback", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("combobox", { name: "Plot range" }),
        ).toHaveValue("all");
        const position =
          Number(
            await page
              .getByTestId("channel-cursor")
              .locator("line")
              .getAttribute("x1"),
          ) / 1000;
        expect(
          position * (axis === "Time" ? lap.lapTime : lap.length),
        ).toBeCloseTo(axis === "Time" ? sample.time : sample.distance, 9);
        await expect(page.getByTestId(`current-value-${key}`)).toHaveText(
          value.toFixed(3),
        );
        await expect(
          page.getByRole("checkbox", { name: "Reference traces" }),
        ).toBeChecked();
      }
    }
    const currentPath = await page
      .getByTestId("current-trace-normalLoadG")
      .getAttribute("d");
    expect(await exported(page)).toEqual(before);
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).toBeHidden();
    await page
      .locator(".telemetry-panel")
      .screenshot({ path: `artifacts/load-extrema-${width}.png` });
    await disclosure.locator("summary").click();
    await expect(disclosure).not.toHaveAttribute("open");
    await expect(page.getByTestId("current-trace-normalLoadG")).toHaveAttribute(
      "d",
      currentPath!,
    );
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
}
