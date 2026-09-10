/* global document, createImageBitmap, OffscreenCanvas, fetch */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const original = JSON.parse(
  await readFile("data/tracks/ardennes-development.json", "utf8"),
);
const sparse = {
  ...original,
  id: "terrain-slope-40",
  name: "Original sloped circle 40",
  provenance:
    "Original analytic R500 m circle, y=140 sin(theta); synthetic terrain validation, no surveyed data.",
  points: Array.from({ length: 40 }, (_, i) => {
    const theta = (i * 2 * Math.PI) / 40;
    return {
      x: 500 * Math.cos(theta),
      z: 500 * Math.sin(theta),
      y: 140 * Math.sin(theta),
      widthLeft: 8,
      widthRight: 8,
      banking: 0,
    };
  }),
};
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
async function bluePixels(page) {
  const png = await page
    .locator(".scene canvas")
    .screenshot({
      style:
        ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
    });
  return page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${base64}`)).blob(),
    );
    try {
      const copy = new OffscreenCanvas(bitmap.width, bitmap.height),
        context = copy.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      ).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          pixels[i + 2] > pixels[i] + 35 &&
          pixels[i + 2] > pixels[i + 1] + 25
        )
          count++;
      return count;
    } finally {
      bitmap.close();
    }
  }, png.toString("base64"));
}
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
  ])
    for (const source of [original, sparse]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.setDefaultTimeout(30000);
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      if (source.id !== original.id) {
        await page
          .getByLabel("Import track file", { exact: true })
          .setInputFiles({
            name: "terrain-slope.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(source)),
          });
        await expect(
          page.getByRole("combobox", { name: "Track", exact: true }),
        ).toHaveValue(source.id);
      }
      const cursor = page.locator('[aria-label="Lap playback position"]');
      await cursor.fill("20");
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const before = await project(page),
        canvas = await page.locator("canvas").elementHandle();
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      if (source.id === sparse.id) {
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Braking zones", exact: true })
          .uncheck();
      }
      async function capture(mode, terrain) {
        await page
          .getByRole("tab", { name: "Track View", exact: true })
          .click();
        await page
          .locator(".track-panel")
          .screenshot({
            path: `artifacts/terrain-${width}-${source.id}-${mode.replaceAll(" ", "-")}-${terrain ? "on" : "off"}.png`,
          });
        const pixels = await bluePixels(page);
        const finding = {
          width,
          height,
          source: source.id,
          mode,
          terrain,
          pixels,
          cursor: 20,
          requests,
          errors,
          passed: false,
        };
        findings.push(finding);
        expect(
          await canvas.evaluate(
            (node) => node === document.querySelector("canvas"),
          ),
        ).toBe(true);
        await expect(cursor).toHaveAttribute("value", "20");
        expect(requests).toBe(0);
        expect(errors).toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        finding.passed = true;
        return pixels;
      }
      for (const mode of ["Top View", "3D View"]) {
        await page.getByRole("button", { name: mode, exact: true }).click();
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Terrain & trees", exact: true })
          .uncheck();
        const without = await capture(mode, false);
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Terrain & trees", exact: true })
          .check();
        const withTerrain = await capture(mode, true);
        expect(without).toBeGreaterThan(100);
        expect(withTerrain / without).toBeGreaterThan(0.98);
      }
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      await capture("Chase", true);
      expect(await project(page)).toEqual(before);
      await page.close();
    }
} finally {
  await writeFile(
    "artifacts/terrain-qa.json",
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
