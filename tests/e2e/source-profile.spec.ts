import { test, expect, type Page } from "@playwright/test";
import { profileTrack } from "../fixtures/source-profile";
import { gpxFixture } from "../fixtures/gpx";
import source from "../../data/tracks/ardennes-development.json" with { type: "json" };

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
for (const width of [1600, 390]) {
  test(`source profiles inspect exact original geometry without changing playback at ${width}px`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    const catalogSource = (await exportProject(page)).track;
    expect(catalogSource).toEqual({ ...source, attribution: null });
    await page.getByLabel("Import track file", { exact: true }).setInputFiles({
      name: "original-ramp.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(profileTrack)),
    });
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(profileTrack.id);
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("slider", { name: "Fuel load" }).fill("100");
    const cursor = page.getByRole("slider", { name: "Lap playback position" });
    await cursor.fill("10");
    const before = await exportProject(page);
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) requests++;
    });
    await page.getByText("Track geometry", { exact: true }).click();
    const launch = page.getByRole("button", {
      name: "Source profiles",
      exact: true,
    });
    await launch.click();
    const closeProfile = page.getByRole("button", {
      name: "Close source profile",
      exact: true,
    });
    await expect(closeProfile).toBeFocused();
    const profile = page.getByRole("region", {
      name: "Source geometry profiles",
      exact: true,
    });
    const selector = profile.getByRole("slider", {
      name: "Source segment",
      exact: true,
    });
    await expect(selector).toHaveAttribute("max", "40");
    await expect(
      profile.getByText("100.0 / 100.0 m", { exact: true }),
    ).toBeVisible();
    await expect(
      profile.getByText("+25.0 / -25.0 %", { exact: true }),
    ).toBeVisible();
    const elevationPath = await profile
      .getByTestId("source-elevation-trace")
      .getAttribute("d");
    const gradePath = await profile
      .getByTestId("source-grade-trace")
      .getAttribute("d");
    const curvaturePath = await profile
      .getByTestId("source-curvature-trace")
      .getAttribute("d");
    expect(curvaturePath).toMatch(/^M/);
    const data = profile.getByTestId("source-segment-data");
    const value = (label: string) =>
      data.getByText(label, { exact: true }).locator("..").locator("dd");
    await expect(value("Grade")).toHaveText("+25.0 %");
    await expect(value("Curvature at start point")).toHaveText("+6.86 km⁻¹");
    await expect(value("Start → end elevation")).toHaveText("0.00 → 10.00 m");
    await selector.focus();
    await selector.press("End");
    await expect(selector).toHaveValue("40");
    await expect(value("Curvature at start point")).toHaveText("0 km⁻¹");
    await expect(value("Grade")).toHaveText("0.0 %");
    await expect(value("Start distance")).toHaveText(
      `${(2 * Math.sqrt(170000) + 570).toFixed(2)} m`,
    );
    await expect(value("Segment length")).toHaveText("30.00 m");
    const chart = profile.getByRole("img", {
      name: "Segment grade (%) over original source distance",
      exact: true,
    });
    const box = await chart.boundingBox();
    await chart.click({
      position: { x: box!.width * 0.55, y: box!.height * 0.5 },
    });
    await expect(selector).toHaveValue("22");
    await expect(value("Curvature at start point")).toHaveText("0 km⁻¹");
    await expect(value("Grade")).toHaveText("-25.0 %");
    await expect(value("Start → end elevation")).toHaveText("90.00 → 80.00 m");
    const curvatureChart = profile.getByRole("img", {
      name: "Sampled vertical curvature (1/km) over original source distance",
      exact: true,
    });
    const curvatureBounds = (await curvatureChart.boundingBox())!;
    await curvatureChart.click({
      position: {
        x: curvatureBounds.width * 0.8,
        y: curvatureBounds.height * 0.5,
      },
    });
    await expect(selector).toHaveValue("31");
    await expect(value("Curvature at start point")).toHaveText("+6.86 km⁻¹");
    await expect(profile.getByTestId("source-elevation-trace")).toHaveAttribute(
      "d",
      elevationPath!,
    );
    await expect(profile.getByTestId("source-grade-trace")).toHaveAttribute(
      "d",
      gradePath!,
    );
    expect(requests).toBe(0);
    await page.keyboard.press("Escape");
    await expect(launch).toBeFocused();
    expect(await cursor.inputValue()).toBe("10");
    expect(await exportProject(page)).toEqual(before);
    await launch.click();
    await expect(selector).toHaveValue("31");
    const reportDownload = page.waitForEvent("download");
    await profile
      .getByRole("button", { name: "Export source profile", exact: true })
      .click();
    const stream = await (await reportDownload).createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const report = JSON.parse(Buffer.concat(chunks).toString());
    await expect(closeProfile).toBeInViewport();
    expect(report.format).toBe("laptrix-source-profile-v2");
    expect(report.algorithm).toBe("closed-source-chords-curvature-v1");
    expect(report.units.verticalCurvature).toBe(
      "1/m at each original source point",
    );
    expect(report.profile.verticalCurvature).toHaveLength(40);
    const cornerCurvature = 20 / (Math.sqrt(1700) * Math.sqrt(5000));
    for (let point = 0; point < 40; point++) {
      const direction =
        point === 0 || point === 30 ? 1 : point === 10 || point === 20 ? -1 : 0;
      expect(report.profile.verticalCurvature[point]).toBeCloseTo(
        direction * cornerCurvature,
        12,
      );
    }
    await expect(profile.getByTestId("source-curvature-trace")).toHaveAttribute(
      "d",
      curvaturePath!,
    );
    expect(report.track).toEqual(before.track);
    expect(report.trackFingerprint).toBe(before.lap.alignment.trackFingerprint);
    expect(report.profile.segments).toHaveLength(40);
    expect(report.profile.ascent).toBe(100);
    expect(report.profile.descent).toBe(100);
    expect(report.profile.segments[0].gradePercent).toBe(25);
    expect(report.profile.segments.at(-1).endElevation).toBe(0);
    expect(
      await profile.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await closeProfile.click();
    await expect(launch).toBeFocused();
    // The sharp analytic rectangle tests exact values; use the smooth catalog source for resampling.
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption(source.id);
    await expect(
      page.getByRole("combobox", { name: "Track", exact: true }),
    ).toHaveValue(source.id);
    await launch.click();
    await expect(selector).toHaveAttribute("max", "720");
    await expect(selector).toHaveValue("1");
    const sourceElevation = await profile
      .getByTestId("source-elevation-trace")
      .getAttribute("d");
    const sourceGrade = await profile
      .getByTestId("source-grade-trace")
      .getAttribute("d");
    const sourceCurvature = await profile
      .getByTestId("source-curvature-trace")
      .getAttribute("d");
    await closeProfile.click();
    await page.locator(".advanced summary").click();
    await page
      .getByRole("combobox", { name: "Spatial sampling" })
      .selectOption("5m");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(page.getByTestId("sampling-summary")).toContainText("5.00 m");
    await launch.click();
    await expect(profile.getByTestId("source-elevation-trace")).toHaveAttribute(
      "d",
      sourceElevation!,
    );
    await expect(profile.getByTestId("source-grade-trace")).toHaveAttribute(
      "d",
      sourceGrade!,
    );
    await expect(selector).toHaveValue("1");
    expect(requests).toBe(3);
    await expect(profile.getByTestId("source-curvature-trace")).toHaveAttribute(
      "d",
      sourceCurvature!,
    );
    await closeProfile.click();
    const after = await exportProject(page);
    expect(after.track).toEqual(catalogSource);
    expect(after.lap.samples.length).toBeGreaterThan(1000);
    await cursor.fill("8");
    await page.getByRole("button", { name: "Additional actions" }).click();
    await page
      .getByRole("button", { name: "Import track GPX", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Import GPX circuit",
      exact: true,
    });
    await page.getByLabel("GPX source file", { exact: true }).setInputFiles({
      name: "analytic-height.gpx",
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(gpxFixture()),
    });
    await expect(
      dialog.getByRole("button", { name: "Import and simulate" }),
    ).toBeEnabled();
    await dialog.getByText("Source profiles", { exact: true }).click();
    const preview = dialog.getByRole("region", {
      name: "Source geometry profiles",
      exact: true,
    });
    const previewSelector = preview.getByRole("slider", {
      name: "Source segment",
      exact: true,
    });
    await expect(previewSelector).toHaveAttribute("max", "80");
    await expect(
      preview.getByText("8.0 / 8.0 m", { exact: true }),
    ).toBeVisible();
    await previewSelector.fill("11");
    await expect(
      preview.getByText("32.00 → 31.98 m", { exact: true }),
    ).toBeVisible();
    const previewDownload = page.waitForEvent("download");
    await preview
      .getByRole("button", { name: "Export source profile", exact: true })
      .click();
    const previewStream = await (await previewDownload).createReadStream();
    const previewChunks = [];
    for await (const chunk of previewStream!) previewChunks.push(chunk);
    const previewReport = JSON.parse(Buffer.concat(previewChunks).toString());
    expect(previewReport.track.points).toHaveLength(80);
    expect(previewReport.format).toBe("laptrix-source-profile-v2");
    expect(previewReport.profile.verticalCurvature).toHaveLength(80);
    expect(previewReport.profile.verticalCurvature.every(Number.isFinite)).toBe(
      true,
    );
    expect(previewReport.track.id).not.toBe(source.id);
    expect(previewReport.profile.segments[10].startElevation).toBe(32);
    expect(previewReport.profile.ascent).toBeCloseTo(8, 8);
    expect(previewReport.profile.descent).toBeCloseTo(8, 8);
    expect(requests).toBe(3);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Additional actions" }),
    ).toBeFocused();
    expect(await cursor.inputValue()).toBe("8");
    expect(await exportProject(page)).toEqual(after);
  });
}
