import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import {
  inspectBlenderGlb,
  ownedAssetPath,
  sha256,
  validateBlenderEntry,
} from "./blender-glb.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const toolchain = JSON.parse(
  await readFile(join(root, "assets/blender/toolchain.json"), "utf8"),
);
const [mode = "inspect", assetId, ...flags] = process.argv.slice(2);
assert(
  ["inspect", "author", "export", "check"].includes(mode),
  "Use inspect, author, export or check",
);
assert(flags.every((flag) => flag === "--replace-source"));
const majorMinor = toolchain.version.split(".").slice(0, 2).join(".");
const lookup = spawnSync(
  process.platform === "win32" ? "where.exe" : "which",
  ["blender"],
  { encoding: "utf8", windowsHide: true },
);
const candidates = process.env.BLENDER_PATH
  ? [process.env.BLENDER_PATH]
  : [
      ...(lookup.stdout ?? "").trim().split(/\r?\n/),
      join(
        process.env.ProgramFiles ?? "C:\\Program Files",
        "Blender Foundation",
        `Blender ${majorMinor}`,
        "blender.exe",
      ),
      join(
        root,
        "artifacts/blender-toolchain",
        `blender-${toolchain.version}-linux-x64`,
        "blender",
      ),
      "/Applications/Blender.app/Contents/MacOS/Blender",
    ].filter(Boolean);
let executable, versionText;
for (const candidate of candidates) {
  if (!existsSync(candidate)) continue;
  const result = spawnSync(candidate, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
  });
  if (
    result.status === 0 &&
    result.stdout.match(/^Blender (\d+\.\d+\.\d+)/m)?.[1] === toolchain.version
  ) {
    executable = resolve(candidate);
    versionText = result.stdout;
    break;
  }
}
assert(
  executable,
  `Blender ${toolchain.version} is required. Set BLENDER_PATH to the official executable; see docs/BLENDER_PIPELINE.md.`,
);
const artifactRoot = join(root, "artifacts/blender");
await mkdir(artifactRoot, { recursive: true });
await writeFile(
  join(artifactRoot, "toolchain-local.json"),
  JSON.stringify(
    {
      version: toolchain.version,
      executable,
      build: versionText.split(/\r?\n/).slice(0, 9),
    },
    null,
    2,
  ) + "\n",
);

function runBlender(source, script, extra = []) {
  const args = ["--background", "--factory-startup", "--disable-autoexec"];
  if (source) args.push(source);
  args.push("--python-exit-code", "1", "--python", script);
  if (extra.length) args.push("--", ...extra);
  const result = spawnSync(executable, args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    timeout: 600000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "Blender validation/export failed");
}

if (mode === "inspect") {
  console.log(
    `Verified Blender ${toolchain.version}; local executable/build record: artifacts/blender/toolchain-local.json`,
  );
} else {
  const manifestPath = join(root, "assets/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entries = manifest.assets.filter(
    (entry) =>
      entry.format === "blender-glb" && (!assetId || entry.id === assetId),
  );
  assert(entries.length, "No registered Blender asset matches");
  assert(
    mode !== "author" || (assetId && entries.length === 1),
    "Author one explicit asset at a time",
  );
  const prepared = [];
  for (const entry of entries) {
    const config = JSON.parse(
      await readFile(await ownedAssetPath(root, entry.parameters), "utf8"),
    );
    if (mode === "author") {
      assert(
        !existsSync(join(root, entry.sourceFile)) ||
          flags.includes("--replace-source"),
        "Authoring replaces the editable source. Use --replace-source for an intentional rebuild; ordinary export preserves edits.",
      );
      runBlender(null, await ownedAssetPath(root, entry.implementation));
      continue;
    }
    const sourcePath = await ownedAssetPath(root, entry.sourceFile);
    const sourceSha256 = sha256(await readFile(sourcePath));
    const previous =
      mode === "check" ? await validateBlenderEntry(root, entry) : null;
    const destination = join(artifactRoot, `${mode}-${process.pid}`, entry.id);
    await mkdir(destination, { recursive: true });
    const temporary = join(destination, "model.glb");
    runBlender(sourcePath, join(root, "scripts/blender/export_glb.py"), [
      "--asset",
      entry.id,
      "--output",
      relative(root, temporary).replaceAll("\\", "/"),
    ]);
    assert.equal(
      sha256(await readFile(sourcePath)),
      sourceSha256,
      "Editable source changed during export",
    );
    const bytes = await readFile(temporary),
      report = inspectBlenderGlb(bytes, config);
    if (mode === "check") {
      assert.equal(
        report.semanticSha256,
        previous.semanticSha256,
        "Blender re-export differs from the checked-in geometry/materials/rig. Run npm run blender:export.",
      );
      const identical = sha256(bytes) === entry.sha256;
      console.log(
        `Verified ${entry.id}: ${identical ? "byte-identical" : "equivalent within documented float precision"} export (${report.bytes} bytes).`,
      );
    } else prepared.push({ entry, bytes, report, sourceSha256 });
  }
  for (const { entry, bytes, report, sourceSha256 } of prepared) {
    const runtime = resolve(root, entry.runtimeFile);
    assert(
      !relative(root, runtime).startsWith(".."),
      "Runtime destination escapes the repository",
    );
    await mkdir(dirname(runtime), { recursive: true });
    // The final parent must also be owned if an artist added a symlink in the tree.
    await ownedAssetPath(
      root,
      relative(root, dirname(runtime)).replaceAll("\\", "/"),
    );
    const temporary = `${runtime}.${process.pid}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, runtime);
    Object.assign(entry, {
      sourceSha256,
      sha256: sha256(bytes),
      semanticSha256: report.semanticSha256,
      materialBatches: report.primitives,
    });
    console.log(
      `Placed ${entry.runtimeFile}: ${report.triangles} triangles, ${report.primitives} primitives, ${report.bytes} bytes.`,
    );
  }
  if (prepared.length) {
    await writeFile(
      `${manifestPath}.tmp`,
      JSON.stringify(manifest, null, 2) + "\n",
    );
    await rename(`${manifestPath}.tmp`, manifestPath);
  }
  if (mode === "check")
    runBlender(
      join(root, "assets/blender/shared/basis-gauge.blend"),
      join(root, "scripts/blender/probe_contract.py"),
    );
}
