import { test, expect } from "@playwright/test";
import type { TimingReference } from "../../packages/shared/schema";
import {
  cornerDelta,
  referenceSectorTimes,
  signed,
} from "../../packages/telemetry";

test("aligned external timing imports, compares, persists and survives invalid files", async ({
  page,
}) => {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/simulate") &&
      r.request().postDataJSON()?.setup.solver === "optimized",
  );
  await page.goto("/");
  const lap = await (await response).json();
  await expect(page.getByTestId("lap-time")).toBeVisible();
  const time = await page.getByTestId("lap-time").textContent();
  const indices = Array.from({ length: 41 }, (_, i) => i * 18);
  const reference: TimingReference = {
    format: "laptrix-timing-reference-v1",
    label: "Logger fixture lap",
    vehicleLabel: "Test coupe",
    origin: "recorded",
    source: "Synthetic browser test data; not real measured telemetry",
    trackId: lap.trackId,
    lapTime: lap.lapTime * 1.1,
    units: { time: "s", progress: "fraction" },
    alignment: {
      trackFingerprint: lap.alignment.trackFingerprint,
      progress: indices.map((i) => lap.alignment.progress[i]),
    },
    samples: indices.map((i) => ({ time: lap.samples[i].time * 1.1 })),
  };
  const upload = async (value: unknown) =>
    page.getByLabel("Import reference file", { exact: true }).setInputFiles({
      name: "logger.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
  await upload(reference);
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Logger fixture lap",
  );
  await expect(
    page.getByText("Imported recorded timing", { exact: false }),
  ).toBeVisible();
  await page.locator("details.reference-provenance summary").click();
  await expect(
    page.getByText(
      "Source declared by file: Synthetic browser test data; not real measured telemetry",
    ),
  ).toBeVisible();
  await expect(page.getByTestId("lap-time")).toHaveText(time!);
  const row = page
    .getByRole("button", { name: "Select corner 2", exact: true })
    .locator("xpath=ancestor::tr");
  await expect(row.locator("td").last()).toHaveText(
    signed(cornerDelta(lap, reference, lap.corners[1])!),
  );
  const expected = referenceSectorTimes(lap, reference);
  await expect(
    page
      .locator(".sector-bar-group")
      .first()
      .locator(".bars > div")
      .last()
      .locator("span"),
  ).toHaveText(expected[0]!.toFixed(3));
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Logger fixture lap",
  );
  for (const invalid of [
    { ...reference, units: { time: "ms", progress: "fraction" } },
    {
      ...reference,
      alignment: {
        ...reference.alignment,
        trackFingerprint: `sha256:${"0".repeat(64)}`,
      },
    },
  ]) {
    await upload(invalid);
    await expect(page.getByRole("alert")).toContainText(
      "Current reference kept",
    );
    await expect(
      page.getByRole("button", { name: "Import reference again" }),
    ).toBeVisible();
    await expect(page.getByTestId("reference-vehicle")).toContainText(
      "Logger fixture lap",
    );
    await expect(page.getByTestId("lap-time")).toHaveText(time!);
  }
  await upload(reference);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Car profile" })
    .selectOption("gt-development");
  await expect(page.getByTestId("result-vehicle")).toHaveText(
    "GT Development 01",
  );
  await expect(page.getByTestId("reference-vehicle")).toContainText(
    "Logger fixture lap",
  );
});

test("native lap export and explicit timing export can both be imported as references", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("lap-time")).toBeVisible();
  for (const name of ["Export telemetry JSON", "Export timing reference"]) {
    await page.getByRole("button", { name: "Additional actions" }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const stream = await (await downloading).createReadStream();
    const chunks = [];
    for await (const chunk of stream!) chunks.push(chunk);
    await page
      .getByLabel("Import reference file", { exact: true })
      .setInputFiles({
        name: "exported-reference.json",
        mimeType: "application/json",
        buffer: Buffer.concat(chunks),
      });
    await expect(
      page.getByText("Reference imported · current simulation retained"),
    ).toBeVisible();
    await expect(page.locator(".delta-badge")).toContainText("0.000");
    if (name === "Export telemetry JSON")
      await expect(
        page.getByText("Imported simulation export · exported-reference.json"),
      ).toBeVisible();
    else
      await expect(
        page.getByText("Imported simulation timing", { exact: false }),
      ).toBeVisible();
  }
});
