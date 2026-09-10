/* global document, window, Element, Document */
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
    await page.addInitScript(() => {
      let enters = 0,
        exits = 0;
      const enter = Element.prototype.requestFullscreen,
        exit = Document.prototype.exitFullscreen;
      Element.prototype.requestFullscreen = function (options) {
        if (++enters === 1)
          return Promise.reject(
            new TypeError("Original fullscreen entry fixture"),
          );
        return enter.call(this, options);
      };
      Document.prototype.exitFullscreen = function () {
        if (++exits === 1)
          return Promise.reject(
            new TypeError("Original fullscreen exit fixture"),
          );
        return exit.call(this);
      };
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("http://127.0.0.1:5173/");
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
    const cursor = page.locator('[aria-label="Lap playback position"]');
    await cursor.fill("20");
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    const before = await project(page);
    const originalCanvas = await page.locator("canvas").elementHandle();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const panel = page.locator(".track-panel");
    const status = page.getByRole("status", {
      name: "Fullscreen status",
      exact: true,
    });
    const enter = page.getByRole("button", {
      name: "Fullscreen viewer",
      exact: true,
    });
    const exit = page.getByRole("button", {
      name: "Exit fullscreen viewer",
      exact: true,
    });
    async function capture(state, full, message) {
      if (message) await expect(status).toContainText(message);
      else await expect(status).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.fullscreenElement ===
              document.querySelector(".track-panel"),
          ),
        )
        .toBe(full);
      const metrics = await panel.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const controls = [
          ...node.querySelectorAll(
            ".panel-tabs, .view-actions button, .scene-footer, .fullscreen-message",
          ),
        ].map((control) => {
          const bounds = control.getBoundingClientRect();
          return {
            label: control.getAttribute("aria-label") || control.className,
            x: bounds.x,
            y: bounds.y,
            right: bounds.right,
            bottom: bounds.bottom,
            width: bounds.width,
            height: bounds.height,
          };
        });
        const canvas = node.querySelector("canvas").getBoundingClientRect();
        return {
          panel: {
            x: box.x,
            y: box.y,
            right: box.right,
            bottom: box.bottom,
            width: box.width,
            height: box.height,
          },
          controls,
          canvas: { width: canvas.width, height: canvas.height },
          scrollWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
        };
      });
      if (full)
        await page.screenshot({
          path: `artifacts/fullscreen-${width}-${state}.png`,
        });
      else
        await panel.screenshot({
          path: `artifacts/fullscreen-${width}-${state}.png`,
        });
      const finding = {
        width,
        height,
        state,
        full,
        cursor: 20,
        requests,
        errors,
        ...metrics,
        passed: false,
      };
      findings.push(finding);
      expect(
        metrics.controls.every(
          (control) =>
            control.x >= metrics.panel.x &&
            control.right <= metrics.panel.right,
        ),
      ).toBe(true);
      if (full)
        expect(
          metrics.controls.every(
            (control) =>
              control.y >= 0 && control.bottom <= height && control.height > 0,
          ),
        ).toBe(true);
      expect(metrics.canvas.width).toBeGreaterThan(100);
      expect(metrics.canvas.height).toBeGreaterThan(100);
      await expect(cursor).toHaveAttribute("value", "20");
      expect(
        await originalCanvas.evaluate(
          (node) => node === document.querySelector("canvas"),
        ),
      ).toBe(true);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      expect(metrics.scrollWidth).toBe(width);
      finding.passed = true;
    }
    await enter.click();
    await capture("entry-denied", false, "could not open");
    await enter.click();
    await capture("entered", true);
    await exit.click();
    await capture("exit-denied", true, "could not close");
    await exit.click();
    await capture("restored", false);
    expect(await project(page)).toEqual(before);
    await page.close();
  }
} finally {
  await writeFile(
    "artifacts/fullscreen-qa.json",
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
