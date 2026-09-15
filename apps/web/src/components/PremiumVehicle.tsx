import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, type Group } from "three";
import type { VehicleMotion } from "../vehicle-motion";
import { instantiatePremiumGT, loadPremiumGT } from "../premium-vehicle";

export function PremiumVehicle({
  motion,
  reference,
  children,
}: {
  motion: RefObject<VehicleMotion>;
  reference: boolean;
  children: ReactNode;
}) {
  const [template, setTemplate] = useState<Group | null>(null);
  const { scene, invalidate } = useThree();
  useEffect(() => {
    let active = true;
    void loadPremiumGT()
      .then((result) => {
        if (active) setTemplate(result);
      })
      .catch(() => {
        // A failed request retains the complete procedural car. Remounting retries the cache.
      });
    return () => {
      active = false;
    };
  }, []);
  const instance = useMemo(
    () => (template ? instantiatePremiumGT(template, reference) : null),
    [template, reference],
  );
  useLayoutEffect(() => {
    if (!instance) return;
    motion.current = instance.motion;
    scene.traverse((node) => {
      if (node instanceof DirectionalLight && node.castShadow)
        node.shadow.needsUpdate = true;
    });
    invalidate();
    return () => {
      if (motion.current === instance.motion)
        motion.current = { wheels: [], front: [], brakeLights: [] };
      instance.dispose();
    };
  }, [instance, motion, scene, invalidate]);
  return instance ? (
    <group name="vehicle-body">
      <primitive object={instance.scene} dispose={null} />
    </group>
  ) : (
    children
  );
}
