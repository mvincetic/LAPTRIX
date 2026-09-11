import { useEffect, useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import type { Vec3 } from "../../../../packages/track-engine";
import { vehicleBodyGeometry, type BodyStation } from "../vehicle-geometry";

/** Original loft, tapered in plan and height, in source metres. */
export function VehicleBody({
  stations,
  color,
  roughness = 0.34,
  rounded = false,
}: {
  stations: readonly BodyStation[];
  color: string;
  roughness?: number;
  rounded?: boolean;
}) {
  const geometry = useMemo(
    () => vehicleBodyGeometry(stations, rounded),
    [stations, rounded],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.25}
        roughness={roughness}
      />
    </mesh>
  );
}

export function VehicleStrut({
  from,
  to,
  radius = 0.025,
  color = "#202938",
}: {
  from: Vec3;
  to: Vec3;
  radius?: number;
  color?: string;
}) {
  const pose = useMemo(() => {
    const a = new Vector3(...from),
      b = new Vector3(...to),
      direction = b.clone().sub(a);
    return {
      midpoint: a.add(b).multiplyScalar(0.5),
      length: direction.length(),
      rotation: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [from, to]);
  return (
    <mesh position={pose.midpoint} quaternion={pose.rotation}>
      <cylinderGeometry args={[radius, radius, pose.length, 8]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}
export function VehiclePart({
  size,
  at,
  color = "#1e2938",
  roughness = 0.45,
}: {
  size: [number, number, number];
  at: [number, number, number];
  color?: string;
  roughness?: number;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={0.2}
        roughness={roughness}
      />
    </mesh>
  );
}

export function VehicleWing({
  span,
  chord,
  y,
  z,
  color = "#1e2938",
}: {
  span: number;
  chord: number;
  y: number;
  z: number;
  color?: string;
}) {
  return (
    <VehicleBody
      rounded
      color={color}
      roughness={0.4}
      stations={[
        [z - chord / 2, span * 0.49, y - 0.016, y + 0.016],
        [z - chord * 0.15, span / 2, y - 0.025, y + 0.03],
        [z + chord / 2, span * 0.44, y - 0.01, y + 0.005],
      ]}
    />
  );
}
