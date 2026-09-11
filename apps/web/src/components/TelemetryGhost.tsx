import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, type Group } from "three";
import type { Lap, Vehicle } from "../../../../packages/shared/schema";
import { ghostPose, type PlaybackClock } from "../../../../packages/telemetry";
import { VehicleMesh } from "./VehiclePresentation";
import { brakeLightIntensity, type VehicleMotion } from "../vehicle-motion";
import { VEHICLE_SURFACE_LIFT } from "../chase-camera";

export function TelemetryGhost({
  lap,
  clock,
  marker,
  vehicle,
  reference = false,
  groupRef,
}: {
  lap: Lap;
  clock: PlaybackClock;
  marker: boolean;
  vehicle?: Vehicle;
  reference?: boolean;
  groupRef: RefObject<Group | null>;
}) {
  const color = reference ? "#78879c" : "#0866ec";
  const motion = useRef<VehicleMotion>({
    wheels: [],
    front: [],
    brakeLights: [],
  });
  useLayoutEffect(() => {
    groupRef.current?.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.material instanceof MeshStandardMaterial
      ) {
        object.castShadow = !reference;
        object.receiveShadow = !reference;
        // The comparison remains visible without writing over the current car's depth.
        object.material.transparent = reference;
        object.material.opacity = reference ? 0.28 : 1;
        object.material.depthWrite = !reference;
        object.material.needsUpdate = true;
      }
    });
  }, [groupRef, reference, vehicle]);
  useFrame(() => {
    if (!groupRef.current) return;
    const pose = ghostPose(lap, clock.getSnapshot().time);
    groupRef.current.position.set(
      pose.sample.x,
      pose.sample.y + VEHICLE_SURFACE_LIFT,
      pose.sample.z,
    );
    groupRef.current.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
    for (const wheel of motion.current.wheels)
      if (wheel)
        wheel.rotation.x =
          pose.sample.distance / (vehicle?.wheelRadius ?? 0.34);
    for (const front of motion.current.front)
      if (front) front.rotation.y = pose.sample.steering;
    for (const lamp of motion.current.brakeLights ?? [])
      if (lamp) lamp.emissiveIntensity = brakeLightIntensity(pose.sample.brake);
  }, -0.5);
  return (
    <group
      ref={groupRef}
      name={reference ? "reference-ghost" : "current-ghost"}
    >
      <VehicleMesh
        vehicle={vehicle}
        color={color}
        motion={motion}
        contactShade={!reference}
      />
      {marker && (
        <Html
          center
          position={[0, 1.35, 0]}
          zIndexRange={[7, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span
            className="vehicle-position-dot"
            style={{ background: color }}
            aria-hidden="true"
          />
        </Html>
      )}
    </group>
  );
}
