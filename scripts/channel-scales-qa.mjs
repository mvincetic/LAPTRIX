/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import source from "../data/tracks/ardennes-development.json" with { type: "json" };

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
async function zeroAlignment(page, key) {
  const text = await page
    .getByTestId(`channel-scale-${key}`)
    .locator("span")
    .filter({ hasText: /^0$/ })
    .boundingBox();
  const line = await page.getByTestId(`channel-zero-${key}`).boundingBox();
  const error = Math.abs(text.y + text.height / 2 - line.y - line.height / 2);
  expect(error).toBeLessThan(0.6);
  return error;
}
try {
  for (const [width, height] of [
    [1920, 1080],
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
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("http://127.0.0.1:5173/");
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
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByTestId("sampling-summary")).toContainText(
      "1,121 samples",
    );
    await page.locator(".advanced summary").click();
    const dismiss = page.getByRole("button", { name: "Dismiss notification" });
    if (await dismiss.isVisible()) await dismiss.click();
    const panel = page.getByRole("region", {
      name: "Telemetry graphs",
      exact: true,
    });
    const scaleLabels = () =>
      page
        .locator('[data-testid^="channel-scale-"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("aria-label")),
        );
    const currentScales = await scaleLabels();
    await panel.screenshot({
      path: `artifacts/channel-scales-current-${width}.png`,
    });
    await page
      .getByRole("checkbox", { name: "Reference traces", exact: true })
      .check();
    const referenceScales = await scaleLabels();
    const fullAlignment = await zeroAlignment(page, "lateralG");
    await panel.screenshot({
      path: `artifacts/channel-scales-reference-${width}.png`,
    });
    await page
      .getByRole("combobox", { name: "Plot range", exact: true })
      .selectOption("2");
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await page
      .getByRole("button", { name: "Inspect start", exact: true })
      .click();
    const chart = page.getByRole("img", { name: /Synchronized speed/ });
    const box = await chart.boundingBox();
    await chart.click({ position: { x: box.width / 2, y: box.height / 2 } });
    const sectorAlignment = await zeroAlignment(page, "lateralG");
    expect(await scaleLabels()).toEqual(referenceScales);
    await panel.screenshot({
      path: `artifacts/channel-scales-sector-${width}.png`,
    });
    if (width === 1920 || width === 390)
      await page.screenshot({
        path: `artifacts/channel-scales-workspace-${width}.png`,
        fullPage: true,
      });
    const panelBox = await panel.boundingBox();
    const footerBox = await page.locator(".statusbar").boundingBox();
    const footerGap = footerBox.y - panelBox.y - panelBox.height;
    expect(footerGap).toBeGreaterThanOrEqual(0);
    let signedElevation = null;
    if (width === 1920) {
      const shifted = {
        ...source,
        id: "scale-elevation-development",
        name: "Signed elevation development circuit",
        provenance:
          "Original QA transformation of the synthetic development source; vertical origin shifted by 45 metres.",
        points: source.points.map((point) => ({ ...point, y: point.y - 45 })),
      };
      await page
        .getByLabel("Import track file", { exact: true })
        .setInputFiles({
          name: "signed-elevation.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(shifted)),
        });
      await expect(
        page.getByRole("combobox", { name: "Track", exact: true }),
      ).toHaveValue(shifted.id, { timeout: 60000 });
      if (await dismiss.isVisible()) await dismiss.click();
      signedElevation = {
        label: await page
          .getByTestId("channel-scale-y")
          .getAttribute("aria-label"),
        zeroAlignment: await zeroAlignment(page, "y"),
      };
      await panel.screenshot({
        path: "artifacts/channel-scales-signed-elevation-1920.png",
      });
    }
    findings.push({
      width,
      height,
      currentScales,
      referenceScales,
      fullAlignment,
      sectorAlignment,
      footerGap,
      signedElevation,
      cursorText: await page
        .getByRole("slider", { name: "Lap playback position" })
        .getAttribute("aria-valuetext"),
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/channel-scales-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
