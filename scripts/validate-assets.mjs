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
  1,
  "Register a validator when adding another asset package.",
);
const ids = new Set();
for (const entry of manifest.assets) {
  assert(!ids.has(entry.id), "Asset IDs must be unique.");
  ids.add(entry.id);
  assert.equal(entry.id, "laptrix.guardrail.v1");
  assert.equal(entry.category, "trackside");
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
