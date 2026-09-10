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
      .getByRole("checkbox", { name: "Reference traces", exact: true })
      .check();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const panel = page.locator(".telemetry-panel");
    const custom = page.getByRole("button", {
      name: "Custom window",
      exact: true,
    });
    async function capture(state, editor = false, cursorTime = 20) {
      await expect(
        page.getByRole("button", { name: "Dismiss notification" }),
      ).toBeHidden();
      await panel.scrollIntoViewIfNeeded();
      const metrics = await panel.evaluate((node, editor) => {
        const bounds = node.getBoundingClientRect();
        const controls = [
          ...node.querySelectorAll(
            editor
              ? ".plot-window-editor input, .plot-window-editor button"
              : ".plot-range-controls select, .plot-range-controls button",
          ),
        ].map((control) => {
          const box = control.getBoundingClientRect();
          return {
            label: control.textContent || control.getAttribute("id"),
            x: box.x - bounds.x,
            right: box.right - bounds.x,
            width: box.width,
            height: box.height,
          };
        });
        const chart = node.querySelector(".graph-area svg, .delta-plot svg");
        const ticks = [
          ...node.querySelectorAll(
            ".channel-x-ticks span, .delta-x-ticks span",
          ),
        ].map((tick) => {
          const box = tick.getBoundingClientRect();
          return { label: tick.textContent, x: box.x, right: box.right };
        });
        return {
          panelWidth: bounds.width,
          panelHeight: bounds.height,
          controls,
          chartHeight: chart.getBoundingClientRect().height,
          viewBox: chart.getAttribute("viewBox"),
          ticks,
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        };
      }, editor);
      expect(metrics.overflow).toBe(false);
      expect(metrics.chartHeight).toBeGreaterThan(100);
      expect(
        metrics.controls.every(
          (control) => control.x >= 0 && control.right <= metrics.panelWidth,
        ),
      ).toBe(true);
      expect(new Set(metrics.ticks.map((tick) => tick.label)).size).toBe(6);
      for (let i = 1; i < metrics.ticks.length; i++)
        expect(
          metrics.ticks[i].x - metrics.ticks[i - 1].right,
        ).toBeGreaterThanOrEqual(0);
      await expect(cursor).toHaveAttribute("value", String(cursorTime));
      expect(await project(page)).toEqual(before);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      await panel.screenshot({
        path: `artifacts/plot-window-${width}-${state}.png`,
      });
      findings.push({
        width,
        height,
        state,
        projectPreserved: true,
        cursor: cursorTime,
        requests,
        errors,
        ...metrics,
      });
    }
    await custom.click();
    await page
      .getByRole("spinbutton", { name: "Window start (s)" })
      .fill("18.125");
    await page
      .getByRole("spinbutton", { name: "Window end (s)" })
      .fill("20.375");
    await capture("editor", true);
    await page
      .getByRole("button", { name: "Apply window", exact: true })
      .click();
    await capture("native-distance");
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await capture("native-time");
    await page
      .getByRole("button", { name: "Loop window", exact: true })
      .click();
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    await capture("delta-loop");
    if (width === 1600 || width === 390)
      await page.screenshot({
        path: `artifacts/plot-window-${width}-workspace.png`,
        fullPage: true,
      });
    await custom.click();
    await page.getByRole("spinbutton", { name: "Window start (s)" }).fill("20");
    await page
      .getByRole("spinbutton", { name: "Window end (s)" })
      .fill("20.001");
    await page
      .getByRole("button", { name: "Apply window", exact: true })
      .click();
    await capture("minimum-time");
    const boundary = Array.from(
      { length: 10000 },
      (_, i) => 10 + (i + 1) / 1000,
    ).find((time) => (time / before.lap.lapTime) * before.lap.lapTime < time);
    expect(Number.isFinite(boundary)).toBe(true);
    await custom.click();
    await page
      .getByRole("spinbutton", { name: "Window start (s)" })
      .fill(String(boundary));
    await page
      .getByRole("spinbutton", { name: "Window end (s)" })
      .fill(String(boundary + 1));
    await page
      .getByRole("button", { name: "Apply window", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    await expect(page.getByTestId("delta-cursor")).toBeVisible();
    await capture("exact-boundary", false, boundary);
    await page.close();
  }
} finally {
  await writeFile(
    "artifacts/plot-window-qa.json",
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
