/* global document */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(
  await readFile("data/tracks/ardennes-development.json", "utf8"),
);
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
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
  for (const width of [1600, 1280, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const initial = await project(page);
    const response = await page.request.post(
      "http://127.0.0.1:5173/api/simulate",
      {
        data: {
          trackId: source.id,
          vehicleId: initial.lap.vehicleId,
          setup: { ...initial.lap.setup, solver: "centerline" },
        },
      },
    );
    expect(response.ok()).toBe(true);
    const original = await response.json();
    const shift = original.corners[1].apexIndex;
    const track = {
      ...source,
      id: "corner-seam-circuit",
      name: "Start-rotated development circuit",
      points: [...source.points.slice(shift), ...source.points.slice(0, shift)],
    };
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Solver mode" })
      .selectOption("centerline");
    await page.getByLabel("Import track file", { exact: true }).setInputFiles({
      name: "corner-seam.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(track)),
    });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(track.id);
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await project(page);
    const { lap } = before;
    const corner = lap.corners.find((item) => item.apexIndex === 0);
    expect(corner.entryIndex).toBeGreaterThan(corner.exitIndex);
    await page.getByRole("button", { name: "Top View", exact: true }).click();
    await page
      .getByRole("button", { name: `Select corner ${corner.id}`, exact: true })
      .click();
    await expect(page.getByTestId("corner-seam-note")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Dismiss notification" }),
    ).toBeHidden();
    await page
      .locator(".corner-detail")
      .screenshot({ path: `artifacts/corner-seam-detail-${width}.png` });
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    for (const [label, key] of [
      ["Brake", "brakingIndex"],
      ["Turn-in", "turnInIndex"],
      ["Apex", "apexIndex"],
      ["Throttle", "throttleIndex"],
    ]) {
      await page
        .locator(".corner-events")
        .getByRole("button", { name: new RegExp(`^${label}`) })
        .click();
      const expected = lap.samples[corner[key]].time;
      await expect(
        page.getByRole("slider", { name: "Lap playback position" }),
      ).toHaveAttribute("value", String(expected));
      await page.locator(".scene").scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          page.locator(".event-marker").evaluateAll((nodes) => {
            const scene = document
              .querySelector(".scene canvas")
              .getBoundingClientRect();
            const boxes = nodes.map((node) => node.getBoundingClientRect());
            return (
              nodes.length === 3 &&
              nodes.every(
                (node, i) =>
                  !node.hidden && boxes[i].width > 0 && boxes[i].height > 0,
              ) &&
              boxes.every(
                (box, i) =>
                  box.left >= scene.left &&
                  box.right <= scene.right &&
                  box.top >= scene.top &&
                  box.bottom <= scene.bottom &&
                  boxes
                    .slice(i + 1)
                    .every(
                      (other) =>
                        box.right <= other.left ||
                        other.right <= box.left ||
                        box.bottom <= other.top ||
                        other.bottom <= box.top,
                    ),
              )
            );
          }),
        )
        .toBe(true);
      const metrics = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        glError: document
          .querySelector(".scene canvas")
          .getContext("webgl2")
          .getError(),
      }));
      expect(metrics.width).toBe(width);
      expect(metrics.glError).toBe(0);
      await page.screenshot({
        path: `artifacts/corner-seam-${width}-${label.toLowerCase()}.png`,
        fullPage: true,
      });
      findings.push({
        width,
        event: label,
        index: corner[key],
        time: expected,
        ...metrics,
      });
    }
    expect(await project(page)).toEqual(before);
    expect(requests).toBe(0);
    expect(errors).toEqual([]);
    await page.close();
  }
  await writeFile(
    "artifacts/corner-seam-qa.json",
    JSON.stringify(findings, null, 2),
  );
  console.log(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
