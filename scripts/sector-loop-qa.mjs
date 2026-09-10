/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
async function project(page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream())
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
    [780, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toContainText(
      "GT Development 01",
    );
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const { lap } = before;
    const sector = lap.sectors[1];
    const at = Math.round((sector.split - sector.time / 2) * 100) / 100;
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const range = page.getByRole("combobox", {
      name: "Plot range",
      exact: true,
    });
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    const status = page
      .getByRole("status")
      .filter({ hasText: "Playback loop:" });
    await page
      .getByRole("combobox", { name: "Graph channels" })
      .selectOption("loads");
    await page
      .getByRole("checkbox", { name: "Reference traces", exact: true })
      .check();
    await range.selectOption("2");
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await cursor.fill(String(at));
    await expect(status).toHaveText("Playback loop: Sector 2");
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).toBeHidden();
    async function capture(state, active = true) {
      if (active) await expect(status).toHaveText("Playback loop: Sector 2");
      else await expect(status).toHaveCount(0);
      await expect(cursor).toHaveAttribute("value", String(at));
      await expect(
        page.getByRole("button", { name: "Play playback", exact: true }),
      ).toBeVisible();
      await page.locator(".playback").scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(() => {
        const strip = document.querySelector(".playback-loop-status");
        const bounds = strip?.getBoundingClientRect();
        return {
          scrollWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          loopBounds: bounds
            ? { left: bounds.left, right: bounds.right, height: bounds.height }
            : null,
          glError: document
            .querySelector(".scene canvas")
            .getContext("webgl2")
            .getError(),
        };
      });
      expect(metrics.scrollWidth).toBe(width);
      expect(metrics.glError).toBe(0);
      if (metrics.loopBounds) {
        expect(metrics.loopBounds.left).toBeGreaterThanOrEqual(0);
        expect(metrics.loopBounds.right).toBeLessThanOrEqual(width);
      }
      await page.screenshot({
        path: `artifacts/sector-loop-${width}-${state}.png`,
        fullPage: true,
      });
      findings.push({ width, height, state, at, active, ...metrics });
    }
    await capture("loads");
    await page
      .locator(".playback-loop-status")
      .screenshot({ path: `artifacts/sector-loop-${width}-controls.png` });
    await range.selectOption("all");
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await capture("delta");
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await capture("cursor");
    await page
      .getByRole("button", { name: "Full-lap loop", exact: true })
      .click();
    await capture("cleared", false);
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }
  await writeFile(
    "artifacts/sector-loop-qa.json",
    JSON.stringify(findings, null, 2),
  );
  console.log(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
