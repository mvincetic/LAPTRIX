/* global document, window, Worker */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
const prefix = process.env.CSV_QA_PREFIX ?? "timing-csv";
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
    await page.addInitScript(() => {
      const Original = Worker;
      let held = false;
      window.Worker = class extends Original {
        constructor(url, options) {
          super(url, options);
          this.addEventListener("message", (event) => {
            if (
              !String(url).includes("timingCsv.worker") ||
              held ||
              event.data.type !== "prepared"
            )
              return;
            held = true;
            event.stopImmediatePropagation();
            window.releaseCsvPreview = () => this.onmessage?.call(this, event);
          });
        }
      };
    });
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    const before = await project(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Import timing CSV", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Import timing CSV" });
    async function capture(state) {
      const layout = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect(),
          header = element.querySelector("header").getBoundingClientRect(),
          footer = element.querySelector("footer").getBoundingClientRect(),
          body = element.querySelector(".timing-csv-body");
        return {
          top: box.top,
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          headerTop: header.top,
          footerBottom: footer.bottom,
          clientWidth: body.clientWidth,
          scrollWidth: body.scrollWidth,
          bodyHeight: body.clientHeight,
          scrollHeight: body.scrollHeight,
          pageWidth: document.documentElement.scrollWidth,
        };
      });
      expect(layout.top).toBeGreaterThanOrEqual(0);
      expect(layout.bottom).toBeLessThanOrEqual(height);
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(width);
      expect(layout.headerTop).toBeGreaterThanOrEqual(0);
      expect(layout.footerBottom).toBeLessThanOrEqual(height);
      expect(layout.scrollWidth).toBe(layout.clientWidth);
      expect(layout.pageWidth).toBe(width);
      await page.screenshot({
        path: `artifacts/${prefix}-${width}-${state}.png`,
      });
      findings.push({ width, height, state, ...layout });
    }
    await capture("empty");
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Download simulated CSV example",
        exact: true,
      })
      .click();
    const chunks = [];
    for await (const chunk of await (await pending).createReadStream())
      chunks.push(chunk);
    const example = Buffer.concat(chunks);
    const lines = example.toString().split("\r\n");
    expect(lines[0]).toBe("time_s,source_progress");
    expect(lines.length).toBe(before.lap.samples.length + 1);
    const file = page.getByLabel("Timing CSV file", { exact: true });
    await file.setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("time_s,source_progress\n0,0\n20,0\n80,1"),
    });
    await expect(dialog.getByRole("alert")).toContainText("strictly increase");
    await capture("error");
    await file.setInputFiles({
      name: "original-simulated-example.csv",
      mimeType: "text/csv",
      buffer: example,
    });
    await expect(
      dialog.getByText("Preparing preview…", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", {
        name: "Import timing reference",
        exact: true,
      }),
    ).toBeDisabled();
    await page.waitForFunction(() => Boolean(window.releaseCsvPreview));
    await capture("preparing");
    await page.evaluate(() => window.releaseCsvPreview());
    await expect(dialog.locator(".timing-csv-preview")).toBeVisible();
    await capture("preview");
    await page
      .getByLabel("Reference label", { exact: true })
      .fill("Original simulated CSV example");
    await page
      .getByLabel("Vehicle label", { exact: true })
      .fill(before.lap.vehicle.name);
    await page
      .getByLabel("Declared origin", { exact: true })
      .selectOption("external-simulation");
    await page
      .getByLabel("Provenance and alignment", { exact: true })
      .fill(
        "LAPTRIX current calculated lap. Original simulated data on this source track; no measured recording.",
      );
    await page
      .getByRole("checkbox", { name: "CSV uses this source track" })
      .check();
    await capture("ready");
    await page
      .getByRole("button", { name: "Import timing reference", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Original simulated CSV example",
    );
    const after = await project(page);
    expect({ ...after, reference: before.reference }).toEqual(before);
    expect(after.reference.alignment).toEqual(before.lap.alignment);
    expect(after.reference.samples).toEqual(
      before.lap.samples.map(({ time }) => ({ time })),
    );
    await expect(
      page.getByRole("slider", { name: "Lap playback position" }),
    ).toHaveValue("20");
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `artifacts/${prefix}-${width}-imported.png`,
      fullPage: true,
    });
    findings.push({
      width,
      height,
      state: "imported",
      requests,
      errors,
      immutableCurrentWorkspace: true,
    });
    await page.close();
  }
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(findings, null, 2),
  );
  process.stdout.write(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
