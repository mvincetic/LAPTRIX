/* global File, Blob, performance, requestAnimationFrame */
import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const records = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  const urls = await page.evaluate(() =>
    Object.fromEntries(
      ["timingCsv.ts", "comparison-report.ts", "comparison-csv.ts"].map(
        (file) => [
          file,
          performance
            .getEntriesByType("resource")
            .find((entry) => entry.name.split("?")[0].endsWith(`/${file}`))
            ?.name,
        ],
      ),
    ),
  );
  expect(Object.values(urls).every(Boolean)).toBe(true);
  const session = await page.context().newCDPSession(page);
  for (const rate of [1, 6]) {
    await session.send("Emulation.setCPUThrottlingRate", { rate });
    for (const kind of [
      "ordinary",
      "twenty-thousand",
      "large-notes",
      "many-columns",
      "long-fields",
      "native-pair",
      "large-native-pair",
      "large-timing-pair",
    ]) {
      for (let repeat = 0; repeat < 3; repeat++) {
        const measured = await page.evaluate(
          async ({ urls, kind }) => {
            const { parseTimingCsv, prepareTimingCsv, timingCsvReference } =
              await import(urls["timingCsv.ts"]);
            const { buildComparisonReport } = await import(
              urls["comparison-report.ts"]
            );
            const { comparisonReportCsv } = await import(
              urls["comparison-csv.ts"]
            );
            const fingerprint = `sha256:${"a".repeat(64)}`;
            if (!kind.endsWith("pair")) {
              const count =
                kind === "ordinary" ? 721 : kind === "long-fields" ? 50 : 20000;
              const columns =
                kind === "many-columns"
                  ? 64
                  : ["large-notes", "long-fields"].includes(kind)
                    ? 3
                    : 2;
              const note =
                kind === "long-fields"
                  ? "a".repeat(98000)
                  : kind === "large-notes"
                    ? '"Original note, with ""quotes""\n' +
                      "a".repeat(170) +
                      '"'
                    : "abc";
              const source = [
                [
                  "time_s",
                  "source_progress",
                  ...Array.from(
                    { length: columns - 2 },
                    (_, i) => `original_note_${i}`,
                  ),
                ].join(","),
                ...Array.from({ length: count }, (_, i) => {
                  const progress = i / (count - 1);
                  return [
                    90 * progress,
                    progress,
                    ...Array.from({ length: columns - 2 }, (_, column) =>
                      kind === "many-columns"
                        ? column < 23
                          ? "abc"
                          : "ab"
                        : note,
                    ),
                  ].join(",");
                }),
              ].join("\r\n");
              const file = new File([source], "original-workload.csv", {
                type: "text/csv",
              });
              if (file.size > 5_000_000)
                throw new Error(`Fixture exceeds file limit: ${file.size}`);
              const readStart = performance.now();
              const text = await file.text();
              const readMs = performance.now() - readStart;
              const parseStart = performance.now();
              const table = parseTimingCsv(text);
              const parseMs = performance.now() - parseStart;
              const conversionStart = performance.now();
              const data = prepareTimingCsv(table, {
                timeColumn: 0,
                progressColumn: 1,
                timeUnit: "s",
                progressUnit: "fraction",
              });
              const conversionMs = performance.now() - conversionStart;
              const validationStart = performance.now();
              const reference = timingCsvReference(
                data,
                {
                  label: "Original workload",
                  vehicleLabel: "Synthetic fixture",
                  origin: "external-simulation",
                  source:
                    "Original numerical timing workload for profiling only.",
                },
                "original-workload",
                fingerprint,
              );
              const validationMs = performance.now() - validationStart;
              if (
                reference.samples.length !== count ||
                reference.lapTime !== 90 ||
                reference.alignment.progress.at(-1) !== 1
              )
                throw new Error("Import result changed");
              return {
                kind,
                count,
                columns,
                bytes: file.size,
                readMs,
                parseMs,
                conversionMs,
                validationMs,
              };
            }
            const lap = (count, duration, distinct = false) => {
              const progress = Array.from(
                { length: count },
                (_, i) => (i / (count - 1)) ** (distinct ? 1.0002 : 1),
              );
              return {
                schemaVersion: 1,
                trackId: "original-workload",
                vehicleId: "original-fixture",
                setup: {},
                model: "Original analytical workload; not a simulation result",
                verticalDynamics: "quasi-steady-road-normal-v1",
                lapTime: duration,
                length: 6000,
                maxSpeed: 6000 / duration,
                averageSpeed: 6000 / duration,
                elevationRange: 0,
                computationMs: 0,
                warnings: [],
                optimization: {
                  method: "Fixture",
                  converged: true,
                  iterations: 0,
                },
                corners: [],
                sectors: [],
                alignment: { trackFingerprint: fingerprint, progress },
                samples: progress.map((p, i) => ({
                  time: p * duration,
                  distance: p * 6000,
                  x: (Math.cos(p * 2 * Math.PI) * 6000) / (2 * Math.PI),
                  y: 0,
                  z:
                    i === count - 1
                      ? 0
                      : (Math.sin(p * 2 * Math.PI) * 6000) / (2 * Math.PI),
                  speed: 6000 / duration,
                  rpm: 4000,
                  gear: 3,
                  throttle: 0.5,
                  brake: 0.2,
                  steering: 0.1,
                  longitudinalG: -0.2,
                  lateralG: 1,
                  verticalG: 0.1,
                  normalLoadG: 1.3,
                  trackGradient: 0,
                  offset: 0,
                  cornerId: 1,
                  sectorId: 1,
                })),
              };
            };
            const current = lap(kind === "native-pair" ? 721 : 2001, 80);
            const reference =
              kind === "large-timing-pair"
                ? {
                    format: "laptrix-timing-reference-v1",
                    label: "Original timing workload",
                    vehicleLabel: "Original fixture",
                    origin: "external-simulation",
                    source:
                      "Original numerical workload; no measured recording",
                    trackId: current.trackId,
                    lapTime: 90,
                    units: { time: "s", progress: "fraction" },
                    alignment: {
                      trackFingerprint: fingerprint,
                      progress: Array.from(
                        { length: 20000 },
                        (_, i) => i / 19999,
                      ),
                    },
                    samples: Array.from({ length: 20000 }, (_, i) => ({
                      time: (i / 19999) * 90,
                    })),
                  }
                : lap(
                    kind === "native-pair" ? 721 : 2001,
                    90,
                    kind !== "native-pair",
                  );
            const reportStart = performance.now();
            const report = buildComparisonReport(
              current,
              reference,
              "2026-09-10T18:56:00.000Z",
            );
            const reportMs = performance.now() - reportStart;
            const jsonStart = performance.now(),
              json = JSON.stringify(report, null, 2),
              jsonMs = performance.now() - jsonStart;
            const csvStart = performance.now(),
              csv = comparisonReportCsv(report),
              csvMs = performance.now() - csvStart;
            const rows = csv.split("\r\n");
            rows.pop();
            rows.shift();
            if (
              rows.length !== report.samples.length ||
              !rows.every((row, i) =>
                row
                  .split(",")
                  .slice(0, 4)
                  .every(
                    (value, col) =>
                      Number(value) ===
                      [
                        report.samples[i].progress,
                        report.samples[i].current.time,
                        report.samples[i].reference.time,
                        report.samples[i].deltaTime,
                      ][col],
                  ),
              )
            )
              throw new Error("Export timing changed");
            return {
              kind,
              currentSamples: current.samples.length,
              referenceSamples: reference.samples.length,
              rows: rows.length,
              jsonBytes: new Blob([json]).size,
              csvBytes: new Blob([csv]).size,
              reportMs,
              jsonMs,
              csvMs,
            };
          },
          { urls, kind },
        );
        const row = { rate, repeat, ...measured };
        records.push(row);
        process.stdout.write(JSON.stringify(row) + "\n");
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
      }
    }
  }
  await writeFile(
    "artifacts/csv-workload-profile.json",
    JSON.stringify(
      {
        scope:
          "Local Chromium helper timings; fixtures are original function benchmarks, not imported native laps or measured recordings. Read time excludes disk access. CPU slowdown is synthetic.",
        records,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
