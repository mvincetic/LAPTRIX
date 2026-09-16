import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { posix } from "node:path";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Independent offline source chain used by the GLB package validator. */
export async function validateRegionalSource(settings, readBytes) {
  const raw = await readBytes(settings.context);
  assert.equal(
    digest(raw),
    settings.contextSha256,
    "Regional context hash differs",
  );
  const grid = JSON.parse(raw.toString("utf8"));
  assert.equal(grid.format, "laptrix-regional-terrain-grid-v1");
  assert.equal(grid.size, 55);
  assert.equal(grid.heights.length, grid.size);
  assert(
    grid.heights.every(
      (row) => row.length === grid.size && row.every(Number.isFinite),
    ),
  );
  const manifestRaw = await readBytes(grid.sourceManifest);
  assert.equal(
    digest(manifestRaw),
    grid.sourceManifestSha256,
    "Regional manifest hash differs",
  );
  const manifest = JSON.parse(manifestRaw.toString("utf8"));
  assert.equal(manifest.format, "laptrix-regional-terrain-source-v1");
  assert.equal(manifest.pixelMetres, 20);
  assert.equal(manifest.width, 300);
  assert.equal(manifest.height, 300);
  assert.deepEqual(
    grid.attribution,
    manifest.attribution,
    "Regional attribution differs",
  );
  assert.equal(manifest.attribution.license, "CC BY 4.0");
  assert.equal(
    manifest.attribution.credit,
    "Datenquelle: CC-BY-4.0: Land Steiermark - data.steiermark.gv.at",
  );
  assert.deepEqual(Object.keys(manifest.files).sort(), [
    "flight-blocks.json",
    "terrain-20m.tif",
    "wcs-capabilities.xml",
  ]);
  const directory = posix.dirname(grid.sourceManifest);
  for (const [name, record] of Object.entries(manifest.files)) {
    const source = await readBytes(posix.join(directory, name));
    assert.equal(
      source.length,
      record.bytes,
      "Regional source byte count differs",
    );
    assert.equal(digest(source), record.sha256, "Regional source hash differs");
  }
  assert(
    (await readBytes(posix.join(directory, manifest.licenseFile))).includes(
      "Attribution 4.0 International",
    ),
  );
  const frameRaw = await readBytes(
    "data/sources/red-bull-ring/reconstruction.json",
  );
  assert.equal(
    digest(frameRaw),
    manifest.trackReconstructionSha256,
    "Regional coordinate frame differs",
  );
  const frame = JSON.parse(frameRaw.toString("utf8"));
  assert.deepEqual(
    grid.originUtm33n,
    frame.originUtm33n,
    "Regional origin differs",
  );
  assert.equal(
    grid.heightDatumMetres,
    frame.filteredAbsoluteHeightRangeMetres[0],
    "Regional height datum differs",
  );
  const [west, south, east, north] = manifest.boundsUtm33n,
    [x, y] = frame.originUtm33n;
  const expected = [
    west + 10 - x,
    y - north + 10,
    east - 10 - x,
    y - south - 10,
  ];
  assert.deepEqual(
    grid.boundsXZ,
    expected.map((v) => Math.round(v * 1e4) / 1e4),
    "Regional bounds differ",
  );
  return grid;
}
