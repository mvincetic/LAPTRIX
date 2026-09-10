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
async function jsonDownload(page, action) {
  const pending = page.waitForEvent("download");
  await action();
  const chunks = [];
  for await (const chunk of await (await pending).createReadStream())
    chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  return { text, value: JSON.parse(text) };
}
async function project(page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  return (
    await jsonDownload(page, () =>
      page.getByRole("button", { name: "Export project", exact: true }).click(),
    )
  ).value;
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
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("40.31");
    await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    async function capture(state, expected) {
      const control = page.getByRole("button", {
        name: "Export full-lap comparison JSON",
        exact: true,
      });
      await expect(
        page.getByRole("button", { name: "Dismiss notification" }),
      ).toBeHidden();
      await control.scrollIntoViewIfNeeded();
      const downloaded = await jsonDownload(page, () => control.click());
      expect(downloaded.value.inputs).toEqual({
        current: expected.lap,
        reference: expected.reference,
      });
      expect(downloaded.value.scope).toBe("full-lap");
      const csvControl = page.getByRole("button", {
        name: "Export full-lap comparison CSV",
        exact: true,
      });
      const csvPending = page.waitForEvent("download");
      await csvControl.focus();
      await page.keyboard.press("Enter");
      const csvFile = await csvPending;
      expect(csvFile.suggestedFilename()).toBe("laptrix-comparison.csv");
      const csvChunks = [];
      for await (const chunk of await csvFile.createReadStream())
        csvChunks.push(chunk);
      const csv = Buffer.concat(csvChunks).toString();
      const csvLines = csv.split("\r\n");
      expect(csvLines.pop()).toBe("");
      const csvHeader = csvLines.shift().split(",");
      expect(csvHeader).toHaveLength(40);
      expect(csvLines).toHaveLength(downloaded.value.samples.length);
      expect(csvLines.map((line) => line.split(",").slice(0, 4))).toEqual(
        downloaded.value.samples.map((row) =>
          [
            row.progress,
            row.current.time,
            row.reference.time,
            row.deltaTime,
          ].map(String),
        ),
      );
      await expect(
        page.getByRole("slider", { name: "Lap playback position" }),
      ).toHaveAttribute("value", "40.31");
      const metrics = await page
        .locator(".telemetry-panel")
        .evaluate((panel) => {
          const buttons = [...panel.querySelectorAll(".comparison-export")];
          const boxes = buttons.map((button) => button.getBoundingClientRect());
          const bounds = panel.getBoundingClientRect();
          const chart = panel
            .querySelector(".delta-chart")
            .getBoundingClientRect();
          return {
            scrollWidth: document.documentElement.scrollWidth,
            buttons: boxes.map((box, i) => ({
              width: box.width,
              height: box.height,
              contained:
                box.left >= bounds.left &&
                box.right <= bounds.right &&
                buttons[i].scrollWidth <= buttons[i].clientWidth,
            })),
            buttonOverlap:
              Math.max(
                0,
                Math.min(boxes[0].right, boxes[1].right) -
                  Math.max(boxes[0].left, boxes[1].left),
              ) *
              Math.max(
                0,
                Math.min(boxes[0].bottom, boxes[1].bottom) -
                  Math.max(boxes[0].top, boxes[1].top),
              ),
            chartHeight: chart.height,
            chartWidth: chart.width,
            glError: document
              .querySelector(".scene canvas")
              .getContext("webgl2")
              .getError(),
          };
        });
      expect(metrics.scrollWidth).toBe(width);
      expect(metrics.buttons).toHaveLength(2);
      expect(metrics.buttons.every((button) => button.contained)).toBe(true);
      expect(metrics.buttonOverlap).toBe(0);
      expect(metrics.chartHeight).toBeGreaterThan(100);
      expect(metrics.glError).toBe(0);
      await page.locator(".telemetry-panel").screenshot({
        path: `artifacts/comparison-csv-${width}-${state}.png`,
      });
      await writeFile(
        `artifacts/comparison-csv-${width}-${state}.json`,
        downloaded.text,
      );
      await writeFile(`artifacts/comparison-csv-${width}-${state}.csv`, csv);
      if ((width === 1600 || width === 390) && state === "native-full")
        await page.screenshot({
          path: `artifacts/comparison-csv-${width}-workspace.png`,
          fullPage: true,
        });
      findings.push({
        width,
        height,
        state,
        rows: downloaded.value.samples.length,
        bytes: Buffer.byteLength(downloaded.text),
        csvBytes: Buffer.byteLength(csv),
        ...metrics,
      });
    }
    await capture("native-full", before);
    await page
      .getByRole("combobox", { name: "Plot range", exact: true })
      .selectOption("2");
    await page
      .getByRole("button", { name: "Loop sector", exact: true })
      .click();
    await capture("native-sector", before);
    expect(await project(page)).toEqual(before);
    const lap = before.lap;
    const timing = {
      format: "laptrix-timing-reference-v1",
      label:
        "Independent timing export fixture with a long session description and explicitly retained provenance",
      vehicleLabel: "Original timing fixture",
      origin: "external-simulation",
      source:
        "Original simulated timing scaled by ten percent for export visual QA",
      trackId: lap.trackId,
      lapTime: lap.lapTime * 1.1,
      units: { time: "s", progress: "fraction" },
      alignment: lap.alignment,
      samples: lap.samples.map(({ time }) => ({ time: time * 1.1 })),
    };
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "comparison-qa-timing.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(timing)),
      });
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      timing.label,
    );
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const timingBefore = await project(page);
    await capture("timing-sector", timingBefore);
    expect(await project(page)).toEqual(timingBefore);
    await expect(
      page.getByRole("status").filter({ hasText: "Playback loop:" }),
    ).toHaveText("Playback loop: Sector 2");
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }
  await writeFile(
    "artifacts/comparison-csv-qa.json",
    JSON.stringify(findings, null, 2),
  );
  console.log(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
