import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Object3D,
  type InstancedMesh,
} from "three";
import type { Track } from "../../../../packages/shared/schema";
import type { TerrainSurface } from "../../../../packages/track-engine/terrain";
import { guardrailAsset as asset, roadsideContext } from "../roadside-context";

export function Trackside({
  track,
  surface,
}: {
  track: Track;
  surface: TerrainSurface;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const posts = useRef<InstancedMesh>(null),
    reflectors = useRef<InstancedMesh>(null);
  const data = useMemo(() => {
    const context = roadsideContext(track, surface),
      geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(context.rails, 3));
    geometry.computeVertexNormals();
    return { ...context, geometry };
  }, [track, surface]);
  useLayoutEffect(() => {
    const object = new Object3D();
    data.posts.forEach((post, i) => {
      object.position.set(
        post.position[0],
        post.position[1] + asset.post.height / 2 - asset.post.embed,
        post.position[2],
      );
      object.rotation.set(0, post.yaw, 0);
      object.scale.set(asset.post.width, asset.post.height, asset.post.depth);
      object.updateMatrix();
      posts.current?.setMatrixAt(i, object.matrix);
    });
    data.reflectors.forEach((post, i) => {
      object.position.set(
        post.position[0],
        post.position[1] + asset.reflector.elevation,
        post.position[2],
      );
      object.rotation.set(0, post.yaw, 0);
      object.scale.set(
        asset.reflector.width,
        asset.reflector.height,
        asset.reflector.depth,
      );
      object.updateMatrix();
      reflectors.current?.setMatrixAt(i, object.matrix);
    });
    for (const mesh of [posts.current, reflectors.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
    invalidate();
  }, [data, invalidate]);
  useEffect(() => () => data.geometry.dispose(), [data]);
  return (
    <group name="schematic-trackside">
      <mesh name="context-guardrail" geometry={data.geometry}>
        <meshStandardMaterial
          color={asset.materials.rail}
          metalness={0.35}
          roughness={0.6}
          side={DoubleSide}
        />
      </mesh>
      <instancedMesh
        name="context-guardrail-posts"
        ref={posts}
        args={[undefined, undefined, data.posts.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={asset.materials.post}
          metalness={0.3}
          roughness={0.7}
        />
      </instancedMesh>
      <instancedMesh
        name="context-guardrail-reflectors"
        ref={reflectors}
        args={[undefined, undefined, data.reflectors.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={asset.materials.reflector}
          roughness={0.85}
        />
      </instancedMesh>
    </group>
  );
}
