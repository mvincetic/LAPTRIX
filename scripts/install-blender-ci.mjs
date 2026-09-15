import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, URL } from "node:url";

assert.equal(
  process.platform,
  "linux",
  "This installer is for the isolated Linux Blender CI job",
);
assert.equal(process.arch, "x64");
const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(
  await readFile(join(root, "assets/blender/toolchain.json"), "utf8"),
);
const archive = config.archives["linux-x64"];
assert.equal(new URL(archive.url).origin, "https://download.blender.org");
assert.match(archive.sha256, /^[0-9a-f]{64}$/);
const destination = join(root, "artifacts/blender-toolchain");
await mkdir(destination, { recursive: true });
const filename = join(
  destination,
  `blender-${config.version}-linux-x64.tar.xz`,
);
if (!existsSync(filename)) {
  const response = await globalThis.fetch(archive.url);
  assert(
    response.ok && response.body,
    `Official Blender download failed: ${response.status}`,
  );
  await pipeline(Readable.fromWeb(response.body), createWriteStream(filename));
}
const hash = createHash("sha256");
for await (const chunk of createReadStream(filename)) hash.update(chunk);
assert.equal(
  hash.digest("hex"),
  archive.sha256,
  "Official Blender archive checksum differs",
);
const result = spawnSync("tar", ["-xf", filename, "-C", destination], {
  stdio: "inherit",
});
assert.equal(result.status, 0, "Blender archive extraction failed");
const executable = join(
  destination,
  `blender-${config.version}-linux-x64`,
  "blender",
);
assert(existsSync(executable), "Missing Blender executable after extraction");
if (process.env.GITHUB_ENV)
  await appendFile(process.env.GITHUB_ENV, `BLENDER_PATH=${executable}\n`);
console.log(
  `Installed checksum-verified official Blender ${config.version} inside the CI workspace.`,
);
