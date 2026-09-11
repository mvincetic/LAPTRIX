import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from "three";
import type { Track } from "../../../../packages/shared/schema";
import {
  placeTracksideAssets,
  foundationSurface,
  type AssetSite,
  type TracksidePresentation,
} from "../trackside-assets";
import { loadStaticAsset, type StaticAssetPart } from "../static-asset";

function AssetInstances({
  part,
  sites,
  foundation = false,
}: {
  part: StaticAssetPart;
  sites: AssetSite[];
  foundation?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D();
    sites.forEach((site, i) => {
      object.position.set(
        ...(foundation ? site.foundation.position : site.position),
      );
      object.rotation.set(0, site.yaw, 0);
      object.scale.fromArray(foundation ? site.foundation.size : [1, 1, 1]);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    invalidate();
  }, [sites, foundation, invalidate]);
  return (
    <instancedMesh
      ref={ref}
      name={foundation ? "asset-foundations" : part.material.name}
      args={[part.geometry, part.material, sites.length]}
    />
  );
}

export function TracksideAssets({
  track,
  apron,
  presentation,
}: {
  track: Track;
  apron: ArrayLike<number>;
  presentation: TracksidePresentation;
}) {
  const sites = useMemo(
    () =>
      placeTracksideAssets(
        track,
        foundationSurface(track, apron),
        presentation,
      ),
    [track, apron, presentation],
  );
  const [loaded, setLoaded] = useState<{
    id: string;
    parts: StaticAssetPart[];
  } | null>(null);
  const parts = loaded?.id === presentation.assetId ? loaded.parts : null;
  const available = sites.length > 0;
  useEffect(() => {
    let active = true;
    if (available)
      loadStaticAsset(presentation.assetId)
        .then((result) => {
          if (active) setLoaded({ id: presentation.assetId, parts: result });
        })
        .catch((error) => {
          // Optional scenery must not take the engineering viewer or lap offline.
          if (active)
            console.warn(
              "Trackside scenery could not load. Toggle Environment to retry.",
              error,
            );
        });
    return () => {
      active = false;
    };
  }, [presentation.assetId, available]);
  const foundation = useMemo(
    () => ({
      geometry: new BoxGeometry(1, 1, 1),
      material: new MeshStandardMaterial({ color: "#b9b7ac", roughness: 0.95 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      foundation.geometry.dispose();
      foundation.material.dispose();
    },
    [foundation],
  );
  if (!parts || !available) return null;
  return (
    <group name="original-trackside-assets">
      {parts.map((part) => (
        <AssetInstances key={part.geometry.uuid} part={part} sites={sites} />
      ))}
      <AssetInstances part={foundation} sites={sites} foundation />
    </group>
  );
}
