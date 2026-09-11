/* global document, createImageBitmap, OffscreenCanvas, fetch */
import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const original = JSON.parse(
  await readFile("data/tracks/ardennes-development.json", "utf8"),
);
const showcase = JSON.parse(
  await readFile("data/tracks/red-bull-ring.json", "utf8"),
);
const sparse = {
  ...original,
  id: "terrain-slope-40",
  name: "Original sloped circle 40",
  provenance:
    "Original analytic R500 m circle, y=140 sin(theta); synthetic terrain validation, no surveyed data.",
  points: Array.from({ length: 40 }, (_, i) => {
    const theta = (i * 2 * Math.PI) / 40;
    return {
      x: 500 * Math.cos(theta),
      z: 500 * Math.sin(theta),
      y: 140 * Math.sin(theta),
      widthLeft: 8,
      widthRight: 8,
      banking: 0,
    };
  }),
};
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const findings = [];
const prefix = process.env.PRESENTATION_QA_PREFIX ?? "terrain";
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
async function bluePixels(page) {
  const png = await page.locator(".scene canvas").screenshot({
    style:
      ".scene * { visibility: hidden !important; } .scene canvas { visibility: visible !important; }",
  });
  return page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${base64}`)).blob(),
    );
    try {
      const copy = new OffscreenCanvas(bitmap.width, bitmap.height),
        context = copy.getContext("2d");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      ).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          pixels[i + 2] > pixels[i] + 35 &&
          pixels[i + 2] > pixels[i + 1] + 25
        )
          count++;
      return count;
    } finally {
      bitmap.close();
    }
  }, png.toString("base64"));
}
async function groundOcclusion(page, lap) {
  return page.evaluate(async (samples) => {
    const { _roots } =
      await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const { Raycaster, Vector3 } =
      await import("/node_modules/.vite/deps/three.js");
    const { scene, camera } = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    const terrain = scene.getObjectByName("context-terrain");
    if (!terrain)
      throw new Error("Terrain mesh is missing from the reviewed scene.");
    const obstacles = [];
    terrain.parent.traverse((node) => {
      if (node.isMesh) obstacles.push(node);
    });
    obstacles.push(
      scene.getObjectByName("road-asphalt"),
      scene.getObjectByName("road-shoulders"),
    );
    const ray = new Raycaster(),
      occluded = [];
    let inspected = 0;
    const probes = samples.flatMap((sample, index) => {
      const next = samples[index + 1];
      if (!next) return [sample];
      const fractions =
        Math.hypot(next.x - sample.x, next.y - sample.y, next.z - sample.z) > 12
          ? [0, 0.25, 0.5, 0.75]
          : [0];
      return fractions.map((t) => ({
        x: sample.x + (next.x - sample.x) * t,
        y: sample.y + (next.y - sample.y) * t,
        z: sample.z + (next.z - sample.z) * t,
      }));
    });
    probes.forEach((sample, index) => {
      const point = new Vector3(sample.x, sample.y + 0.63, sample.z);
      const screen = point.clone().project(camera);
      if (
        Math.abs(screen.x) > 1 ||
        Math.abs(screen.y) > 1 ||
        Math.abs(screen.z) > 1
      )
        return;
      inspected++;
      const direction = point.clone().sub(camera.position),
        distance = direction.length();
      ray.set(camera.position, direction.normalize());
      ray.far = distance - 0.02;
      const hits = ray.intersectObjects(obstacles, false);
      if (hits.length)
        occluded.push({
          index,
          ahead: distance - hits[0].distance,
          object: hits[0].object.name || hits[0].object.type,
        });
    });
    return { inspected, occluded };
  }, lap.samples);
}
async function shoulderCoverage(page) {
  return page.evaluate(async () => {
    const { _roots } =
      await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const { Raycaster, Vector3 } =
      await import("/node_modules/.vite/deps/three.js");
    const { scene } = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    const road = scene.getObjectByName("road-asphalt"),
      shoulders = scene.getObjectByName("road-shoulders");
    if (!road || !shoulders) throw new Error("Pavement meshes are missing.");
    const vertices = road.geometry.attributes.position,
      indices = road.geometry.index.array;
    const ray = new Raycaster(),
      origin = new Vector3(),
      vertex = new Vector3();
    const covered = [];
    for (let i = 0; i < indices.length; i += 3) {
      origin.set(0, 0, 0);
      for (let j = 0; j < 3; j++)
        origin.add(vertex.fromBufferAttribute(vertices, indices[i + j]));
      road.localToWorld(origin.multiplyScalar(1 / 3));
      origin.y += 30;
      ray.set(origin, new Vector3(0, -1, 0));
      ray.far = 30 - 0.005;
      if (ray.intersectObject(shoulders, false).length) covered.push(i / 3);
    }
    return { inspected: indices.length / 3, covered };
  });
}
// Preserve real terrain depth while matching the terrain-off background colour.
// Otherwise antialiasing against grass changes the mask even with no occlusion.
async function depthOnlyPixels(page) {
  const previous = await page.evaluate(async () => {
    const { _roots } =
      await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const state = _roots
      .get(document.querySelector(".scene canvas"))
      .store.getState();
    const values = new Map();
    state.scene.getObjectByName("context-terrain").parent.traverse((node) => {
      if (!node.isMesh) return;
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        if (!values.has(material.uuid))
          values.set(material.uuid, material.colorWrite);
        material.colorWrite = false;
      }
    });
    state.invalidate();
    return [...values];
  });
  try {
    return await bluePixels(page);
  } finally {
    await page.evaluate(async (previous) => {
      const { _roots } =
        await import("/node_modules/.vite/deps/@react-three_fiber.js");
      const state = _roots
        .get(document.querySelector(".scene canvas"))
        .store.getState();
      const values = new Map(previous);
      state.scene.getObjectByName("context-terrain").parent.traverse((node) => {
        if (!node.isMesh) return;
        for (const material of Array.isArray(node.material)
          ? node.material
          : [node.material])
          if (values.has(material.uuid))
            material.colorWrite = values.get(material.uuid);
      });
      state.invalidate();
    }, previous);
  }
}
try {
  for (const [width, height] of [
    [1600, 1000],
    [1280, 900],
    [390, 844],
  ])
    for (const source of [original, sparse, showcase].filter(
      (source) => !process.env.QA_TRACK || source.id === process.env.QA_TRACK,
    )) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.setDefaultTimeout(30000);
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("http://127.0.0.1:5173/");
      await expect(page.getByTestId("lap-time")).toBeVisible();
      if (source.id === showcase.id) {
        await page
          .getByRole("combobox", { name: "Track", exact: true })
          .selectOption(source.id);
        await expect(page.locator(".track-caption strong")).toHaveText(
          source.name,
        );
      } else if (source.id !== original.id) {
        await page
          .getByLabel("Import track file", { exact: true })
          .setInputFiles({
            name: "terrain-slope.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(source)),
          });
        await expect(
          page.getByRole("combobox", { name: "Track", exact: true }),
        ).toHaveValue(source.id);
      }
      const cursor = page.locator('[aria-label="Lap playback position"]');
      await cursor.fill("20");
      await page.getByRole("slider", { name: "Fuel load" }).fill("21");
      const before = await project(page),
        canvas = await page.locator("canvas").elementHandle();
      let requests = 0;
      page.on("request", (request) => {
        if (request.url().endsWith("/api/simulate")) requests++;
      });
      if (source.id === sparse.id) {
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Braking zones", exact: true })
          .uncheck();
      }
      async function capture(mode, terrain) {
        await page
          .getByRole("tab", { name: "Track View", exact: true })
          .click();
        await page.locator(".track-panel").screenshot({
          path: `artifacts/${prefix}-${width}-${source.id}-${mode.replaceAll(" ", "-")}-${terrain ? "on" : "off"}.png`,
        });
        const pixels = await bluePixels(page);
        const finding = {
          width,
          height,
          source: source.id,
          mode,
          terrain,
          pixels,
          cursor: 20,
          requests,
          errors,
          passed: false,
        };
        findings.push(finding);
        expect(
          await canvas.evaluate(
            (node) => node === document.querySelector("canvas"),
          ),
        ).toBe(true);
        await expect(cursor).toHaveAttribute("value", "20");
        expect(requests).toBe(0);
        expect(errors).toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
        finding.passed = true;
        return pixels;
      }
      const pavement = await shoulderCoverage(page);
      expect(pavement.inspected).toBeGreaterThan(0);
      expect(pavement.covered).toEqual([]);
      for (const mode of ["Top View", "3D View"]) {
        await page.getByRole("button", { name: mode, exact: true }).click();
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Terrain & trees", exact: true })
          .uncheck();
        const without = await capture(mode, false);
        await page
          .getByRole("tab", { name: "Analysis Layers", exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "Terrain & trees", exact: true })
          .check();
        await capture(mode, true);
        expect(without).toBeGreaterThan(100);
        const visibility = await groundOcclusion(page, before.lap);
        findings.at(-1).visibility = visibility;
        findings.at(-1).pavement = pavement;
        expect(visibility.inspected).toBeGreaterThan(0);
        expect(visibility.occluded).toEqual([]);
        const depthPixels = await depthOnlyPixels(page);
        findings.at(-1).depthPixels = depthPixels;
        expect(depthPixels / without).toBeGreaterThan(0.98);
      }
      await page.getByRole("button", { name: "Chase", exact: true }).click();
      await capture("Chase", true);
      expect(await project(page)).toEqual(before);
      await page.close();
    }
} finally {
  await writeFile(
    `artifacts/${prefix}-qa.json`,
    JSON.stringify(findings, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify(findings, null, 2));
