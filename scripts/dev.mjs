import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const windows = process.platform === "win32";
const venv = windows ? ".venv/Scripts/python.exe" : ".venv/bin/python";
const python = existsSync(venv) ? venv : "python";
const processes = [
  spawn(
    python,
    [
      "-m",
      "uvicorn",
      "apps.simulation.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) child.kill();
  process.exitCode = code;
}
for (const child of processes) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
