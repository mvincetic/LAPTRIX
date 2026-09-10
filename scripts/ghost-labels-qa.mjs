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
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("40.31");
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    async function capture(state, required = 2) {
      await page.locator(".scene").scrollIntoViewIfNeeded();
      await expect(
        page.getByRole("button", { name: "Dismiss notification" }),
      ).toBeHidden();
      await expect(cursor).toHaveAttribute("value", "40.31");
      const measure = () =>
        page.locator(".scene").evaluate((scene) => {
          const canvas = scene.querySelector("canvas").getBoundingClientRect();
          const rect = (box) => ({
            x: box.x - canvas.x,
            y: box.y - canvas.y,
            width: box.width,
            height: box.height,
          });
          const names = [...scene.querySelectorAll(".ghost-tag")]
            .filter((node) => !node.hidden)
            .map((node) => ({
              text: node.textContent,
              ...rect(node.getBoundingClientRect()),
              anchorX: Number(node.dataset.anchorX),
              anchorY: Number(node.dataset.anchorY),
            }));
          const obstacles = [
            ...scene.querySelectorAll(
              ".sector-label, .corner-marker, .start-marker, .event-marker, .legend, .viewer-popover, .scene-top-left, .compass, .scene-bottom",
            ),
          ]
            .filter((node) => !node.hidden)
            .map((node) => rect(node.getBoundingClientRect()))
            .filter((box) => box.width && box.height);
          const overlap = (a, b) =>
            Math.max(
              0,
              Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
            ) *
            Math.max(
              0,
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
            );
          return {
            names,
            width: canvas.width,
            height: canvas.height,
            overlap: names.reduce(
              (sum, name, index) =>
                sum +
                [...obstacles, ...names.slice(index + 1)].reduce(
                  (total, other) => total + overlap(name, other),
                  0,
                ),
              0,
            ),
            contained: names.every(
              (name) =>
                name.x >= 0 &&
                name.y >= 0 &&
                name.x + name.width <= canvas.width &&
                name.y + name.height <= canvas.height,
            ),
            scrollWidth: document.documentElement.scrollWidth,
            glError: scene
              .querySelector("canvas")
              .getContext("webgl2")
              .getError(),
          };
        });
      try {
        await expect
          .poll(async () => {
            const value = await measure();
            return (
              value.names.length >= required &&
              value.contained &&
              value.overlap === 0
            );
          })
          .toBe(true);
      } catch (error) {
        await writeFile(
          `artifacts/ghost-labels-${width}-${state}-failure.json`,
          JSON.stringify(await measure(), null, 2),
        );
        await page
          .locator(".scene")
          .screenshot({
            path: `artifacts/ghost-labels-${width}-${state}-failure.png`,
          });
        throw error;
      }
      const metrics = await measure();
      expect(metrics.scrollWidth).toBe(width);
      expect(metrics.glError).toBe(0);
      await page
        .locator(".scene")
        .screenshot({ path: `artifacts/ghost-labels-${width}-${state}.png` });
      findings.push({ viewport: { width, height }, state, ...metrics });
    }
    await capture("orbit");
    await page
      .getByRole("button", { name: "Select corner 2", exact: true })
      .click();
    await cursor.fill("40.31");
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await capture("top-corner");
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await capture("chase", 1);
    await page.getByRole("button", { name: "3D View", exact: true }).click();
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await capture("tools");
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }
  await writeFile(
    "artifacts/ghost-labels-qa.json",
    JSON.stringify(findings, null, 2),
  );
  console.log(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
