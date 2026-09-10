import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";
import type { Lap, Vehicle } from "../../../../packages/shared/schema";
import { ghostPose, type PlaybackClock } from "../../../../packages/telemetry";
import { VehicleMesh } from "./VehicleMesh";

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
  useFrame(() => {
    if (!groupRef.current) return;
    const pose = ghostPose(lap, clock.getSnapshot().time);
    groupRef.current.position.set(
      pose.sample.x,
      pose.sample.y + 0.3,
      pose.sample.z,
    );
    groupRef.current.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
  }, -0.5);
  return (
    <group
      ref={groupRef}
      scale={3}
      name={reference ? "reference-ghost" : "current-ghost"}
    >
      <VehicleMesh vehicle={vehicle} color={color} />
      {marker && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <ringGeometry args={[3.2, 3.7, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.7}
            side={DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
