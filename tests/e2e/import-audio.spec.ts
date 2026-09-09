import { test, expect } from "@playwright/test";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };

test("valid and invalid custom track imports preserve a usable project", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByLabel("Import track file", { exact: true }).setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"points":[]}'),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(source.id);
  const imported = {
    ...source,
    id: "browser-imported",
    name: "Imported elevation loop",
  };
  await page.getByLabel("Import track file", { exact: true }).setInputFiles({
    name: "custom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue("browser-imported");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue("browser-imported");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("audio is explicitly enabled and follows playback controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        (window as Window & { testAudio?: AudioContext }).testAudio = this;
      }
    };
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { testAudio?: AudioContext }).testAudio ===
        undefined,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Enable engine audio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mute audio", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { testAudio?: AudioContext }).testAudio?.state,
    ),
  ).toBe("running");
  await page
    .getByRole("button", { name: "Play playback", exact: true })
    .click();
  await expect
    .poll(() => page.getByTestId("playback-time").textContent())
    .not.toBe("0:00.000");
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  await page.getByRole("button", { name: "Mute audio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enable engine audio", exact: true }),
  ).toBeVisible();
});

type TestTool = {
  name: string;
  execute: (input: unknown) => Promise<{ time: number; distance: number }>;
};
test("optional WebMCP tool contract uses the shared telemetry cursor", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const target = window as Window & { lapTool?: TestTool };
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: (tool: TestTool, options: { signal: AbortSignal }) => {
          target.lapTool = tool;
          options.signal.addEventListener("abort", () => {
            if (target.lapTool === tool) delete target.lapTool;
          });
        },
      },
    });
  });
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { lapTool?: TestTool }).lapTool?.name,
      ),
    )
    .toBe("inspect_lap_at_distance");
  const result = await page.evaluate(() =>
    (window as Window & { lapTool?: TestTool }).lapTool!.execute({
      distance: 1200,
    }),
  );
  expect(result.distance).toBeCloseTo(1200, 8);
  expect(
    Number(
      await page
        .getByRole("slider", { name: "Lap playback position" })
        .inputValue(),
    ),
  ).toBeCloseTo(result.time, 2);
  const rejected = await page.evaluate(async () => {
    try {
      await (window as Window & { lapTool?: TestTool }).lapTool!.execute({
        distance: -1,
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
});
