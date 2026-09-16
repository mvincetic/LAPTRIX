import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, Fog, type Group } from "three";
import recipe from "../../../../assets/environment/daylight.json";
import { rbrSceneryContract } from "../scenery-asset";

export function BlenderScenery({ template }: { template: Group }) {
  const instance = useMemo(() => template.clone(true), [template]);
  const haze = useMemo(
    () =>
      new Fog(
        recipe.background,
        rbrSceneryContract.landscape.fog.nearMetres,
        rbrSceneryContract.landscape.fog.farMetres,
      ),
    [],
  );
  const { scene, invalidate } = useThree();
  useLayoutEffect(() => {
    const previousFog = scene.fog;
    scene.fog = haze;
    const refreshShadow = () => {
      scene.traverse((node) => {
        if (node instanceof DirectionalLight && node.castShadow)
          node.shadow.needsUpdate = true;
      });
      invalidate();
    };
    refreshShadow();
    return () => {
      if (scene.fog === haze) scene.fog = previousFog;
      refreshShadow();
    };
  }, [scene, instance, invalidate, haze]);
  // Static geometry/materials belong to the single bounded package cache.
  return <primitive object={instance} dispose={null} />;
}
