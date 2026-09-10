/* global document, window, DOMException */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";

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
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
    [780, 390],
  ]) {
    for (const outcome of ["success", "failure"]) {
      const page = await browser.newPage({
        viewport: { width, height },
        locale: "en-US",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.addInitScript(
        ({ outcome }) => {
          const Native = window.AudioContext,
            resume = Native.prototype.resume;
          const probe = { attempts: 0, contexts: 0 };
          window.audioOrdering = probe;
          window.AudioContext = class extends Native {
            constructor() {
              super();
              probe.contexts++;
            }
          };
          Native.prototype.resume = function () {
            if (++probe.attempts === 1)
              return new Promise((resolve, reject) => {
                probe.release = async () => {
                  if (outcome === "success") {
                    await resume.call(this);
                    resolve();
                  } else
                    reject(
                      new DOMException(
                        "Original delayed audio failure",
                        "NotAllowedError",
                      ),
                    );
                };
              });
            return resume.call(this);
          };
        },
        { outcome },
      );
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const cursor = page.getByRole("slider", {
        name: "Lap playback position",
      });
      await cursor.fill("20");
      const before = await project(page);
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      const enable = page.getByRole("button", {
        name: "Enable engine audio",
        exact: true,
      });
      const mute = page.getByRole("button", {
        name: "Mute audio",
        exact: true,
      });
      await enable.click();
      await expect
        .poll(() => page.evaluate(() => !!window.audioOrdering.release))
        .toBe(true);
      await enable.click();
      await expect(mute).toBeVisible();
      if (outcome === "success") await mute.click();
      await page.evaluate(() => window.audioOrdering.release());
      expect(await project(page)).toEqual(before);
      const control = outcome === "success" ? enable : mute;
      await expect(control).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      if (outcome === "success")
        await expect(
          page.getByText(
            "Procedural engine audio enabled · play the lap to listen",
            { exact: true },
          ),
        ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Dismiss notification" }),
      ).toBeHidden();
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      await expect(cursor).toHaveAttribute("value", "20");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      expect(requests).toBe(0);
      expect(errors).toEqual([]);
      const state =
        outcome === "success"
          ? "muted-after-late-success"
          : "enabled-after-late-failure";
      await page.screenshot({
        path: `artifacts/audio-ordering-${width}-${state}.png`,
      });
      if (width === 1600 || width === 390)
        await page.screenshot({
          path: `artifacts/audio-ordering-${width}-${state}-workspace.png`,
          fullPage: true,
        });
      const probe = await page.evaluate(() => ({
        attempts: window.audioOrdering.attempts,
        contexts: window.audioOrdering.contexts,
      }));
      expect(probe).toEqual({ attempts: 2, contexts: 1 });
      findings.push({
        width,
        height,
        state,
        control: await control.getAttribute("aria-label"),
        box,
        cursor: 20,
        projectPreserved: true,
        requests,
        errors,
        ...probe,
      });
      await page.close();
    }
  }
} finally {
  await writeFile(
    "artifacts/audio-ordering-qa.json",
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
