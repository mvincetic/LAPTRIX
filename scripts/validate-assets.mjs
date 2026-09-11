import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { Box3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
async function ownedPath(path) {
  assert.equal(typeof path, "string");
  const absolute = await realpath(resolve(root, path));
  const within = relative(root, absolute);
  assert(
    !isAbsolute(within) && !within.startsWith(".."),
    "Asset paths must stay inside the repository.",
  );
  return absolute;
}
const bounded = (value, low, high) =>
  assert(
    Number.isFinite(value) && value >= low && value <= high,
    `Asset dimension ${value} is outside ${low}–${high}.`,
  );
const manifest = JSON.parse(
  await readFile(resolve(root, "assets/manifest.json"), "utf8"),
);
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.units, "metres");
assert.equal(manifest.up, "+Y");
assert.equal(manifest.forward, "+Z");
assert.equal(manifest.handedness, "right");
assert.equal(
  manifest.assets.length,
  5,
  "Register a validator when adding another asset package.",
);
const ids = new Set();
for (const entry of manifest.assets) {
  assert(!ids.has(entry.id), "Asset IDs must be unique.");
  ids.add(entry.id);
  assert(
    [
      "laptrix.guardrail.v1",
      "laptrix.formula-body.v1",
      "laptrix.gt-body.v1",
      "laptrix.dev-start-pylon.v1",
      "laptrix.daylight.v1",
    ].includes(entry.id),
  );
  for (const field of ["origin", "provenance", "rights"])
    assert(entry[field]?.length > 10);
  assert.deepEqual(entry.thirdPartySources, []);
  assert(entry.parameters.startsWith("assets/"));
  await ownedPath(entry.implementation);
  const asset = JSON.parse(
    await readFile(await ownedPath(entry.parameters), "utf8"),
  );
  assert.equal(asset.id, entry.id);
  if (entry.id === "laptrix.daylight.v1") {
    assert.equal(entry.format, "procedural");
    assert.equal(entry.category, "environment");
    for (const color of [
      asset.background,
      asset.hemisphere.sky,
      asset.hemisphere.ground,
      asset.environment.sky,
      asset.environment.horizon,
      asset.environment.ground,
    ])
      assert.match(color, /^#[0-9a-f]{6}$/);
    assert.equal(asset.environment.width, 128);
    assert.equal(asset.environment.height, 64);
    bounded(asset.environment.gradientPower, 0.1, 2);
    bounded(asset.environment.sunRadiance, 0, 5);
    bounded(asset.environment.sunSpread, 0.005, 0.1);
    bounded(asset.environment.intensity, 0, 1);
    bounded(asset.hemisphere.intensity, 0, 2);
    assert.equal(asset.sun.direction.length, 3);
    asset.sun.direction.forEach((n) => bounded(n, -30, 30));
    assert(asset.sun.direction[1] > 0);
    bounded(asset.sun.intensity, 0, 4);
    bounded(asset.sun.distance, 20, 60);
    bounded(asset.sun.shadowRadius, 8, 16);
    assert.equal(asset.sun.shadowSize, 1024);
    bounded(asset.sun.near, 0.1, asset.sun.distance - 10);
    bounded(asset.sun.far, asset.sun.distance + 10, 100);
    bounded(asset.sun.bias, -0.001, 0);
    bounded(asset.sun.normalBias, 0, 0.05);
    continue;
  } else if (entry.id === "laptrix.dev-start-pylon.v1") {
    assert.equal(entry.format, "glb");
    assert.equal(entry.category, "trackside");
    const bytes = await readFile(await ownedPath(entry.runtimeFile));
    bounded(entry.maxBytes, 1, 65536);
    assert(bytes.length <= entry.maxBytes);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
    const json = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    assert(
      json.buffers.every((buffer) => !buffer.uri),
      "GLB must embed every buffer.",
    );
    assert.equal(json.images?.length ?? 0, 0);
    assert.equal(json.animations?.length ?? 0, 0);
    assert.equal(json.extensionsRequired?.length ?? 0, 0);
    const model = await new GLTFLoader().parseAsync(
      Uint8Array.from(bytes).buffer,
      "",
    );
    let batches = 0,
      triangles = 0;
    model.scene.traverse((mesh) => {
      if (!mesh.isMesh) return;
      batches++;
      assert(!Array.isArray(mesh.material));
      assert(mesh.material.isMeshStandardMaterial);
      assert(mesh.geometry.index);
      triangles += mesh.geometry.index.count / 3;
      for (const name of ["position", "normal"])
        assert(
          Array.from(mesh.geometry.getAttribute(name).array).every(
            Number.isFinite,
          ),
        );
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    assert.equal(batches, entry.materialBatches);
    assert.equal(batches, 3);
    bounded(entry.maxTriangles, 1, 500);
    assert(triangles <= entry.maxTriangles);
    const bounds = new Box3().setFromObject(model.scene);
    const expected = [
      -asset.foot.width / 2,
      0,
      -asset.foot.depth / 2,
      asset.foot.width / 2,
      asset.frame.height,
      asset.foot.depth / 2,
    ];
    [...bounds.min.toArray(), ...bounds.max.toArray()].forEach((value, i) =>
      assert(Math.abs(value - expected[i]) < 1e-5),
    );
    bounded(asset.frame.width, 2, 4);
    bounded(asset.frame.height, 3, 5);
    bounded(asset.frame.depth, 0.3, 0.6);
    assert.equal(asset.materials.length, 3);
    for (const material of asset.materials) {
      assert(/^#[0-9a-f]{6}$/i.test(material.color));
      bounded(material.roughness, 0, 1);
      bounded(material.metalness, 0, 1);
    }
    const placement = JSON.parse(
      await readFile(await ownedPath(entry.placement), "utf8"),
    );
    assert.equal(placement.assetId, entry.id);
    assert(/^sha256:[a-f0-9]{64}$/.test(placement.sourceFingerprint));
    bounded(placement.placements.length, 1, 8);
    for (const site of placement.placements) {
      bounded(site.progress, 0, 0.9999);
      assert([1, -1].includes(site.side));
      bounded(
        site.edgeOffset,
        Math.hypot(placement.foundation.width, placement.foundation.depth) / 2 +
          placement.roadReserve +
          0.1,
        14,
      );
    }
    bounded(placement.foundation.width, asset.foot.width, 4.5);
    bounded(placement.foundation.depth, asset.foot.depth, 2);
    bounded(placement.foundation.embed, 0.1, 0.3);
    bounded(placement.foundation.clearance, 0.03, 0.15);
    bounded(placement.foundation.maxHeight, 0.5, 1.2);
    bounded(placement.roadReserve, 0.5, 1.5);
    continue;
  }
  assert.equal(entry.format, "procedural");
  if (entry.id === "laptrix.gt-body.v1") {
    assert.equal(entry.category, "vehicles");
    bounded(asset.overhang, 1.4, 2.2);
    bounded(asset.wheelClearance, 0.04, 0.09);
    bounded(asset.coreClearance, 0.025, 0.08);
    bounded(asset.archSteps, 12, 32);
    assert(Number.isInteger(asset.archSteps));
    bounded(asset.windowInset, 0.02, 0.08);
    bounded(asset.windowLift, 0.002, 0.006);
    for (const part of ["body", "cabin"]) {
      bounded(asset[part].length, 4, 12);
      let previous = -Infinity;
      for (const row of asset[part]) {
        assert.equal(row.length, part === "body" ? 5 : 4);
        const [z, width, bottom, top] = row;
        bounded(z, part === "body" ? -0.5 : -0.4, part === "body" ? 0.5 : 0.3);
        assert(z > previous, "GT stations must increase rear to front.");
        previous = z;
        bounded(width, 0.2, part === "body" ? 0.5 : 0.42);
        bounded(
          bottom,
          part === "body" ? 0.12 : 0.6,
          part === "body" ? 0.35 : 0.9,
        );
        bounded(top, bottom + 0.02, part === "body" ? 1.1 : 1.35);
        if (part === "body") bounded(row[4], top, 1.15);
      }
    }
    assert.equal(asset.body[0][0], -0.5);
    assert.equal(asset.body.at(-1)[0], 0.5);
    assert.equal(asset.cabinSection.length, 8);
    for (let i = 0; i < asset.cabinSection.length; i++) {
      const a = asset.cabinSection[i],
        b = asset.cabinSection[(i + 1) % 8],
        c = asset.cabinSection[(i + 2) % 8];
      assert.equal(a.length, 2);
      bounded(a[0], -1, 1);
      bounded(a[1], 0, 1);
      assert((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 0);
    }
    assert.equal(asset.windows.length, 6);
    for (const row of asset.windows) {
      assert.equal(row.length, 3);
      const [edge, from, to] = row;
      assert([2, 4, 6].includes(edge));
      bounded(from, asset.cabin[0][0], asset.cabin.at(-1)[0] - 0.01);
      bounded(to, from + 0.01, asset.cabin.at(-1)[0]);
    }
    for (const edge of [2, 4, 6]) {
      const windows = asset.windows
        .filter((row) => row[0] === edge)
        .sort((a, b) => a[1] - b[1]);
      assert.equal(windows.length, 2);
      assert(
        windows[1][1] - windows[0][2] >= 0.01,
        "Retain paint between GT windows.",
      );
    }
    continue;
  }
  if (entry.id === "laptrix.formula-body.v1") {
    assert.equal(entry.category, "vehicles");
    bounded(asset.section.length, 8, 24);
    // Convex counterclockwise rings allow closed, outward-facing fan caps.
    for (let i = 0; i < asset.section.length; i++) {
      const a = asset.section[i],
        b = asset.section[(i + 1) % asset.section.length],
        c = asset.section[(i + 2) % asset.section.length];
      assert.equal(a.length, 2);
      bounded(a[0], -1, 1);
      bounded(a[1], 0, 1);
      assert((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 0);
    }
    bounded(asset.sidepodOffset, 0.25, 0.35);
    for (const part of ["chassis", "sidepod", "engineCover", "floor"]) {
      bounded(asset[part].length, 4, 12);
      let previous = -Infinity;
      for (const row of asset[part]) {
        assert.equal(row.length, 4);
        const [z, width, bottom, top] = row;
        bounded(z, -0.7, 0.7);
        assert(z > previous, "Body stations must increase rear to front.");
        previous = z;
        bounded(
          width,
          0.02,
          part === "sidepod" ? 0.48 - asset.sidepodOffset : 0.48,
        );
        bounded(bottom, 0.08, 0.6);
        bounded(top, bottom + 0.01, 1.08);
      }
    }
    continue;
  }
  assert.equal(entry.category, "trackside");
  bounded(asset.edgeOffset, 5, 16);
  bounded(asset.maxGroundChange, 0.05, 0.25);
  // Current placement shares the apron renderer's six-metre gates.
  assert.equal(asset.postSpacing, 6);
  bounded(asset.roadReserve, 0.3, 2);
  bounded(asset.profile.length, 3, 12);
  let previous = 0;
  for (const [offset, height] of asset.profile) {
    bounded(offset, -0.2, 0.2);
    bounded(height, 0.25, 1.2);
    assert(height > previous, "Rail profile heights must increase.");
    previous = height;
  }
  bounded(asset.post.width, 0.05, 0.3);
  assert(
    asset.maxGroundChange < asset.profile[0][1] - 0.11,
    "The beam must remain above the road edge.",
  );
  bounded(asset.post.depth, 0.05, 0.3);
  bounded(asset.post.height, 0.5, 1.5);
  bounded(asset.post.embed, 0.05, 0.3);
  assert(asset.post.height - asset.post.embed >= previous);
  bounded(asset.reflector.everyPosts, 1, 20);
  assert(Number.isInteger(asset.reflector.everyPosts));
  for (const axis of ["width", "height", "depth"])
    bounded(asset.reflector[axis], 0.02, 0.3);
  bounded(asset.reflector.elevation, 0.4, 1.2);
  assert(
    asset.reflector.elevation + asset.reflector.height / 2 <=
      asset.post.height - asset.post.embed,
  );
  for (const key of ["rail", "post", "reflector"])
    assert(/^#[0-9a-f]{6}$/i.test(asset.materials[key]));
}
console.log(`Validated ${ids.size} original asset packages.`);
