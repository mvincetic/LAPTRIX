import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
const venv =
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python";
const result = spawnSync(
  existsSync(venv) ? venv : "python",
  process.argv.slice(2),
  { stdio: "inherit" },
);
if (result.error)
  console.error(
    `Python could not start: ${result.error.message}. See README.md for environment setup.`,
  );
process.exit(result.status ?? 1);
