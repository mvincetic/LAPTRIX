import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Quaternion,
  Vector3,
} from "three";
import type { Vec3 } from "../../../../packages/track-engine";

type Station = [z: number, halfWidth: number, bottom: number, top: number];

/** Original four-sided loft, tapered in plan and height, in source metres. */
export function VehicleBody({
  stations,
  color,
  roughness = 0.34,
}: {
  stations: Station[];
  color: string;
  roughness?: number;
}) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const rings = stations.map(([z, w, bottom, top]) => [
      [-w, bottom, z],
      [w, bottom, z],
      [w, top, z],
      [-w, top, z],
    ]);
    const triangle = (a: number[], b: number[], c: number[]) =>
      positions.push(...a, ...b, ...c);
    for (let i = 0; i < rings.length - 1; i++) {
      const a = rings[i],
        b = rings[i + 1];
      for (let j = 0; j < 4; j++) {
        const next = (j + 1) % 4;
        triangle(a[j], a[next], b[j]);
        triangle(a[next], b[next], b[j]);
      }
    }
    const first = rings[0],
      last = rings.at(-1)!;
    triangle(first[0], first[3], first[1]);
    triangle(first[3], first[2], first[1]);
    triangle(last[0], last[1], last[3]);
    triangle(last[1], last[2], last[3]);
    const mesh = new BufferGeometry();
    mesh.setAttribute("position", new Float32BufferAttribute(positions, 3));
    mesh.computeVertexNormals();
    return mesh;
  }, [stations]);
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
