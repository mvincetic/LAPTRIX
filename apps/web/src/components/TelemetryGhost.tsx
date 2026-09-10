import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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
  label = false,
}: {
  lap: Lap;
  clock: PlaybackClock;
  marker: boolean;
  vehicle?: Vehicle;
  reference?: boolean;
  label?: boolean;
}) {
  const ref = useRef<Group>(null);
  const color = reference ? "#78879c" : "#0866ec";
  const name = `${reference ? "Reference" : "Current"} ghost: ${vehicle?.name ?? lap.vehicleId}`;
  useFrame(() => {
    if (!ref.current) return;
    const pose = ghostPose(lap, clock.getSnapshot().time);
    ref.current.position.set(pose.sample.x, pose.sample.y + 0.3, pose.sample.z);
    ref.current.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");
  }, -0.5);
  return (
    <group
      ref={ref}
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
      {label && (
        <Html
          position={[0, 2, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span
            className="ghost-tag"
            role="img"
            aria-label={name}
            style={{ borderColor: color, color }}
          >
            {reference ? "REF" : "CURRENT"}
          </span>
        </Html>
      )}
    </group>
  );
}
