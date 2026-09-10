/* global document, window */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
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
    [780, 390],
    [390, 300],
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
    await expect(page.locator("canvas")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Top View", exact: true }),
    ).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    const canvas = await page.locator("canvas").elementHandle();
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const trigger = page.getByRole("button", {
      name: "Additional actions",
      exact: true,
    });
    const group = page.getByRole("group", { name: "Workspace actions" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const initialScroll = await page.evaluate(() => window.scrollY);
    async function capture(state) {
      const bounds = await group.evaluate((element) => {
        const b = element.getBoundingClientRect();
        return {
          top: b.top,
          bottom: b.bottom,
          left: b.left,
          right: b.right,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          scrollTop: element.scrollTop,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          pageScroll: window.scrollY,
          pageWidth: document.documentElement.scrollWidth,
        };
      });
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(height - 12);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.pageWidth).toBe(width);
      expect(bounds.scrollWidth).toBe(bounds.clientWidth);
      expect(bounds.pageScroll).toBe(initialScroll);
      await page.screenshot({
        path: `artifacts/actions-menu-${width}-${height}-${state}.png`,
      });
      findings.push({ width, height, state, ...bounds });
    }
    await capture("initial");
    const actions = group.getByRole("button");
    for (let i = 0; i < (await actions.count()); i++) {
      await page.keyboard.press("Tab");
      await expect(actions.nth(i)).toBeFocused();
      const box = await actions.nth(i).boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height - 12);
      expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
    }
    await capture("last-action");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await capture("reopened");
    await expect(page.getByRole("slider", { name: "Fuel load" })).toHaveValue(
      "21",
    );
    await expect(
      page.getByRole("slider", { name: "Lap playback position" }),
    ).toHaveValue("20");
    expect(
      await page
        .locator("canvas")
        .evaluate((element, original) => element === original, canvas),
    ).toBe(true);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }
  await writeFile(
    "artifacts/actions-menu-qa.json",
    JSON.stringify(findings, null, 2),
  );
  process.stdout.write(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
