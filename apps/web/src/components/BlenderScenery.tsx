import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, type Group } from "three";

export function BlenderScenery({ template }: { template: Group }) {
  const instance = useMemo(() => template.clone(true), [template]);
  const { scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const refreshShadow = () => {
      scene.traverse((node) => {
        if (node instanceof DirectionalLight && node.castShadow)
          node.shadow.needsUpdate = true;
      });
      invalidate();
    };
    refreshShadow();
    return refreshShadow;
  }, [scene, instance, invalidate]);
  // Static geometry/materials belong to the single bounded package cache.
  return <primitive object={instance} dispose={null} />;
}
