/* global document */
import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
  locale: "en-US",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto("http://127.0.0.1:5173/");
await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
const refined = process.argv.includes("--refinement");
const sampled = process.argv.includes("--sampling");
const gt = process.argv.includes("--gt");
const imported = process.argv.includes("--reference");
const delta = process.argv.includes("--delta");
const project = process.argv.includes("--project");
const sweep = process.argv.includes("--sweep");
const prefix = `${project ? "project-" : ""}${delta ? "delta-" : ""}${imported ? "reference-" : ""}${gt ? "gt-" : ""}${sampled ? "sampling-" : ""}${refined ? "refinement-" : ""}`;
if (gt) {
  await page
    .getByRole("button", { name: "Set reference", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await page
    .getByTestId("result-vehicle")
    .filter({ hasText: "GT Development 01" })
    .waitFor({ timeout: 60000 });
}
if (sampled) {
  await page.locator(".advanced summary").click();
  await page
    .getByRole("combobox", { name: "Spatial sampling" })
    .selectOption("5m");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await page
    .getByTestId("sampling-summary")
    .filter({ hasText: "1,121 samples" })
    .waitFor({ timeout: 60000 });
}
if (refined) {
  await page
    .getByRole("combobox", { name: "Solver mode" })
    .selectOption("lap-time");
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await page.getByTestId("refinement-summary").waitFor({ timeout: 60000 });
}
if (imported) {
  const result = await page.request.post("http://127.0.0.1:5173/api/simulate", {
    data: { vehicleId: "formula-development" },
  });
  const lap = await result.json();
  const reference = {
    format: "laptrix-timing-reference-v1",
    label: "Formula baseline · imported",
    vehicleLabel: "Formula Development 01",
    origin: "external-simulation",
    source:
      "LAPTRIX Formula Development 01 export; synthetic development model.",
    trackId: lap.trackId,
    lapTime: lap.lapTime,
    units: { time: "s", progress: "fraction" },
    alignment: lap.alignment,
    samples: lap.samples.map((s) => ({ time: s.time })),
  };
  await page
    .getByLabel("Import reference file", { exact: true })
    .setInputFiles({
      name: "formula-reference.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(reference)),
    });
  await page
    .getByTestId("reference-vehicle")
    .filter({ hasText: "Formula baseline · imported" })
    .waitFor();
}
if (project) {
  await page.getByLabel("Project name").fill("Portable development study");
  await page.getByRole("button", { name: "Additional actions" }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await downloading).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  await page.reload();
  await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
  await page.getByLabel("Import project file", { exact: true }).setInputFiles({
    name: "portable-study.json",
    mimeType: "application/json",
    buffer: Buffer.concat(chunks),
  });
  await page
    .getByText("Project imported and recalculated", { exact: true })
    .waitFor({ timeout: 60000 });
}
await page.waitForTimeout(2500);
if (sweep) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Compare aero settings", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Compare aero settings" });
  await dialog
    .getByRole("button", { name: "Run comparison", exact: true })
    .click();
  await dialog
    .getByTestId("aero-status")
    .filter({ hasText: "Comparison complete" })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: `artifacts/sweep-${prefix}desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `artifacts/sweep-${prefix}mobile.png` });
  console.log(
    "Sweep dialog width",
    await dialog.evaluate((element) => ({
      width: element.clientWidth,
      scroll: element.scrollWidth,
    })),
  );
  const downloading = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export study JSON" }).click();
  await (await downloading).saveAs(`artifacts/sweep-${prefix}study.json`);
  await dialog.getByRole("button", { name: "Apply selected result" }).click();
  await page.setViewportSize({ width: 1600, height: 1000 });
}
if (delta)
  await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
await page.screenshot({
  path: `artifacts/${prefix}desktop.png`,
  fullPage: true,
});
if (imported) {
  await page.locator("details.reference-provenance summary").click();
  await page.screenshot({
    path: `artifacts/${prefix}source-details.png`,
    fullPage: true,
  });
  await page.locator("details.reference-provenance summary").click();
}
if (project) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page.screenshot({
    path: `artifacts/${prefix}desktop-actions.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close actions", exact: true })
    .click();
}
for (const width of [1280, 900]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `artifacts/${prefix}viewport-${width}.png`,
    fullPage: true,
  });
}
console.log(
  JSON.stringify(
    {
      errors,
      lap: await page.getByTestId("lap-time").textContent(),
      canvas: await page.locator("canvas").count(),
      bodyWidth: await page.evaluate(() => document.body.scrollWidth),
    },
    null,
    2,
  ),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({
  path: `artifacts/${prefix}mobile.png`,
  fullPage: true,
});
console.log(
  "Mobile width",
  await page.evaluate(() => document.body.scrollWidth),
);
if (project) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page.screenshot({
    path: `artifacts/${prefix}mobile-actions.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close actions", exact: true })
    .click();
}
if (gt) {
  await page.locator(".vehicle-details summary").click();
  await page.screenshot({
    path: `artifacts/${prefix}mobile-vehicle-details.png`,
    fullPage: true,
  });
}
await page.setViewportSize({ width: 1600, height: 1000 });
await page
  .getByRole("button", { name: "Select corner 2", exact: true })
  .click();
await page.waitForTimeout(500);
await page.screenshot({
  path: `artifacts/${prefix}corner-inspection.png`,
  fullPage: true,
});
await page.getByRole("button", { name: "Chase", exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({
  path: `artifacts/${prefix}chase-camera.png`,
  fullPage: true,
});
console.log("Final browser errors", errors);
await browser.close();
