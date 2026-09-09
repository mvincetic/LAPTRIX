/* global document */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
try {
  for (const width of [1600, 1280, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const initial = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/simulate") &&
        response.request().postDataJSON()?.setup.solver === "optimized",
    );
    await page.goto("http://127.0.0.1:5173/");
    const formula = await (await initial).json();
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page.getByRole("checkbox", { name: "Show reference ghost" }).check();
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const time = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    await time.fill("20");
    await time.press("Enter");
    await page.locator(".track-panel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/ghost-controls-${width}.png` });
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/ghost-orbit-${width}.png` });
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await page.waitForTimeout(400);
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/ghost-top-${width}.png` });
    await time.fill("3");
    await time.press("Enter");
    await page.getByRole("button", { name: "Chase", exact: true }).click();
    await page.waitForTimeout(600);
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/ghost-chase-${width}.png` });
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await time.fill(String(formula.lapTime + 3));
    await time.press("Enter");
    await page.waitForTimeout(400);
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/ghost-finish-${width}.png` });
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            format: "laptrix-timing-reference-v1",
            label: "Timing QA fixture",
            vehicleLabel: "Formula timing",
            origin: "external-simulation",
            source: "Original visual QA fixture, no positions",
            trackId: formula.trackId,
            lapTime: formula.lapTime,
            units: { time: "s", progress: "fraction" },
            alignment: formula.alignment,
            samples: formula.samples.map(({ time }) => ({ time })),
          }),
        ),
      });
    await expect(
      page.getByRole("checkbox", { name: "Show reference ghost" }),
    ).toBeDisabled();
    await page
      .locator(".track-panel")
      .screenshot({ path: `artifacts/ghost-timing-${width}.png` });
    findings.push({
      width,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/reference-ghost-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
