import { test, expect, type Page } from "@playwright/test";
import original from "../../data/tracks/ardennes-development.json" with { type: "json" };

async function downloadJson(page: Page, name: string) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return Buffer.concat(chunks);
}
const file = (name: string, buffer: Buffer) => ({
  name,
  mimeType: "application/json",
  buffer,
});

test("literal signed-zero source retains native and timing references through transport, Save and portable restore", async ({
  page,
  browser,
}) => {
  const source = {
    ...original,
    id: "signed-zero-development",
    name: "Signed-zero development circuit",
  };
  const text = JSON.stringify(source).replace('"banking":0', '"banking":-0');
  expect(Object.is(JSON.parse(text).points[0].banking, -0)).toBe(true);
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByLabel("Import track file", { exact: true })
    .setInputFiles(file("signed-zero.json", Buffer.from(text)));
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(source.id);
  const cursor = page.getByRole("slider", { name: "Lap playback position" });
  await cursor.fill("20");
  const before = JSON.parse(
    (await downloadJson(page, "Export project")).toString(),
  );
  let calculations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) calculations++;
  });
  // Both reference formats must restore against the still-unserialized in-memory source.
  for (const action of ["Export timing reference", "Export telemetry JSON"]) {
    const contents = await downloadJson(page, action);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles(file("zero-reference.json", contents));
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(
      page.getByText(
        action === "Export timing reference"
          ? "Imported simulation timing"
          : "Imported simulation export · zero-reference.json",
        { exact: false },
      ),
    ).toBeVisible();
    const exported = JSON.parse(
      (await downloadJson(page, "Export project")).toString(),
    );
    expect(exported.lap).toEqual(before.lap);
    expect(exported.track).toEqual(before.track);
    expect(exported.reference.alignment).toEqual(before.lap.alignment);
    expect(await cursor.inputValue()).toBe("20");
  }
  expect(calculations).toBe(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const bundle = await downloadJson(page, "Export project");
  const expected = JSON.parse(bundle.toString());
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Track", exact: true }),
  ).toHaveValue(source.id);
  await expect(
    page.getByText("Imported simulation export · zero-reference.json"),
  ).toBeVisible();
  const saved = JSON.parse(
    (await downloadJson(page, "Export project")).toString(),
  );
  expect(saved.track).toEqual(expected.track);
  expect(saved.reference).toEqual(expected.reference);

  const fresh = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const mobile = await fresh.newPage();
    await mobile.goto("http://127.0.0.1:5173/");
    await expect(mobile.getByTestId("lap-time")).toBeVisible();
    await mobile
      .getByLabel("Import project file", { exact: true })
      .setInputFiles(file("zero-project.json", bundle));
    await expect(
      mobile.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(source.id);
    await expect(mobile.getByRole("alert")).toHaveCount(0);
    const restored = JSON.parse(
      (await downloadJson(mobile, "Export project")).toString(),
    );
    expect(restored.track).toEqual(expected.track);
    expect(restored.reference).toEqual(expected.reference);
    expect(restored.lap.alignment).toEqual(expected.lap.alignment);
    expect(await mobile.evaluate(() => document.body.scrollWidth)).toBe(390);
  } finally {
    await fresh.close();
  }
});
