import type { Buffer } from "node:buffer";
export type RegionalSettings = { context: string; contextSha256: string };
export type RegionalGrid = {
  format: string;
  size: number;
  heights: number[][];
  boundsXZ: number[];
  originUtm33n: number[];
  heightDatumMetres: number;
  sourceManifest: string;
  sourceManifestSha256: string;
  attribution: {
    title: string;
    credit: string;
    license: string;
    url: string;
    licenseUrl: string;
  };
};
export function validateRegionalSource(
  settings: RegionalSettings,
  readBytes: (path: string) => Promise<Buffer>,
): Promise<RegionalGrid>;
