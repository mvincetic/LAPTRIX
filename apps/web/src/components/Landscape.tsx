import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Object3D,
  type InstancedMesh,
} from "three";
import type { Track } from "../../../../packages/shared/schema";
import { createTerrainSurface } from "../../../../packages/track-engine/terrain";

export function Landscape({ track }: { track: Track }) {
  const data = useMemo(() => {
    const surface = createTerrainSurface(track);
    const colors = new Float32Array(surface.distances.length * 3);
    const light = new Color("#edf0ed"),
      dark = new Color("#dce4df"),
      color = new Color();
    surface.distances.forEach((distance, i) => {
      color.copy(light).lerp(dark, Math.min(1, distance / 280) * 0.55);
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
    return { geometry, trees: surface.trees };
  }, [track]);
  const treeRef = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D();
    data.trees.forEach((position, i) => {
      object.position.set(...position);
      const scale = 8 + (i % 7);
      object.scale.set(scale * 0.65, scale, scale * 0.65);
      object.updateMatrix();
      treeRef.current?.setMatrixAt(i, object.matrix);
    });
    if (treeRef.current) treeRef.current.instanceMatrix.needsUpdate = true;
    return () => data.geometry.dispose();
  }, [data]);
  return (
    <group>
      <mesh geometry={data.geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <instancedMesh
        ref={treeRef}
        args={[undefined, undefined, data.trees.length]}
      >
        <coneGeometry args={[1, 2, 7]} />
        <meshStandardMaterial color="#c1cec7" roughness={1} />
      </instancedMesh>
    </group>
  );
}
