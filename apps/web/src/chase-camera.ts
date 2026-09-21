import type { Lap, Vehicle } from "../../../packages/shared/schema";
import { interpolate } from "../../../packages/telemetry";
import type { Vec3 } from "../../../packages/track-engine";

export const CHASE_FOV = 64;
export const ROAD_SURFACE_LIFT = 0.55;
export const VEHICLE_SURFACE_LIFT = ROAD_SURFACE_LIFT + 0.03;

/** A deterministic follow pose on the existing lap, independent of frame history. */
export function chaseCameraPose(
  lap: Pick<Lap, "samples" | "length" | "vehicle">,
  time: number,
  vehicle?: Vehicle,
  aspect = 1.05,
) {
  if (!Number.isFinite(aspect) || aspect <= 0)
    throw new Error("Chase camera aspect must be finite and positive.");
  const current = interpolate(lap.samples, time);
  const wheelbase = vehicle?.wheelbase ?? lap.vehicle?.wheelbase ?? 3.6;
  const follow = Math.min(4 + wheelbase * 1.2, lap.length * 0.08);
  const ahead = Math.min(8 + current.speed * 0.18, lap.length * 0.08);
  const height = 1.25 + wheelbase * 0.22;
  const wrap = (distance: number) =>
    ((distance % lap.length) + lap.length) % lap.length;
  const rear = interpolate(
    lap.samples,
    wrap(wrap(current.distance) - follow),
    "distance",
  );
  const target = interpolate(
    lap.samples,
    wrap(wrap(current.distance) + ahead),
    "distance",
  );
  const position: Vec3 = [
    rear.x,
    Math.max(current.y + height, rear.y + 1.5) + VEHICLE_SURFACE_LIFT,
    rear.z,
  ];
  // A full look-ahead target can point past a hairpin and crop the car on phones.
  // Retain forward context while anchoring the view predominantly to the car.
  const aim: Vec3 = [
    current.x + (target.x - current.x) * 0.12,
    current.y + (target.y - current.y) * 0.12 + 0.7 + VEHICLE_SURFACE_LIFT,
    current.z + (target.z - current.z) * 0.12,
  ];
  // A taller canvas narrows the horizontal FOV. Retreat on the same view ray
  // to retain the car at portrait fullscreen sizes without changing its bearing.
  const retreat = Math.max(1, 1.05 / aspect);
  return {
    position:
      retreat === 1
        ? position
        : (position.map(
            (value, i) => aim[i] + (value - aim[i]) * retreat,
          ) as Vec3),
    target: aim,
  };
}
