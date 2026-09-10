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
    const key = page.getByRole("button", { name: "Track key", exact: true });
    const enter = page.getByRole("button", {
      name: "Fullscreen viewer",
      exact: true,
    });
    const exit = page.getByRole("button", {
      name: "Exit fullscreen viewer",
      exact: true,
    });
    async function capture(state, full, open) {
      await expect(key).toHaveAttribute("aria-expanded", String(open));
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.fullscreenElement ===
              document.querySelector(".track-panel"),
          ),
        )
        .toBe(full);
      await key.scrollIntoViewIfNeeded();
      const measure = () =>
        page.locator(".scene").evaluate((scene) => {
          const rect = (node) => {
            const b = node.getBoundingClientRect();
            return {
              x: b.x,
              y: b.y,
              right: b.right,
              bottom: b.bottom,
              width: b.width,
              height: b.height,
            };
          };
          const visible = (nodes) =>
            [...nodes].filter(
              (node) => !node.hidden && node.getBoundingClientRect().width > 0,
            );
          const labels = visible(
            scene.querySelectorAll(".event-marker, .ghost-tag"),
          ).map((node) => ({ name: node.textContent, ...rect(node) }));
          const key = rect(scene.querySelector(".legend"));
          const canvas = rect(scene.querySelector("canvas"));
          const overlaps = (a, b) =>
            a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
          const corner = scene.querySelector('[aria-label="Inspect corner 1"]');
          const box = rect(corner);
          return {
            canvas,
            key,
            labels,
            cornerOne: {
              ...box,
              clickable: corner.contains(
                document.elementFromPoint(
                  box.x + box.width / 2,
                  box.y + box.height / 2,
                ),
              ),
            },
            separated: labels.every(
              (label, i) =>
                !overlaps(label, key) &&
                labels.slice(i + 1).every((other) => !overlaps(label, other)),
            ),
            contained: labels.every(
              (label) =>
                label.x >= canvas.x &&
                label.right <= canvas.right &&
                label.y >= canvas.y &&
                label.bottom <= canvas.bottom,
            ),
            scrollWidth: document.documentElement.scrollWidth,
          };
        });
      await expect
        .poll(async () => {
          const data = await measure();
          return data.separated && data.contained && data.labels.length > 0;
        })
        .toBe(true);
      const metrics = await measure();
      await panel.screenshot({
        path: `artifacts/track-key-${width}-${state}.png`,
      });
      const finding = {
        width,
        height,
        state,
        full,
        open,
        cursor: 20,
        requests,
        errors,
        ...metrics,
        passed: false,
      };
      findings.push(finding);
      await expect(cursor).toHaveAttribute("value", "20");
      expect(
        await originalCanvas.evaluate(
          (node) => node === document.querySelector("canvas"),
        ),
      ).toBe(true);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      expect(metrics.scrollWidth).toBe(width);
      if (!open) expect(metrics.cornerOne.clickable).toBe(true);
      finding.passed = true;
    }
    await capture("default", false, width >= 480);
    await enter.click();
    await capture(
      "fullscreen-default",
      true,
      width >= 480 && height >= 350 + 68,
    );
    if ((await key.getAttribute("aria-expanded")) === "true") await key.click();
    await capture("fullscreen-collapsed", true, false);
    await key.click();
    await capture("fullscreen-expanded", true, true);
    await exit.click();
    await key.click();
    await capture("collapsed", false, false);
    expect(await project(page)).toEqual(before);
    await page.close();
  }
} finally {
  await writeFile(
    "artifacts/track-key-qa.json",
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
