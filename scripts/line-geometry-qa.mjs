/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { gradedWideTrack } from "../tests/fixtures/line-geometry.ts";

const track = gradedWideTrack();
const file = {
  name: "graded-wide.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(track)),
};
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
    const pageErrors = [],
      consoleErrors = [],
      statuses = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") consoleErrors.push(e.text());
    });
    page.on("response", (r) => {
      if (r.url().endsWith("/api/simulate")) statuses.push(r.status());
    });
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("20");
    await page.getByRole("slider", { name: "Fuel load" }).fill("80");
    await page
      .getByLabel("Import track file", { exact: true })
      .setInputFiles(file);
    await expect(page.getByRole("alert")).toContainText("slope limit");
    const capture = async (mode) => {
      await page.screenshot({
        path: `artifacts/line-geometry-${mode}-${width}.png`,
        fullPage: true,
      });
      const alert = page.getByRole("alert");
      if (await alert.count())
        await alert.screenshot({
          path: `artifacts/line-geometry-alert-${mode}-${width}.png`,
        });
      findings.push({
        width,
        height,
        mode,
        cursor: await cursor.inputValue(),
        documentWidth: await page.evaluate(() => document.body.scrollWidth),
        lap: await page.getByTestId("lap-time").textContent(),
        error: (await alert.count()) ? await alert.textContent() : null,
      });
    };
    expect(await cursor.inputValue()).toBe("20");
    await capture("import-error");
    await page
      .getByRole("combobox", { name: "Solver mode" })
      .selectOption("centerline");
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Import track again", exact: true })
      .click();
    await (await chooser).setFiles(file);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(track.id);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await capture("centerline");
    await page
      .getByRole("combobox", { name: "Solver mode" })
      .selectOption("optimized");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("slope limit");
    await capture("run-error");
    findings.push({ width, pageErrors, consoleErrors, statuses });
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(width);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/line-geometry-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
