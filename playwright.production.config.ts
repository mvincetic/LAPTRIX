import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: [
    "viewer-loading.spec.ts",
    "viewer-recovery.spec.ts",
    "csv-worker.spec.ts",
    "showcase-track.spec.ts",
    "viewer-controls.spec.ts",
    "portrait-chase.spec.ts",
    "sector-labels.spec.ts",
    "playback-entry.spec.ts",
    "onboard-camera.spec.ts",
    "viewer-layers.spec.ts",
    "track-select.spec.ts",
    "plot-ticks.spec.ts",
    "trackside-delivery.spec.ts",
    "daylight-recovery.spec.ts",
    "foliage-delivery.spec.ts",
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:5174" },
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: "npx vite preview --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
