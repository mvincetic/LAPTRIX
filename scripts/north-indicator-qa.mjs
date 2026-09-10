/* global document, requestAnimationFrame */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    let requests = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/simulate")) requests++;
    });
    const compass = page.getByRole("img", { name: /^North / });
    const arrow = compass.locator("svg");
    const angle = () =>
      arrow.evaluate((e) =>
        Number.parseFloat(
          e.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1] ?? "NaN",
        ),
      );
    const capture = async (mode) => {
      await page
        .locator(".scene")
        .screenshot({ path: `artifacts/north-${mode}-${width}.png` });
      await compass.screenshot({
        path: `artifacts/north-arrow-${mode}-${width}.png`,
      });
      findings.push({
        width,
        height,
        mode,
        angle: await angle(),
        label: await compass.getAttribute("aria-label"),
        cursor: await cursor.inputValue(),
        requests,
        scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      });
    };
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await expect.poll(angle).toBe(0);
    await capture("top");
    const box = await page.locator(".scene canvas").boundingBox();
    const start = { x: box.x + box.width * 0.8, y: box.y + box.height * 0.65 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - box.width * 0.35, start.y, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => {
        const before = await angle();
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        return before === (await angle()) && before !== 0;
      })
      .toBe(true);
    await capture("rotated");
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await expect.poll(angle).toBe(0);
    await capture("reset");
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await expect.poll(angle).not.toBe(0);
    await capture("chase20");
    const previous = await angle();
    await cursor.fill("40");
    await expect.poll(angle).not.toBe(previous);
    await capture("chase40");
    expect(requests).toBe(0);
    findings.push({ width, errors });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/north-indicator-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
