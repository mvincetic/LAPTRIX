import { test, expect } from "@playwright/test";
import { defaultSetup, type Lap } from "../../packages/shared/schema";
import { formatTime } from "../../packages/telemetry";

for (const [track, vehicle, width] of [
  ["red-bull-ring", "formula-development", 1600],
  ["ardennes-development", "gt-development", 390],
  ["red-bull-ring", "gt-development", 780],
] as const) {
  test(`driving HUD follows exact splits, seeks and playback on ${track} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 780 ? 390 : 900 });
    await page.addInitScript(
      ({ track, vehicle, setup }) =>
        localStorage.setItem(
          "laptrix.project.v1",
          JSON.stringify({
            version: 1,
            trackId: track,
            vehicleId: vehicle,
            setup,
          }),
        ),
      { track, vehicle, setup: defaultSetup },
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/simulate") &&
        r.ok() &&
        r.request().postDataJSON().setup.solver === "optimized",
    );
    await page.goto("/");
    const lap: Lap = await (await response).json();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    const hud = page.getByRole("group", {
      name: "Driving telemetry",
      exact: true,
    });
    await expect(hud).toHaveCount(0);
    let solves = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/simulate")) solves++;
    });
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const input = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    const seek = async (time: number) => {
      await input.fill(String(time));
      await input.press("Enter");
      await expect(hud.getByTestId("hud-time")).toHaveText(formatTime(time));
    };
    for (const camera of ["Chase", "Onboard"]) {
      await page.getByRole("button", { name: camera, exact: true }).click();
      await expect(hud).toBeVisible();
      await expect(
        hud.getByRole("img", { name: /Full circuit map/ }),
      ).toBeVisible();
      await seek(lap.sectors[0].split);
      await expect(page.getByTestId("hud-sector-1")).toHaveAttribute(
        "data-state",
        "complete",
      );
      await expect(page.getByTestId("hud-sector-1")).toContainText(
        lap.sectors[0].time.toFixed(3),
      );
      await expect(page.getByTestId("hud-sector-2")).toContainText("0.000");
      await expect(page.getByTestId("hud-sector-3")).toContainText("—");
      const atGate = await page
        .getByTestId("driving-map-car")
        .getAttribute("cx");
      await seek(lap.lapTime);
      await expect(hud.locator('li[data-state="complete"]')).toHaveCount(3);
      await seek(0);
      await expect(page.getByTestId("hud-sector-1")).toContainText("0.000");
      await expect(hud.locator('li[data-state="upcoming"]')).toHaveCount(2);
      expect(
        await page.getByTestId("driving-map-car").getAttribute("cx"),
      ).not.toBe(atGate);
      await expect(page.getByTestId("hud-speed")).toHaveText(
        String(Math.round(lap.samples[0].speed * 3.6)),
      );
      await expect(page.getByTestId("hud-gear")).toHaveText(
        String(lap.samples[0].gear),
      );
      await expect(
        page.getByRole("meter", { name: "Driving throttle" }),
      ).toHaveAttribute("value", String(lap.samples[0].throttle));
      await page
        .getByRole("button", { name: "Play viewer lap", exact: true })
        .click();
      await expect
        .poll(async () => Number(await cursor.inputValue()))
        .toBeGreaterThan(0.3);
      await page
        .getByRole("button", { name: "Pause viewer lap", exact: true })
        .click();
      await expect(page.getByTestId("hud-time")).toHaveText(
        (await page.getByTestId("scene-time").textContent()) ?? "",
      );
      const captured = await hud.textContent();
      await page
        .getByRole("button", { name: "Fullscreen viewer", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Exit fullscreen viewer",
          exact: true,
        }),
      ).toBeVisible();
      await expect(hud).toBeVisible();
      await expect(hud).toHaveText(captured!);
      expect(
        await page.evaluate(() => {
          const scene = document
            .querySelector(".scene")!
            .getBoundingClientRect();
          const controls = document
            .querySelector(".scene-bottom")!
            .getBoundingClientRect();
          return [...document.querySelectorAll(".hud-card")].every((node) => {
            const r = node.getBoundingClientRect();
            return (
              r.left >= scene.left &&
              r.right <= scene.right &&
              r.top >= scene.top &&
              r.bottom <= controls.top
            );
          });
        }),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Exit fullscreen viewer", exact: true })
        .click();
    }
    await page
      .getByRole("tab", { name: "Analysis Layers", exact: true })
      .click();
    await expect(hud).toHaveCount(0);
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await expect(hud).toBeVisible();
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect(hud).toHaveCount(0);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
