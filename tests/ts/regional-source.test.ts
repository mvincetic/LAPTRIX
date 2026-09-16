import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  validateRegionalSource,
  type RegionalGrid,
} from "../../scripts/regional-source.mjs";

const context = "assets/blender/tracks/red-bull-ring-regional.json";
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const reader = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url));

describe("independent regional source contract", () => {
  it("binds the prepared landscape to pinned survey bytes and the exact circuit frame", async () => {
    const bytes = await reader(context);
    const grid = await validateRegionalSource(
      { context, contextSha256: digest(bytes) },
      reader,
    );
    expect(grid.originUtm33n).toEqual([482338.48236549797, 5229671.71170846]);
    expect(grid.heightDatumMetres).toBe(677.4140047504789);
    expect(grid.attribution.license).toBe("CC BY 4.0");
  });

  it("rejects changed source bytes before accepting a visually plausible grid", async () => {
    const bytes = await reader(context);
    const settings = { context, contextSha256: digest(bytes) };
    for (const suffix of [
      "manifest.json",
      "terrain-20m.tif",
      "flight-blocks.json",
    ])
      await expect(
        validateRegionalSource(settings, (path) =>
          path.endsWith(suffix)
            ? Promise.resolve(Buffer.from("{}"))
            : reader(path),
        ),
      ).rejects.toThrow();
    await expect(
      validateRegionalSource({ ...settings, contextSha256: "stale" }, reader),
    ).rejects.toThrow(/context/);
  });

  it("rejects origin, datum and attribution drift even when the grid hash is updated", async () => {
    const raw = await reader(context);
    for (const change of [
      (grid: RegionalGrid) => {
        grid.originUtm33n[0] += 1;
      },
      (grid: RegionalGrid) => {
        grid.heightDatumMetres += 1;
      },
      (grid: RegionalGrid) => {
        grid.boundsXZ[0] += 1;
      },
      (grid: RegionalGrid) => {
        grid.attribution.credit = "No source";
      },
    ]) {
      const grid = JSON.parse(raw.toString()) as RegionalGrid;
      change(grid);
      const bytes = Buffer.from(JSON.stringify(grid));
      await expect(
        validateRegionalSource(
          { context, contextSha256: digest(bytes) },
          (path) => (path === context ? Promise.resolve(bytes) : reader(path)),
        ),
      ).rejects.toThrow(/Regional/);
    }
  });
});
