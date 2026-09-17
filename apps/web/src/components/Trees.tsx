import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
  type Texture,
} from "three";
import { spruceCrown } from "../foliage-geometry";
import { loadFoliageTexture } from "../foliage-texture";
import { loadSpruceAsset, type SpruceTemplate } from "../spruce-asset";
import spruce from "../../../../assets/environment/spruce.json";
import {
  visibleTreeIndices,
  type GroundFootprint,
} from "../vegetation-clearance";

export function Trees({
  positions,
  exclusions,
  authored = false,
}: {
  positions: [number, number, number][];
  exclusions?: GroundFootprint[];
  authored?: boolean;
}) {
  const visible = useMemo(
    () => visibleTreeIndices(positions, exclusions),
    [positions, exclusions],
  );
  const invalidate = useThree((state) => state.invalidate),
    crownRef = useRef<InstancedMesh>(null),
    trunkRef = useRef<InstancedMesh>(null),
    [detail, setDetail] = useState<{
      authored: boolean;
      template: SpruceTemplate | null;
      texture: Texture;
    } | null>(null);
  const current = detail?.authored === authored ? detail : null,
    texture = current?.texture ?? null,
    template = current?.template ?? null;
  const shapes = useMemo(
    () => ({
      crown: template?.crown.geometry.clone() ?? spruceCrown(),
      fallback: new ConeGeometry(1, 1, 9),
      trunk:
        template?.trunk.geometry.clone() ??
        new CylinderGeometry(spruce.trunkTipRatio, 1, 1, 7),
    }),
    [template],
  );
  const materials = useMemo(
    () => ({
      crown:
        template?.crown.material.clone() ??
        new MeshStandardMaterial({
          map: texture,
          color: texture ? "#ffffff" : "#819780",
          vertexColors: Boolean(texture),
          alphaTest: texture ? spruce.alphaTest : 0,
          side: DoubleSide,
          forceSinglePass: true,
          roughness: 1,
        }),
      trunk:
        template?.trunk.material.clone() ??
        new MeshStandardMaterial({ color: "#827b6b", roughness: 1 }),
    }),
    [template, texture],
  );
  useEffect(() => {
    let active = true;
    (async () => {
      if (authored) {
        try {
          const asset = await loadSpruceAsset();
          return {
            authored,
            template: asset,
            texture: asset.crown.material.map!,
          };
        } catch (error) {
          if (active)
            console.warn(
              "Authored tree detail could not load. Using original foliage; toggle Environment to retry.",
              error,
            );
        }
      }
      return { authored, template: null, texture: await loadFoliageTexture() };
    })()
      .then((loaded) => {
        if (active) setDetail(loaded);
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
  }, [authored]);
  useLayoutEffect(() => {
    const object = new Object3D(),
      tint = new Color(),
      white = new Color("#ffffff"),
      cool = new Color("#d8e7df");
    visible.forEach((i, slot) => {
      const position = positions[i];
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
      crownRef.current?.setMatrixAt(slot, object.matrix);
      tint.copy(white).lerp(cool, (i % 13) / 12);
      crownRef.current?.setColorAt(slot, tint);
      const trunkHeight =
        height +
        spruce.crownBase +
        spruce.trunkEmbed -
        spruce.trunkTipClearance;
      object.position.y = ground - spruce.trunkEmbed + trunkHeight / 2;
      object.scale.set(spruce.trunkRadius, trunkHeight, spruce.trunkRadius);
      object.updateMatrix();
      trunkRef.current?.setMatrixAt(slot, object.matrix);
    });
    for (const mesh of [crownRef.current, trunkRef.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
    invalidate();
  }, [positions, visible, texture, template, invalidate]);
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );
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
          materials.crown,
          visible.length,
        ]}
      />
      <instancedMesh
        ref={trunkRef}
        name="context-tree-trunks"
        args={[shapes.trunk, materials.trunk, visible.length]}
      />
    </group>
  );
}
