import { expect, test } from "@playwright/test";
import type { Lap } from "../../packages/shared/schema";

for (const width of [1600, 390]) {
  test(`exact cursor entry matches exported telemetry and rejects invalid positions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("button", { name: "Additional actions" }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export telemetry JSON", exact: true })
      .click();
    const stream = await (await download).createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const lap: Lap = JSON.parse(Buffer.concat(chunks).toString());
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    if (width === 1600) {
      const panel = page.getByRole("tabpanel", { name: "Cursor Data" });
      await panel.focus();
      await panel.press("PageDown");
      await expect
        .poll(() => panel.evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0);
      await expect(page.locator(".cursor-note")).toBeInViewport({ ratio: 1 });
    }
    const atDistance = page.getByRole("spinbutton", {
      name: "Inspect at distance (m)",
    });
    const index = lap.samples.findIndex(
      (sample, i) =>
        i < lap.samples.length - 1 && sample.gear !== lap.samples[i + 1].gear,
    );
    expect(index).toBeGreaterThanOrEqual(0);
    const a = lap.samples[index],
      b = lap.samples[index + 1],
      fraction = 3 / 7;
    const distance = a.distance + fraction * (b.distance - a.distance);
    const time = a.time + fraction * (b.time - a.time);
    const position = page.getByRole("slider", {
      name: "Lap playback position",
    });
    await atDistance.fill(String(distance));
    await expect(page.getByTestId("playback-time")).toHaveText("0:00.000");
    await atDistance.press("Enter");
    await expect(position).toHaveAttribute(
      "aria-valuetext",
      `${time.toFixed(3)} seconds, ${distance.toFixed(3)} metres`,
    );
    for (const [key, scale, digits, unit] of [
      ["speed", 3.6, 2, "km/h"],
      ["throttle", 100, 1, "%"],
      ["brake", 100, 1, "%"],
      ["rpm", 1, 0, "rpm"],
      ["longitudinalG", 1, 3, "G"],
      ["lateralG", 1, 3, "G"],
      ["verticalG", 1, 3, "G"],
      ["steering", 180 / Math.PI, 2, "°"],
      ["trackGradient", 100, 2, "%"],
      ["y", 1, 2, "m"],
      ["offset", 1, 3, "m"],
    ] as const) {
      const expected = (a[key] + fraction * (b[key] - a[key])) * scale;
      await expect(page.getByTestId(`cursor-${key}`)).toHaveText(
        `${Number(expected.toFixed(digits)).toFixed(digits)}${unit}`,
      );
    }
    await expect(page.getByTestId("cursor-gear")).toHaveText(String(a.gear));
    expect(lap.verticalDynamics).toBe("quasi-steady-road-normal-v1");
    const normalLoad =
      a.normalLoadG! + fraction * (b.normalLoadG! - a.normalLoadG!);
    await expect(page.getByTestId("cursor-normalLoadG")).toHaveText(
      `${normalLoad.toFixed(3)}× weight`,
    );
    await expect(page.getByText("Not modelled", { exact: true })).toHaveCount(
      0,
    );

    await page.getByRole("button", { name: "Time", exact: true }).click();
    const atTime = page.getByRole("spinbutton", {
      name: "Inspect at time (s)",
    });
    const beforePlaying = await page.getByTestId("playback-time").textContent();
    await page.getByRole("button", { name: "Play playback" }).click();
    await atTime.focus();
    const focusedValue = await atTime.inputValue();
    const focusedTime = await page.getByTestId("playback-time").textContent();
    await expect(page.getByTestId("playback-time")).not.toHaveText(
      focusedTime!,
    );
    await expect(atTime).toHaveValue(focusedValue);
    await atTime.fill("10.123");
    await expect(page.getByTestId("playback-time")).not.toHaveText(
      beforePlaying!,
    );
    await expect(atTime).toHaveValue("10.123");
    await atTime.press("Enter");
    await expect(
      page.getByRole("button", { name: "Play playback" }),
    ).toBeVisible();
    await expect(page.getByTestId("playback-time")).toHaveText("0:10.123");
    for (const invalid of ["-1", String(lap.lapTime + 1), ""]) {
      await atTime.fill(invalid);
      await atTime.press("Enter");
      expect(await atTime.evaluate((node) => node.matches(":invalid"))).toBe(
        true,
      );
      await expect(page.getByTestId("playback-time")).toHaveText("0:10.123");
      await atTime.press("Escape");
      await expect(atTime).toHaveValue("10.123");
    }
    await atTime.fill(String(lap.lapTime));
    await atTime.press("Enter");
    await expect(position).toHaveAttribute(
      "aria-valuetext",
      `${lap.lapTime.toFixed(3)} seconds, ${lap.length.toFixed(3)} metres`,
    );
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    const comparisonDelta = Number(
      (await page.getByTestId("cursor-delta").textContent())!.replace(" s", ""),
    );
    expect(comparisonDelta).toBeLessThan(0);
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await expect(position).toHaveAttribute(
      "aria-valuetext",
      `${lap.lapTime.toFixed(3)} seconds, ${lap.length.toFixed(3)} metres`,
    );
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    const apex = lap.samples[lap.corners[1].apexIndex];
    await expect(position).toHaveAttribute(
      "aria-valuetext",
      `${apex.time.toFixed(3)} seconds, ${apex.distance.toFixed(3)} metres`,
    );
    await expect(page.getByTestId("cursor-gear")).toHaveText(String(apex.gear));
    await atTime.fill("5");
    await page.getByRole("button", { name: "Distance", exact: true }).click();
    await expect(atDistance).toHaveValue(
      String(Number(apex.distance.toFixed(3))),
    );
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await expect(atTime).toHaveValue(String(Number(apex.time.toFixed(3))));
    await page.getByRole("button", { name: "Distance", exact: true }).click();
    await atDistance.fill("500");
    await page.getByRole("slider", { name: "Fuel load" }).fill("110");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cancel calculation" }),
    ).toHaveCount(0);
    await expect(atDistance).toHaveValue("0");
    await expect(page.getByTestId("playback-time")).toHaveText("0:00.000");
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
  });
}
