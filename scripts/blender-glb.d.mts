import type { Buffer } from "node:buffer";
export type BlenderConfig = {
  id: string;
  rootNode: string;
  maxBytes: number;
  maxTriangles: number;
  maxMeshes: number;
  maxMaterials: number;
  maxTextures: number;
  maxTextureSize: number;
  bounds: { min: number[]; max: number[]; tolerance: number };
  requiredNodes: Record<string, number[]>;
};
export type BlenderReport = {
  bytes: number;
  triangles: number;
  primitives: number;
  materials: number;
  nodes: Record<string, number[]>;
  bounds: { min: number[]; max: number[] };
  images: { sha256: string; width: number; height: number; bytes: number }[];
  semanticSha256: string;
};
export function sha256(bytes: Buffer | string): string;
export function ownedAssetPath(root: string, value: string): Promise<string>;
export function inspectBlenderGlb(
  bytes: Buffer,
  config: BlenderConfig,
): BlenderReport;
export function validateBlenderEntry(
  root: string,
  entry: Record<string, unknown>,
): Promise<BlenderReport>;
