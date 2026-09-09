# Development

Run all commands from the repository root. Install with `npm ci`, create `.venv`
with Python 3.12, and install `requirements.txt` using that environment's Python.
The launcher selects `.venv/Scripts/python.exe` on Windows or `.venv/bin/python`
on Unix; it falls back to `python` only when no local environment exists.

`npm run dev` supervises Vite at 127.0.0.1:5173 and Uvicorn at 127.0.0.1:8000.
Vite proxies `/api`; the frontend uses relative URLs. There are no secrets or
environment variables required for this development setup. Do not bind the Python
service publicly without an explicit deployment/authentication design.

The backend does not hot-reload by default: restart the dev process after Python
changes. Frontend edits use Vite HMR. Individual commands `npm run dev:web` and
`npm run dev:api` are available when debugging process startup.

The Vite watcher waits 200 ms for writes to stabilize. This prevents a Windows
formatter's truncate/write sequence from being cached as an empty source module.
If an interrupted write leaves a stale HMR module, restart the development command.

Quality gate: `npm run check`. Browser regression: `npm run test:e2e` after
`npx playwright install chromium`. `node scripts/visual-qa.mjs` captures desktop
and mobile screenshots and reports browser runtime errors. Open the actual PNGs
to evaluate composition; a passing screenshot command is not visual inspection.
Add `--refinement` to that script for screenshots of the optional lap-time mode.
`npm run study:solver` writes `artifacts/solver-study.json` and prints the grid study.
Use `npm run study:solver -- --counts 360 720` for a shorter run. The script resamples
the synthetic catalog input, changes no source data and does not start the servers.
`npm run study:sampling` compares production source/5 m/3 m modes on one unchanged
source. `node scripts/visual-qa.mjs --sampling --refinement` captures the combined
resampling/refinement workflow. Browser comparison tests exercise unequal grids.

Use `npx prettier --write <files>` and `npm run format:python` for formatting.
Changes to data or numerical logic need focused tests. Keep expensive Three.js
resources memoized, dispose them on replacement, and avoid allocating mesh geometry
inside animation loops. Update architecture, schema, model and roadmap docs when
contracts change. Keep normal debug output free of imported proprietary data.

`npm run build` emits the static frontend. Local use continues to require the API;
the Vite development proxy is not a production reverse proxy. No deployment has
been configured. CI runs lint, typecheck, unit/API tests, production build and
Chromium journey tests without paid services.
