/* global document */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("artifacts", { recursive: true });
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
    [780, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    const trigger = page.getByRole("button", { name: "Additional actions" });
    await trigger.click();
    const action = page.getByRole("button", {
      name: "Rename project",
      exact: true,
    });
    await action.focus();
    await page.screenshot({
      path: `artifacts/project-name-action-${width}.png`,
    });
    await action.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: "Rename project",
      exact: true,
    });
    const input = dialog.getByRole("textbox", {
      name: "Project name",
      exact: true,
    });
    await expect(input).toBeFocused();
    await input.fill("Ardennes · vehicle comparison");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `artifacts/project-name-dialog-${width}.png`,
    });
    const bounds = await dialog.boundingBox();
    await input.press("Enter");
    await expect(trigger).toBeFocused();
    await page.screenshot({
      path: `artifacts/project-name-applied-${width}.png`,
    });
    findings.push({
      width,
      height,
      bounds,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      projectName: await page
        .getByLabel("Project name", { exact: true })
        .inputValue(),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/project-name-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
