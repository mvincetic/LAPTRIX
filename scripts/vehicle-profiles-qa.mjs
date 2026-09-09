/* global document */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import formula from "../data/vehicles/formula-development.json" with { type: "json" };

await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
const profile = {
  ...formula,
  mass: 950,
  name: "User Formula study",
  assumptions: ["Original synthetic QA profile; no measured calibration."],
};
const file = (value) => ({
  name: "user-vehicle.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});
try {
  for (const width of [1600, 1280, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Import vehicle JSON", exact: true })
      .focus();
    await page.screenshot({ path: `artifacts/vehicle-actions-${width}.png` });
    await page.keyboard.press("Escape");
    const input = page.getByLabel("Import vehicle file", { exact: true });
    await input.setInputFiles(file(profile));
    await expect(page.getByTestId("result-vehicle")).toHaveText(profile.name, {
      timeout: 30000,
    });
    await page.getByText("Vehicle data & assumptions", { exact: true }).click();
    await page.locator(".vehicle-details").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/vehicle-profile-${width}.png` });
    const dismiss = page.getByRole("button", {
      name: "Dismiss notification",
      exact: true,
    });
    if (await dismiss.isVisible()) await dismiss.click();
    await page
      .locator(".vehicle-details")
      .screenshot({ path: `artifacts/vehicle-details-${width}.png` });
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page.getByRole("checkbox", { name: "Show reference ghost" }).check();
    await page.getByRole("tab", { name: "Cursor Data", exact: true }).click();
    await page.getByRole("button", { name: "Time", exact: true }).click();
    const time = page.getByRole("spinbutton", { name: "Inspect at time (s)" });
    await time.fill("20");
    await time.press("Enter");
    await page.locator(".track-panel").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `artifacts/vehicle-comparison-${width}.png`,
    });
    await input.setInputFiles(file({ ...profile, mass: 1e12 }));
    await expect(page.getByRole("alert")).toContainText(
      "Current workspace kept",
    );
    await page.getByRole("alert").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/vehicle-error-${width}.png` });
    const stress = {
      ...profile,
      id: "long-metadata-fixture",
      name: "V".repeat(100),
      description: "D".repeat(1000),
      assumptions: ["A".repeat(500)],
    };
    await input.setInputFiles(file(stress));
    await expect(page.getByTestId("result-vehicle")).toHaveText(stress.name);
    await page.locator(".vehicle-details").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/vehicle-long-metadata-${width}.png`,
    });
    findings.push({
      width,
      scrollWidth: await page.evaluate(() => document.body.scrollWidth),
      metadataOverflow: await page
        .locator(".vehicle-details-body, .lap-result")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            class: element.className,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          })),
        ),
      vehicleId: await page
        .getByRole("combobox", { name: "Car profile" })
        .inputValue(),
      lap: await page.getByTestId("lap-time").textContent(),
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/vehicle-profiles-qa.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings, null, 2));
