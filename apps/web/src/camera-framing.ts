import { Vector3 } from "three";
import type { Track } from "../../../packages/shared/schema";
import { normalizeTrack, type Vec3 } from "../../../packages/track-engine";

export const CAMERA_FOV = 45;
export type OverviewMode = "orbit" | "top";

/** Fit validated original road geometry; all lengths are in source metres. */
export function fitTrackCamera(
  track: Track,
  aspect: number,
  mode: OverviewMode,
) {
  if (!Number.isFinite(aspect) || aspect <= 0)
    throw new Error("Camera aspect must be finite and positive.");
  const frame = normalizeTrack(track);
  const center = new Vector3(...frame.center);
  const direction = new Vector3(
    ...((mode === "top" ? [0, 1, 0.001] : [0.1, 0.79, 0.62]) as Vec3),
  ).normalize();
  const right = new Vector3(0, 1, 0).cross(direction).normalize();
  const up = direction.clone().cross(right).normalize();
  const tan = Math.tan((CAMERA_FOV * Math.PI) / 360);
  let fit = 1,
    radius = 1;
  for (let i = 0; i < track.points.length; i++) {
    const point = track.points[i];
    // Include the same four-metre shoulders as the viewer ribbon.
    for (const lateral of [0, point.widthLeft + 4, -point.widthRight - 4]) {
      const offset = new Vector3(point.x, point.y, point.z)
        .addScaledVector(new Vector3(...frame.normals[i]), lateral)
        .sub(center);
      radius = Math.max(radius, offset.length());
      const depth = offset.dot(direction);
      fit = Math.max(
        fit,
        Math.abs(offset.dot(right)) / (tan * aspect) + depth,
        Math.abs(offset.dot(up)) / tan + depth,
      );
    }
  }
  const distance = fit * 1.27;
  const minDistance = Math.min(40, Math.max(1, radius * 0.05));
  // A responsive fit must remain reachable through the controls' dolly bounds.
  const maxDistance = Math.max(
    frame.span * 3,
    radius * 3,
    distance * 1.4,
    minDistance * 2,
  );
  // Landscape extends .7 horizontal spans around the source and at most 34m below it.
  const sceneRadius = Math.max(
    radius,
    Math.hypot(
      (frame.max[0] - frame.min[0]) / 2 + frame.span * 0.7,
      (frame.max[1] - frame.min[1]) / 2 + 50,
      (frame.max[2] - frame.min[2]) / 2 + frame.span * 0.7,
    ),
  );
  return {
    target: frame.center,
    position: center
      .addScaledVector(direction, Math.max(minDistance, distance))
      .toArray() as Vec3,
    distance: Math.max(minDistance, distance),
    minDistance,
    maxDistance,
    near: Math.min(1, minDistance / 40),
    far: Math.max(12000, maxDistance + sceneRadius * 1.1),
  };
}
