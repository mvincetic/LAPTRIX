import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Object3D,
  type InstancedMesh,
  type Texture,
} from "three";
import { spruceCrown } from "../foliage-geometry";
import { loadFoliageTexture } from "../foliage-texture";
import spruce from "../../../../assets/environment/spruce.json";

export function Trees({
  positions,
}: {
  positions: [number, number, number][];
}) {
  const invalidate = useThree((state) => state.invalidate),
    crownRef = useRef<InstancedMesh>(null),
    trunkRef = useRef<InstancedMesh>(null),
    [texture, setTexture] = useState<Texture | null>(null);
  const shapes = useMemo(
    () => ({
      crown: spruceCrown(),
      fallback: new ConeGeometry(1, 1, 9),
      trunk: new CylinderGeometry(spruce.trunkTipRatio, 1, 1, 7),
    }),
    [],
  );
  useEffect(() => {
    let active = true;
    loadFoliageTexture()
      .then((map) => {
        if (active) setTexture(map);
      })
      .catch((error) => {
        if (active)
          console.warn(
            "Tree detail could not load. Toggle Environment to retry.",
            error,
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useLayoutEffect(() => {
    const object = new Object3D(),
      tint = new Color(),
      white = new Color("#ffffff"),
      cool = new Color("#d8e7df");
    positions.forEach((position, i) => {
      const height = spruce.minHeight + (i % spruce.heightVariants),
        ground = position[1] - 6;
      object.rotation.set(0, i * 2.39996, 0);
      object.position.set(
        position[0],
        ground + spruce.crownBase + height / 2,
        position[2],
      );
      object.scale.set(
        height * spruce.radiusRatio,
        height,
        height * spruce.radiusRatio,
      );
      object.updateMatrix();
      crownRef.current?.setMatrixAt(i, object.matrix);
      tint.copy(white).lerp(cool, (i % 13) / 12);
      crownRef.current?.setColorAt(i, tint);
      const trunkHeight =
        height +
        spruce.crownBase +
        spruce.trunkEmbed -
        spruce.trunkTipClearance;
      object.position.y = ground - spruce.trunkEmbed + trunkHeight / 2;
      object.scale.set(spruce.trunkRadius, trunkHeight, spruce.trunkRadius);
      object.updateMatrix();
      trunkRef.current?.setMatrixAt(i, object.matrix);
    });
    for (const mesh of [crownRef.current, trunkRef.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
    invalidate();
  }, [positions, texture, invalidate]);
  useEffect(
    () => () => {
      Object.values(shapes).forEach((shape) => shape.dispose());
    },
    [shapes],
  );
  return (
    <group>
      <instancedMesh
        ref={crownRef}
        name="context-tree-crowns"
        args={[
          texture ? shapes.crown : shapes.fallback,
          undefined,
          positions.length,
        ]}
      >
        <meshStandardMaterial
          map={texture}
          color={texture ? "#ffffff" : "#819780"}
          vertexColors={Boolean(texture)}
          alphaTest={texture ? spruce.alphaTest : 0}
          side={DoubleSide}
          forceSinglePass
          roughness={1}
        />
      </instancedMesh>
      <instancedMesh
        ref={trunkRef}
        name="context-tree-trunks"
        args={[shapes.trunk, undefined, positions.length]}
      >
        <meshStandardMaterial color="#827b6b" roughness={1} />
      </instancedMesh>
    </group>
  );
}
