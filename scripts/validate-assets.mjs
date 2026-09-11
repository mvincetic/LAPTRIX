import assert from "node:assert/strict";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

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
  3,
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
    ].includes(entry.id),
  );
  assert.equal(entry.format, "procedural");
  for (const field of ["origin", "provenance", "rights"])
    assert(entry[field]?.length > 10);
  assert.deepEqual(entry.thirdPartySources, []);
  assert(entry.parameters.startsWith("assets/"));
  await ownedPath(entry.implementation);
  const asset = JSON.parse(
    await readFile(await ownedPath(entry.parameters), "utf8"),
  );
  assert.equal(asset.id, entry.id);
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
console.log(`Validated ${ids.size} original procedural asset package.`);
