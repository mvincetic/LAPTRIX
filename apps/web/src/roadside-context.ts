import type { Track } from "../../../packages/shared/schema";
import type { Vec3 } from "../../../packages/track-engine";
import {
  terrainHeightAt,
  TERRAIN_CLEARANCE,
  type TerrainSurface,
} from "../../../packages/track-engine/terrain";
import asset from "../../../assets/trackside/guardrail.json";
import { roadPieces, SHOULDER_SURFACE_LIFT } from "./road-presentation";
import { roadClearance } from "./road-clearance";

export { asset as guardrailAsset };
export type RoadsidePost = {
  position: Vec3;
  yaw: number;
  distance: number;
  side: 1 | -1;
};

/** Original source-framed visual context; no circuit identity or telemetry dependency. */
export function roadsideContext(track: Track, surface: TerrainSurface) {
  const { pieces, edge } = roadPieces(track, asset.postSpacing);
  const clear = roadClearance(track),
    rails: number[] = [],
    posts: RoadsidePost[] = [],
    reflectors: RoadsidePost[] = [];
  let omittedSpans = 0;
  for (const { i, from, to, distance } of pieces)
    for (const side of [1, -1] as const) {
      // Both endpoints lie on exact apron cross-sections, outside the shoulder.
      const base = (t: number) => {
        const inner = edge(i, t, side, 4, SHOULDER_SURFACE_LIFT - 0.02),
          outer = edge(i, t, side, 18, 0);
        outer[1] =
          (terrainHeightAt(surface, outer[0], outer[2]) ??
            outer[1] - TERRAIN_CLEARANCE) - 0.1;
        const fraction = Math.min(
          (asset.edgeOffset - 4) / 14,
          asset.maxGroundChange / Math.max(1e-9, Math.abs(outer[1] - inner[1])),
        );
        return {
          position: inner.map(
            (value, axis) => value + (outer[axis] - value) * fraction,
          ) as Vec3,
          extra: 4 + 14 * fraction,
        };
      };
      const start = base(from),
        finish = base(to),
        a = start.position,
        b = finish.position;
      if (!clear(a, b, asset.roadReserve)) {
        omittedSpans++;
        continue;
      }
      const profile = (
        t: number,
        anchor: { position: Vec3; extra: number },
        station: number[],
      ): Vec3 => {
        const point = edge(i, t, side, anchor.extra + station[0], 0);
        return [point[0], anchor.position[1] + station[1], point[2]];
      };
      for (let k = 1; k < asset.profile.length; k++) {
        const p = profile(from, start, asset.profile[k - 1]),
          q = profile(from, start, asset.profile[k]);
        const r = profile(to, finish, asset.profile[k - 1]),
          s = profile(to, finish, asset.profile[k]);
        rails.push(...p, ...r, ...q, ...q, ...r, ...s);
      }
      const gate = distance / asset.postSpacing;
      if (Math.abs(gate - Math.round(gate)) < 1e-7) {
        const post = {
          position: a,
          yaw: Math.atan2(b[0] - a[0], b[2] - a[2]),
          distance,
          side,
        };
        posts.push(post);
        if (Math.round(gate) % asset.reflector.everyPosts === 0)
          reflectors.push(post);
      }
    }
  return { rails: new Float32Array(rails), posts, reflectors, omittedSpans };
}
