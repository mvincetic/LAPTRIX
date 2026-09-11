import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Object3D,
  type InstancedMesh,
} from "three";
import type { Track } from "../../../../packages/shared/schema";
import { createTerrainSurface } from "../../../../packages/track-engine/terrain";
import { roadApron } from "../road-presentation";

export function Landscape({ track }: { track: Track }) {
  const data = useMemo(() => {
    const surface = createTerrainSurface(track);
    const colors = new Float32Array(surface.distances.length * 3);
    const light = new Color("#b8c3a2"),
      dark = new Color("#939f85"),
      color = new Color();
    surface.distances.forEach((distance, i) => {
      const x = surface.positions[i * 3],
        z = surface.positions[i * 3 + 2];
      const variation = (Math.sin(x / 73) * Math.cos(z / 89) + 1) * 0.1;
      color
        .copy(light)
        .lerp(dark, Math.min(1, distance / 280) * 0.35 + variation);
      colors.set([color.r, color.g, color.b], i * 3);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(surface.positions, 3),
    );
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.setIndex(surface.indices);
    geometry.computeVertexNormals();
    const apron = new BufferGeometry();
    apron.setAttribute(
      "position",
      new BufferAttribute(roadApron(track, surface), 3),
    );
    apron.computeVertexNormals();
    return { geometry, apron, trees: surface.trees };
  }, [track]);
  const treeRef = useRef<InstancedMesh>(null);
  const trunkRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D();
    data.trees.forEach((position, i) => {
      const height = 9 + (i % 7),
        ground = position[1] - 6;
      object.position.set(position[0], ground + 1.5 + height / 2, position[2]);
      object.scale.set(height * 0.42, height, height * 0.42);
      object.updateMatrix();
      treeRef.current?.setMatrixAt(i, object.matrix);
      object.position.set(position[0], ground + 1.5, position[2]);
      object.scale.set(0.28, 3, 0.28);
      object.updateMatrix();
      trunkRef.current?.setMatrixAt(i, object.matrix);
    });
    if (treeRef.current) treeRef.current.instanceMatrix.needsUpdate = true;
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    return () => {
      data.geometry.dispose();
      data.apron.dispose();
    };
  }, [data]);
  return (
    <group>
      <mesh name="context-terrain" geometry={data.geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh name="road-earthworks" geometry={data.apron}>
        <meshStandardMaterial color="#a8b395" roughness={1} side={DoubleSide} />
      </mesh>
      <instancedMesh
        ref={treeRef}
        args={[undefined, undefined, data.trees.length]}
      >
        <coneGeometry args={[1, 1, 9]} />
        <meshStandardMaterial color="#819780" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, data.trees.length]}
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#827b6b" roughness={1} />
      </instancedMesh>
    </group>
  );
}
