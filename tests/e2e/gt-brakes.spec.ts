import { expect, test, type Page } from "@playwright/test";
import type { Mesh, MeshStandardMaterial } from "three";
import type { Lap } from "../../packages/shared/schema";

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

// Independent interpolation from each original lap's own time knots.
function demand(lap: Lap, time: number) {
  const upper = lap.samples.findIndex((sample) => sample.time > time);
  if (upper < 0) return lap.samples.at(-1)!.brake;
  if (upper === 0) return lap.samples[0].brake;
  const a = lap.samples[upper - 1],
    b = lap.samples[upper];
  return a.brake + ((b.brake - a.brake) * (time - a.time)) / (b.time - a.time);
}

async function lamps(page: Page) {
  return page.evaluate(async () => {
    // Inspect the installed development renderer; no application test hook or clock.
    const moduleUrl = "/node_modules/.vite/deps/@react-three_fiber.js";
    const { _roots } = (await import(
      moduleUrl
    )) as typeof import("@react-three/fiber");
    const { scene } = _roots
      .get(document.querySelector(".scene canvas") as HTMLCanvasElement)!
      .store.getState();
    return ["current-ghost", "reference-ghost"].map((name) => {
      const car = scene.getObjectByName(name)!;
      return [0, 1].map((index) => {
        const mesh = car.getObjectByName(`gt-brake-lamp-${index}`) as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        return {
          intensity: material.emissiveIntensity,
          material: material.uuid,
          geometry: mesh.geometry.uuid,
        };
      });
    });
  });
}

for (const [track, width] of [
  ["ardennes-development", 1600],
  ["red-bull-ring", 320],
] as const) {
  test(`GT lamps follow each lap's brake demand through seeking and camera changes on ${track}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("lap-time")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Track", exact: true })
      .selectOption(track);
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("combobox", { name: "Car profile" })
      .selectOption("gt-development");
    await expect(page.getByTestId("result-vehicle")).toHaveText(
      "GT Development 01",
    );
    await expect(
      page.getByRole("button", { name: "Inspect corner 1", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Set reference", exact: true })
      .click();
    await page.getByRole("slider", { name: "Fuel load" }).fill("45");
    await page
      .getByRole("button", { name: "Run Simulation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Run Simulation", exact: true }),
    ).toBeEnabled();
    await page.getByRole("slider", { name: "Fuel load" }).fill("21");
    const before = await exportProject(page);
    const current: Lap = before.lap,
      reference: Lap = before.reference;
    expect(reference.vehicleId).toBe("gt-development");
    let solves = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/simulate")) solves++;
    });
    await page.getByRole("tab", { name: "Ghost Car", exact: true }).click();
    await page
      .getByRole("checkbox", { name: "Show reference ghost", exact: true })
      .check();
    await page.getByRole("tab", { name: "Track View", exact: true }).click();
    const cursor = page.getByRole("slider", { name: "Viewer lap position" });
    const coast = current.samples.find(
      (sample) => sample.time > 3 && sample.brake === 0,
    )!;
    const peak = current.samples.reduce((best, sample) =>
      sample.brake > best.brake ? sample : best,
    );
    const rise = current.samples.findIndex(
      (sample, i) => i > 0 && sample.brake - current.samples[i - 1].brake > 0.2,
    );
    expect(rise).toBeGreaterThan(0);
    expect(peak.brake).toBeGreaterThan(0.5);
    const middle =
      (current.samples[rise - 1].time + current.samples[rise].time) / 2;
    let identities: string[] | undefined;
    for (const time of [coast.time, peak.time, middle, coast.time]) {
      await cursor.fill(String(Number(time.toFixed(2))));
      const exact = Number(await cursor.getAttribute("value"));
      const expected = [current, reference].map(
        (lap) => 0.12 + 1.6 * demand(lap, exact),
      );
      await expect
        .poll(async () =>
          (await lamps(page)).every((pair, i) =>
            pair.every((lamp) => Math.abs(lamp.intensity - expected[i]) < 1e-9),
          ),
        )
        .toBe(true);
      const values = await lamps(page);
      const next = values.flatMap((pair) =>
        pair.flatMap((lamp) => [lamp.material, lamp.geometry]),
      );
      if (identities) expect(next).toEqual(identities);
      else identities = next;
      for (const camera of ["Chase", "Onboard", "Top View"]) {
        await page.getByRole("button", { name: camera, exact: true }).click();
        expect(await cursor.getAttribute("value")).toBe(String(exact));
        expect(await lamps(page)).toEqual(values);
      }
    }
    const start = Number(await cursor.getAttribute("value"));
    await page
      .getByRole("button", { name: "Play viewer lap", exact: true })
      .click();
    await expect
      .poll(async () => Number(await cursor.getAttribute("value")))
      .toBeGreaterThan(start + 0.3);
    await page
      .getByRole("button", { name: "Pause viewer lap", exact: true })
      .click();
    const paused = Number(await cursor.getAttribute("value"));
    const expected = [current, reference].map(
      (lap) => 0.12 + 1.6 * demand(lap, paused),
    );
    await expect
      .poll(async () =>
        (await lamps(page)).every((pair, i) =>
          pair.every((lamp) => Math.abs(lamp.intensity - expected[i]) < 1e-9),
        ),
      )
      .toBe(true);
    expect(await exportProject(page)).toEqual(before);
    expect(solves).toBe(0);
    expect(errors).toEqual([]);
  });
}
