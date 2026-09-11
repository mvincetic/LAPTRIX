import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, DoubleSide } from "three";
import type { Track } from "../../../../packages/shared/schema";
import { roadDetails } from "../road-presentation";

export function RoadDetails({ track }: { track: Track }) {
  const meshes = useMemo(() => {
    const details = roadDetails(track);
    return (["white", "red", "dark"] as const).map((name) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(details[name], 3));
      geometry.computeVertexNormals();
      return {
        name,
        geometry,
        color: { white: "#eeeee7", red: "#b9403d", dark: "#272c30" }[name],
      };
    });
  }, [track]);
  useEffect(
    () => () => meshes.forEach(({ geometry }) => geometry.dispose()),
    [meshes],
  );
  return (
    <group name="schematic-road-details">
      {meshes.map(({ name, geometry, color }) => (
        <mesh key={name} geometry={geometry} receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={0.9}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
