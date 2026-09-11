/* global window, document, performance, PerformanceObserver, MutationObserver, requestAnimationFrame, cancelAnimationFrame, File, Worker */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Original accepted inputs, written before measuring so Playwright can pass a
// real path instead of decoding a multi-megabyte base64 upload on the UI thread.
const fixtures = [];
for (const kind of ["ordinary", "large-notes", "long-fields"]) {
  const count = kind === "ordinary" ? 721 : kind === "large-notes" ? 20000 : 50;
  const note =
    kind === "long-fields"
      ? "a".repeat(98000)
      : '"Original note, with ""quotes""\n' + "a".repeat(170) + '"';
  const source = [
    "time_s,source_progress" + (kind === "ordinary" ? "" : ",original_note"),
    ...Array.from({ length: count }, (_, i) => {
      const progress = i / (count - 1);
      return `${90 * progress},${progress}${kind === "ordinary" ? "" : `,${note}`}`;
    }),
  ].join("\n");
  const bytes = Buffer.byteLength(source);
  expect(bytes).toBeLessThanOrEqual(5_000_000);
  const path = resolve(`artifacts/csv-review-${kind}.csv`);
  await writeFile(path, source);
  fixtures.push({ kind, count, bytes, path });
}
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    locale: "en-US",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const metrics = (window.csvReviewProfile = {
      active: false,
      frames: [],
      longTasks: [],
      workerReplies: [],
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          entry.startTime >= metrics.start &&
          (!metrics.end || entry.startTime < metrics.end)
        )
          metrics.longTasks.push({
            start: entry.startTime - metrics.start,
            duration: entry.duration,
          });
      }
    }).observe({ type: "longtask", buffered: true });
    const Original = Worker;
    window.Worker = class extends Original {
      constructor(url, options) {
        super(url, options);
        if (String(url).includes("timingCsv.worker"))
          this.addEventListener("message", (event) => {
            metrics.workerReplies.push({
              type: event.data.type,
              elapsed: performance.now() - metrics.start,
            });
          });
      }
    };
    // Ensure the UI's File reader is never the fallback path for review.
    const original = File.prototype.text;
    File.prototype.text = function () {
      if (this.name.startsWith("csv-review-"))
        throw new Error("CSV read escaped its worker");
      return original.call(this);
    };
    new MutationObserver(() => {
      if (
        metrics.active &&
        !metrics.end &&
        document.querySelector(".timing-csv-preview")
      )
        metrics.end = performance.now();
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener(
      "change",
      (event) => {
        if (event.target.getAttribute("aria-label") !== "Timing CSV file")
          return;
        metrics.start = performance.now();
        metrics.end = null;
        metrics.frames = [];
        metrics.longTasks = [];
        metrics.workerReplies = [];
        metrics.active = true;
        let previous = metrics.start;
        const tick = () => {
          const now = performance.now();
          metrics.frames.push(now - previous);
          previous = now;
          if (metrics.end) metrics.active = false;
          if (metrics.active) metrics.frame = requestAnimationFrame(tick);
        };
        metrics.frame = requestAnimationFrame(tick);
      },
      true,
    );
  });
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("slider", { name: "Fuel load" }).fill("21");
  await page.getByRole("slider", { name: "Lap playback position" }).fill("20");
  const session = await page.context().newCDPSession(page);
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) requests++;
  });
  for (const rate of [1, 6]) {
    await session.send("Emulation.setCPUThrottlingRate", { rate });
    for (const fixture of fixtures) {
      for (let repeat = 0; repeat < 3; repeat++) {
        await page.getByRole("button", { name: "Additional actions" }).click();
        await page
          .getByRole("button", { name: "Import timing CSV", exact: true })
          .click();
        await page
          .getByLabel("Timing CSV file", { exact: true })
          .setInputFiles(fixture.path);
        await expect(page.locator(".timing-csv-preview")).toContainText(
          `${fixture.count.toLocaleString("en-US")} records · 1:30.000`,
        );
        const metrics = await page.evaluate(async () => {
          const m = window.csvReviewProfile;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          m.active = false;
          cancelAnimationFrame(m.frame);
          return {
            elapsed: m.end - m.start,
            frameCount: m.frames.length,
            maxFrameGap: Math.max(...m.frames),
            longTasks: m.longTasks,
            workerReplies: m.workerReplies,
          };
        });
        expect(metrics.workerReplies.map((reply) => reply.type)).toEqual([
          "loaded",
          "prepared",
        ]);
        expect(metrics.frameCount).toBeGreaterThan(0);
        expect(metrics.elapsed).toBeGreaterThan(0);
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
          page.getByRole("slider", { name: "Fuel load" }),
        ).toHaveValue("21");
        await expect(
          page.getByRole("slider", { name: "Lap playback position" }),
        ).toHaveValue("20");
        const result = {
          kind: fixture.kind,
          bytes: fixture.bytes,
          records: fixture.count,
          rate,
          repeat,
          ...metrics,
        };
        records.push(result);
        process.stdout.write(JSON.stringify(result) + "\n");
      }
    }
  }
  expect(requests).toBe(0);
  expect(errors).toEqual([]);
  await writeFile(
    "artifacts/csv-review-profile.json",
    JSON.stringify({ records, requests, errors }, null, 2),
  );
} finally {
  await browser.close();
}
