/* global document, structuredClone */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
async function exported(page, action = "Export project") {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: action, exact: true }).click();
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
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    const before = await exported(page);
    await page
      .getByRole("slider", { name: "Lap playback position" })
      .fill("20");
    const group = page.getByRole("combobox", { name: "Graph channels" });
    const toggle = page.getByRole("checkbox", { name: "Reference traces" });
    const panel = page.getByRole("region", {
      name: "Telemetry graphs",
      exact: true,
    });
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    async function capture(state) {
      // Notifications expire; avoid racing a click against their automatic removal.
      await expect(
        page.getByRole("button", { name: "Dismiss notification" }),
      ).toBeHidden({ timeout: 15000 });
      await panel.screenshot({
        path: `artifacts/load-graphs-qa-${state}-${width}.png`,
      });
      findings.push({
        width,
        height,
        state,
        cursor: await page
          .getByRole("slider", { name: "Lap playback position" })
          .inputValue(),
        currentTraces: await page
          .locator('[data-testid^="current-trace-"]')
          .count(),
        referenceTraces: await page
          .locator('[data-testid^="reference-trace-"]')
          .count(),
        scrollWidth: await page.evaluate(() => document.body.scrollWidth),
        errors: [...errors],
      });
      expect(findings.at(-1).scrollWidth).toBe(width);
      expect(errors).toEqual([]);
    }
    await capture("overview");
    await group.selectOption("loads");
    await capture("current");
    await page.screenshot({
      path: `artifacts/load-graphs-qa-workspace-${width}.png`,
      fullPage: true,
    });
    await toggle.check();
    await capture("native-distance");
    await page.getByRole("button", { name: "Time", exact: true }).click();
    await capture("native-time");
    await page.getByRole("combobox", { name: "Plot range" }).selectOption("2");
    await capture("sector");
    await page
      .getByRole("combobox", { name: "Plot range" })
      .selectOption("all");
    expect(await exported(page)).toEqual(before);
    const legacy = structuredClone(before.reference);
    delete legacy.verticalDynamics;
    delete legacy.solverProvenance;
    delete legacy.numericalChecks.minNormalLoadG;
    for (const sample of legacy.samples) {
      sample.verticalG = 0;
      delete sample.normalLoadG;
    }
    async function importReference(reference) {
      await page
        .getByLabel("Import reference file", { exact: true })
        .setInputFiles({
          name: "reference.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(reference)),
        });
    }
    await importReference(legacy);
    await expect(page.getByTestId("reference-value-normalLoadG")).toHaveText(
      "R —",
    );
    await capture("legacy");
    const timing = await exported(page, "Export timing reference");
    await importReference(timing);
    await expect(toggle).toBeDisabled();
    await capture("timing");
    expect((await exported(page)).lap).toEqual(before.lap);
    expect(requests).toBe(0);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/load-graphs-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
