/* global document */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const suffix = process.argv.includes("--baseline") ? "-baseline" : "";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
try {
  const findings = [];
  for (const width of [1600, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      locale: "en-US",
    });
    await page.goto("http://127.0.0.1:5173/");
    await page.getByTestId("lap-time").waitFor({ timeout: 60000 });
    await page.locator("canvas").waitFor({ timeout: 60000 });
    await page.waitForTimeout(500);
    const unnamed = {};
    for (const role of [
      "button",
      "textbox",
      "combobox",
      "slider",
      "spinbutton",
      "checkbox",
      "tab",
    ]) {
      unnamed[role] = await page
        .getByRole(role, { name: "", exact: true })
        .evaluateAll((nodes) => nodes.map((node) => node.outerHTML));
    }
    const trigger = page.getByRole("button", {
      name: "Additional actions",
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => ({
      label: document.activeElement?.getAttribute("aria-label"),
      text: document.activeElement?.textContent?.trim(),
    }));
    await page.screenshot({
      path: `artifacts/keyboard-actions-${width}${suffix}.png`,
    });
    await page.keyboard.press("Escape");
    const afterEscape = {
      expanded: await trigger.getAttribute("aria-expanded"),
      triggerFocused: await trigger.evaluate(
        (node) => node === document.activeElement,
      ),
    };
    findings.push({ width, unnamed, firstFocus, afterEscape });
    await page.close();
  }
  await writeFile(
    `artifacts/keyboard-audit${suffix}.json`,
    JSON.stringify(findings, null, 2),
  );
  console.log(JSON.stringify(findings, null, 2));
} finally {
  await browser.close();
}
