import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import source from "../../data/tracks/red-bull-ring.json" with { type: "json" };

async function readDownload(page: Page, action: () => Promise<void>) {
  const pending = page.waitForEvent("download");
  await action();
  const file = await pending;
  const chunks = [];
  for await (const chunk of (await file.createReadStream())!)
    chunks.push(chunk);
  return { name: file.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

function unzip(bytes: Buffer): Record<string, string> {
  // Python's independent ZIP reader checks CRCs and actual archive compatibility.
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "scripts/python.mjs",
        "-c",
        "import io,json,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode('utf-8') for n in z.namelist()}))",
      ],
      { input: bytes, encoding: "utf8", maxBuffer: 15_000_000 },
    ),
  );
}

async function exportProject(page: Page) {
  await page.getByRole("button", { name: "Additional actions" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const chunks = [];
  for await (const chunk of (await (await pending).createReadStream())!)
    chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

for (const width of [1600, 390]) {
  test(`Red Bull Ring coexists with Dev Track and retains sources through save and portable restoration at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const select = page.getByRole("combobox", { name: "Track", exact: true });
    await expect(select).toHaveValue("ardennes-development");
    await expect(select).toHaveAccessibleDescription("Development");
    await expect(
      select.locator('optgroup[label="Development Tracks"] option'),
    ).toHaveText(["LAPTRIX Dev Track"]);
    await expect(
      select.locator('optgroup[label="Real Circuits"] option'),
    ).toHaveText(["Red Bull Ring"]);
    await expect(
      select.locator('optgroup[label="Imported Tracks"]'),
    ).toHaveCount(0);
    const original = await exportProject(page);
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    await select.selectOption("red-bull-ring");
    await expect(page.locator(".track-caption strong")).toHaveText(
      "Red Bull Ring",
    );
    await expect(select).toHaveAccessibleDescription("Real · approximate");
    await expect(page.locator(".track-category")).toHaveAttribute(
      "title",
      `${source.country} · ${source.provenance}`,
    );
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".scene-top-left .pill")).toContainText(
      "APPROXIMATE CIRCUIT",
    );
    await expect(
      page.getByRole("option", { name: "LAPTRIX Dev Track", exact: true }),
    ).toHaveCount(1);
    const attribution = page.getByRole("navigation", {
      name: "Track source attribution",
    });
    for (const item of source.attribution.sources) {
      await expect(
        attribution.getByRole("link", { name: item.credit, exact: true }),
      ).toHaveAttribute("href", item.licenseUrl);
    }
    await page.locator(".track-details > summary").click();
    await expect(page.locator(".track-source-details")).toContainText("2010");
    await expect(page.locator(".track-source-details")).toContainText(
      "equal-distance sectors are estimates",
    );
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Rename project", exact: true })
      .click();
    const naming = page.getByRole("dialog", {
      name: "Rename project",
      exact: true,
    });
    await naming.getByLabel("Project name").fill("Austrian showcase");
    await naming.getByLabel("Project name").press("Enter");
    await expect(naming).toHaveCount(0);
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const saved = await exportProject(page);
    expect(saved.track.id).toBe("red-bull-ring");
    expect(saved.track.attribution).toEqual(source.attribution);
    expect(saved.lap.trackAttribution).toEqual(source.attribution);
    expect(saved.track.points).toEqual(source.points);
    expect(saved.setup.fuel).toBe(21);
    expect(saved.lap.trackId).toBe(saved.track.id);
    expect(saved.reference.trackId).toBe(saved.track.id);
    expect(saved.reference.alignment.trackFingerprint).toBe(
      saved.lap.alignment.trackFingerprint,
    );
    expect(saved.lap.alignment.trackFingerprint).not.toBe(
      original.lap.alignment.trackFingerprint,
    );
    await page.reload();
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await expect(select).toHaveValue("red-bull-ring");
    await expect(select).toHaveAccessibleDescription("Real · approximate");
    await expect(page.getByLabel("Project name")).toHaveValue(
      "Austrian showcase",
    );
    const restored = await exportProject(page);
    expect(restored.track).toEqual(saved.track);
    expect(restored.reference).toEqual(saved.reference);
    expect(restored.setup).toEqual(saved.setup);
    await select.selectOption("ardennes-development");
    await expect(page.locator(".track-caption strong")).toHaveText(
      "LAPTRIX Dev Track",
    );
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await expect(attribution).toHaveCount(0);
    await expect(select).toHaveAccessibleDescription("Development");
    const dev = await exportProject(page);
    expect(dev.track.points).toEqual(original.track.points);
    expect(dev.lap.alignment.trackFingerprint).toBe(
      original.lap.alignment.trackFingerprint,
    );
    expect(dev.reference.trackId).toBe("ardennes-development");
    expect(dev.reference.alignment.trackFingerprint).toBe(
      dev.lap.alignment.trackFingerprint,
    );
    await page
      .getByLabel("Import project file", { exact: true })
      .setInputFiles({
        name: "austria.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(saved)),
      });
    await expect(select).toHaveValue("red-bull-ring");
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    const imported = await exportProject(page);
    await expect(select).toHaveAccessibleDescription("Real · approximate");
    expect(imported.track).toEqual(saved.track);
    expect(imported.reference).toEqual(saved.reference);
    expect(imported.setup).toEqual(saved.setup);
    expect(await select.locator("option").count()).toBe(2);
    expect(errors).toEqual([]);
  });
}

test("showcase JSON and CSV downloads retain source licenses without altering numerical rows", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Track", exact: true })
    .selectOption("red-bull-ring");
  await expect(page.locator(".track-caption strong")).toHaveText(
    "Red Bull Ring",
  );
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  const saved = await exportProject(page);
  await page.getByRole("button", { name: "Additional actions" }).click();
  const native = await readDownload(page, () =>
    page
      .getByRole("button", { name: "Export telemetry JSON", exact: true })
      .click(),
  );
  expect(JSON.parse(native.bytes.toString()).trackAttribution).toEqual(
    source.attribution,
  );
  await page.getByRole("button", { name: "Additional actions" }).click();
  const timing = await readDownload(page, () =>
    page
      .getByRole("button", { name: "Export timing reference", exact: true })
      .click(),
  );
  expect(JSON.parse(timing.bytes.toString()).trackAttribution).toEqual(
    source.attribution,
  );
  await page.getByRole("button", { name: "Additional actions" }).click();
  const telemetry = await readDownload(page, () =>
    page
      .getByRole("button", {
        name: "Export telemetry CSV (SI) + credits (ZIP)",
        exact: true,
      })
      .click(),
  );
  expect(telemetry.name).toBe("laptrix-telemetry-si-with-sources.zip");
  const contents = unzip(telemetry.bytes);
  expect(Object.keys(contents).sort()).toEqual([
    "SOURCE_LICENSES.txt",
    "laptrix-telemetry-si.csv",
    "source-attribution.json",
  ]);
  expect(JSON.parse(contents["source-attribution.json"])).toEqual([
    source.attribution,
  ]);
  for (const item of source.attribution.sources) {
    expect(contents["SOURCE_LICENSES.txt"]).toContain(item.credit);
    expect(contents["SOURCE_LICENSES.txt"]).toContain(item.licenseUrl);
  }
  const rows = contents["laptrix-telemetry-si.csv"]
    .split("\n")
    .map((row) => row.split(","));
  const keys = rows.shift()!;
  expect(rows).toHaveLength(saved.lap.samples.length);
  rows.forEach((row, i) =>
    keys.forEach((key, j) =>
      expect(Number(row[j])).toBe(saved.lap.samples[i][key]),
    ),
  );
  await page.getByRole("tab", { name: "Time Delta", exact: true }).click();
  const reportFile = await readDownload(page, () =>
    page
      .getByRole("button", {
        name: "Export full-lap comparison JSON",
        exact: true,
      })
      .click(),
  );
  const report = JSON.parse(reportFile.bytes.toString());
  expect(report.inputs.current.trackAttribution).toEqual(source.attribution);
  expect(report.inputs.reference.trackAttribution).toEqual(source.attribution);
  const comparison = await readDownload(page, () =>
    page
      .getByRole("button", {
        name: "Export full-lap comparison CSV + credits (ZIP)",
        exact: true,
      })
      .click(),
  );
  expect(comparison.name).toBe("laptrix-comparison-with-sources.zip");
  const compared = unzip(comparison.bytes);
  expect(JSON.parse(compared["source-attribution.json"])).toEqual([
    source.attribution,
  ]);
  const lines = compared["laptrix-comparison.csv"].trimEnd().split("\r\n");
  expect(lines).toHaveLength(report.samples.length + 1);
  expect(lines[0].split(",")).toHaveLength(40);
  lines.slice(1).forEach((line, i) => {
    const fields = line.split(",").map(Number);
    expect(fields[0]).toBe(report.samples[i].progress);
    expect(fields[1]).toBe(report.samples[i].current.time);
    expect(fields[2]).toBe(report.samples[i].reference.time);
    expect(fields[3]).toBe(report.samples[i].deltaTime);
  });
  expect(await exportProject(page)).toEqual(saved);
});
