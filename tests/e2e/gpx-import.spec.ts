import { test, expect, type Page } from "@playwright/test";
import { gpxFixture } from "../fixtures/gpx";

async function exportProject(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function openImport(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  await page
    .getByRole("button", { name: "Import track GPX", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Import GPX circuit",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Choose GPX file", exact: true }),
  ).toBeFocused();
  return dialog;
}
async function upload(page: Page, xml = gpxFixture()) {
  const pending = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Choose GPX file", exact: true })
    .click();
  await (
    await pending
  ).setFiles({
    name: "original-development.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from(xml),
  });
}

test("GPX geometry validation rejects incomplete or ambiguous sources before simulation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/simulate")) requests++;
  });
  const dialog = await openImport(page);
  const xml = gpxFixture();
  const point = xml.match(/<trkpt[^>]*>[\s\S]*?<\/trkpt>/)![0];
  let count = 0;
  const open = xml.replace(/<trkpt[^>]*>[\s\S]*?<\/trkpt>/g, (row) =>
    count++ < 40 ? row : "",
  );
  const cases: [string, string][] = [
    [" ".repeat(1_500_001), "smaller than 1.5 MB"],
    ["<gpx", "malformed"],
    [xml.replace("?>", "?><!DOCTYPE gpx>"), "document types"],
    [xml.replace('version="1.1"', 'version="1.0"'), "GPX 1.1"],
    [
      xml.replace("http://www.topografix.com/GPX/1/1", "urn:other"),
      "standard namespace",
    ],
    [xml.replace("</gpx>", "<trk/></gpx>"), "one GPX track"],
    [xml.replace("</gpx>", "<rte/></gpx>"), "no routes"],
    [xml.replace("</trkseg>", "</trkseg><trkseg/>"), "one continuous"],
    [xml.replace(/<ele>[^<]*<\/ele>/, ""), "needs one elevation"],
    [
      xml
        .replace("<ele>", '<extra:ele xmlns:extra="urn:logger">')
        .replace("</ele>", "</extra:ele>"),
      "needs one elevation",
    ],
    [xml.replace(/lat="[^"]*"/, 'lat="NaN"'), "finite decimal"],
    [xml.replace(/lat="[^"]*"/, 'lat="1e-3"'), "finite decimal"],
    [xml.replace(/lon="[^"]*"/, 'lon="180"'), "invalid latitude"],
    [xml.replace(point, point + point), "Invalid sample"],
    [gpxFixture({ count: 39 }), "retain 40–2,000"],
    [gpxFixture({ count: 2001 }), "Use 40–2,000"],
    [open, "endpoints are"],
  ];
  for (const [input, message] of cases) {
    await upload(page, input);
    await expect(dialog.getByRole("alert"), message).toContainText(message);
    await expect(
      dialog.getByRole("button", { name: "Import and simulate" }),
    ).toBeDisabled();
  }
  await upload(page, gpxFixture({ close: false }));
  await expect(
    dialog.getByText("Endpoint join", { exact: true }),
  ).toBeVisible();
  const left = dialog.getByLabel("Assumed left half-width (m)", {
    exact: true,
  });
  await left.fill("1");
  await expect(dialog.getByRole("alert")).toContainText("supported model");
  await left.fill("40");
  await dialog
    .getByLabel("Source description", { exact: true })
    .fill("S".repeat(140));
  await expect(
    dialog.getByRole("button", { name: "Import and simulate" }),
  ).toBeEnabled();
  await dialog.getByLabel("Track name", { exact: true }).fill(" ");
  await expect(dialog.getByRole("alert")).toContainText("track name");
  await upload(
    page,
    xml.replace(
      "Original GPX development circuit",
      "&lt;img src=x onerror=alert(1)&gt;",
    ),
  );
  await expect(dialog.getByLabel("Track name", { exact: true })).toHaveValue(
    "<img src=x onerror=alert(1)>",
  );
  await expect(dialog.locator("img")).toHaveCount(0);
  expect(requests).toBe(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Additional actions" }),
  ).toBeFocused();
});

for (const failedSolver of ["optimized", "centerline"]) {
  test(`failed GPX ${failedSolver} calculation retains the workspace and retries its reviewed draft`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page.getByRole("slider", { name: "Fuel load" }).fill("95");
    const before = await exportProject(page);
    await page.route("**/api/simulate", (route) =>
      route.request().postDataJSON().setup.solver === failedSolver
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "GPX solve unavailable" }),
          })
        : route.continue(),
    );
    const dialog = await openImport(page);
    await upload(page);
    await dialog
      .getByLabel("Track name", { exact: true })
      .fill("Retry original GPX");
    await dialog.getByRole("button", { name: "Import and simulate" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Current workspace kept",
    );
    expect(await exportProject(page)).toEqual(before);
    await expect(
      page.getByRole("option", { name: "Retry original GPX", exact: true }),
    ).toHaveCount(0);
    await page.unrouteAll({ behavior: "wait" });
    await page
      .getByRole("button", { name: "Review GPX again", exact: true })
      .click();
    await expect(dialog.getByLabel("Track name", { exact: true })).toHaveValue(
      "Retry original GPX",
    );
    await dialog.getByRole("button", { name: "Import and simulate" }).click();
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(/^gpx-/);
    const after = await exportProject(page);
    expect(after.lap.setup.fuel).toBe(95);
    expect(after.reference.trackId).toBe(after.track.id);
    expect(after.reference.setup.solver).toBe("centerline");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("cancelling GPX activation aborts both calculations and preserves the complete workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page.getByRole("slider", { name: "Fuel load" }).fill("90");
  const before = await exportProject(page);
  const dialog = await openImport(page);
  await upload(page);
  let release = () => {};
  let ready = () => {};
  let requested = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const bothStarted = new Promise<void>((resolve) => {
    ready = resolve;
  });
  await page.route("**/api/simulate", async (route) => {
    if (++requested === 2) ready();
    await gate;
    await route.abort("aborted");
  });
  try {
    await dialog.getByRole("button", { name: "Import and simulate" }).click();
    await bothStarted;
    let aborted = 0;
    const bothAborted = new Promise<void>((resolve) => {
      page.on("requestfailed", (request) => {
        if (request.url().endsWith("/api/simulate") && ++aborted === 2)
          resolve();
      });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Cancel calculation", exact: true })
      .click();
    await bothAborted;
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    expect(await exportProject(page)).toEqual(before);
    await expect(
      page.getByRole("option", {
        name: "Original GPX development circuit",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(requested).toBe(2);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
for (const width of [1600, 390]) {
  test(`GPX review, calculation and project restoration preserve declared geometry at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("10");
    await page.getByRole("slider", { name: "Fuel load" }).fill("100");
    await page.setViewportSize({ width, height: 900 });
    const before = await exportProject(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    const dialog = await openImport(page);
    await upload(page, gpxFixture({ prefix: true }));
    const apply = dialog.getByRole("button", {
      name: "Import and simulate",
      exact: true,
    });
    await expect(apply).toBeEnabled();
    await expect(
      dialog.getByText("One repeated closing point is removed.", {
        exact: false,
      }),
    ).toBeVisible();
    await dialog
      .getByLabel("Track name", { exact: true })
      .fill("Discarded draft");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Additional actions" }),
    ).toBeFocused();
    expect(requests).toBe(0);
    expect(await cursor.inputValue()).toBe("10");
    expect(await exportProject(page)).toEqual(before);
    await openImport(page);
    await upload(page, gpxFixture({ latitude: -33, longitude: 151 }));
    await dialog
      .getByLabel("Track name", { exact: true })
      .fill("Original GPX study");
    await dialog
      .getByLabel("Source description", { exact: true })
      .fill(
        "Original analytic test circuit; synthetic fixture, not recorded data.",
      );
    await dialog
      .getByLabel("Assumed left half-width (m)", { exact: true })
      .fill("7");
    await dialog
      .getByLabel("Assumed right half-width (m)", { exact: true })
      .fill("8");
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    expect(requests).toBe(0);
    await apply.click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(/^gpx-/);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    expect(requests).toBe(2);
    const after = await exportProject(page);
    expect(after.track.name).toBe("Original GPX study");
    expect(after.track.points).toHaveLength(80);
    expect(after.track.synthetic).toBe(false);
    expect(after.track.provenance).toContain(
      "supplied elevation/datum unverified",
    );
    expect(after.track.provenance).toContain(
      "synthetic fixture, not recorded data",
    );
    expect(
      after.track.points.every(
        (p: { widthLeft: number; widthRight: number; banking: number }) =>
          p.widthLeft === 7 && p.widthRight === 8 && p.banking === 0,
      ),
    ).toBe(true);
    expect(after.track.points[0].y).toBe(30);
    expect(after.track.points[10].y).toBe(32);
    expect(after.track.sectorFractions).toEqual([1 / 3, 2 / 3, 1]);
    expect(after.lap.trackId).toBe(after.track.id);
    expect(after.reference.trackId).toBe(after.track.id);
    expect(after.reference.setup.solver).toBe("centerline");
    expect(after.lap.setup.fuel).toBe(100);
    expect(after.projectName).toBe(before.projectName);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "gpx-baseline.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(after.reference)),
      });
    await expect(
      page.getByText("Reference imported · current simulation retained", {
        exact: true,
      }),
    ).toBeVisible();
    const importedReference = {
      ...after.reference,
      referenceImport: { fileName: "gpx-baseline.json" },
    };
    expect((await exportProject(page)).reference).toEqual(importedReference);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const saved = await exportProject(page);
    expect(saved.track).toEqual(after.track);
    expect(saved.reference).toEqual(importedReference);
    const fresh = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await fresh.goto("http://127.0.0.1:5173/");
      await expect(fresh.getByTestId("lap-time")).toBeVisible();
      await fresh
        .getByLabel("Import project file", { exact: true })
        .setInputFiles({
          name: "gpx-study.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(after)),
        });
      await expect(
        fresh.getByRole("combobox", { name: "Track", exact: true }),
      ).toHaveValue(after.track.id);
      const restored = await exportProject(fresh);
      expect(restored.track).toEqual(after.track);
      expect(restored.reference).toEqual(after.reference);
    } finally {
      await fresh.close();
    }
  });
}
