import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { createServer } from "vite";

// Run the SAME source/road/terrain implementation used by the browser.
// This exports an authoring reference; it cannot write simulation data.
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const [
    { normalizeTrack, trackFingerprint },
    { createTerrainSurface },
    roads,
  ] = await Promise.all([
    server.ssrLoadModule("/packages/track-engine/index.ts"),
    server.ssrLoadModule("/packages/track-engine/terrain.ts"),
    server.ssrLoadModule("/apps/web/src/road-presentation.ts"),
  ]);
  const track = JSON.parse(
    await readFile(join(root, "data/tracks/red-bull-ring.json"), "utf8"),
  );
  const fingerprint = await trackFingerprint(track);
  assert.equal(
    fingerprint,
    "sha256:6269176570597be6d70057566a045d193bdbc18f3e59db8cad141c33798c4118",
  );
  const frame = normalizeTrack(track),
    terrain = createTerrainSurface(track);
  const context = {
    schemaVersion: 1,
    sourceFile: "data/tracks/red-bull-ring.json",
    sourceFingerprint: fingerprint,
    units: "metres",
    up: "+Y",
    forward: "+Z",
    origin: [0, 0, 0],
    attribution: track.attribution,
    note: "Derived authoring reference from authoritative source and existing presentation functions. Context terrain is inferred from the road, not a facility survey. Buildings/props are original approximate scenery.",
    length: frame.length,
    points: track.points,
    distances: frame.distances,
    normals: frame.normals,
    tangents: frame.tangents,
    road: roads.roadSurface(track),
    shoulders: roads.roadShoulders(track),
    apron: roads.roadApron(track, terrain),
    terrain: { positions: terrain.positions, indices: terrain.indices },
  };
  const text =
    JSON.stringify(context, (_, value) =>
      ArrayBuffer.isView(value) ? Array.from(value) : value,
    ) + "\n";
  const destination = join(
    root,
    "assets/blender/tracks/red-bull-ring-context.json",
  );
  if (process.argv.includes("--check"))
    assert.equal(
      await readFile(destination, "utf8"),
      text,
      "Blender track authoring context is stale",
    );
  else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, text);
  }
  console.log(
    `Verified Red Bull Ring authoring frame: ${frame.length.toFixed(3)} m, ${track.points.length} points, ${Buffer.byteLength(text)} bytes.`,
  );
} finally {
  await server.close();
}
