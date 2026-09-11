import type { Lap, Vehicle } from "../../../packages/shared/schema";
import { ghostPose } from "../../../packages/telemetry";
import type { Vec3 } from "../../../packages/track-engine";
import { VEHICLE_SURFACE_LIFT } from "./chase-camera";

export const ONBOARD_FOV = 60;
export const ONBOARD_NEAR = 0.08;

/** Original visual mounts, independent of drivetrain/solver definitions. */
export function onboardMount(vehicle?: Vehicle) {
  const coupe = vehicle?.bodyStyle === "coupe";
  return {
    height: Math.max(
      coupe ? 1.48 : 1.18,
      2 * (vehicle?.wheelRadius ?? 0.34) + 0.22,
    ),
    forward: coupe ? -0.12 : -0.45,
    label: coupe ? "Roof-mounted onboard" : "Roll-hoop onboard",
  };
}

/** A rigid vehicle-mounted camera using the same predicted frame as its body. */
export function onboardCameraPose(
  lap: Pick<Lap, "samples" | "lapTime" | "vehicle">,
  time: number,
  vehicle?: Vehicle,
) {
  const pose = ghostPose(lap, time),
    mount = onboardMount(vehicle ?? lap.vehicle);
  const sy = Math.sin(pose.yaw),
    cy = Math.cos(pose.yaw);
  const sp = Math.sin(pose.pitch),
    cp = Math.cos(pose.pitch);
  const forward: Vec3 = [sy * cp, -sp, cy * cp],
    up: Vec3 = [sy * sp, cp, cy * sp];
  const base: Vec3 = [
    pose.sample.x,
    pose.sample.y + VEHICLE_SURFACE_LIFT,
    pose.sample.z,
  ];
  const position = base.map(
    (value, i) => value + up[i] * mount.height + forward[i] * mount.forward,
  ) as Vec3;
  const target = position.map((value, i) => value + forward[i] * 30) as Vec3;
  return { position, target };
}
