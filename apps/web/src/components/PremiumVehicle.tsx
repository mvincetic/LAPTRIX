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
import {
  instantiatePremiumVehicle,
  loadPremiumVehicle,
  type PremiumVehicleKind,
} from "../premium-vehicle";

export function PremiumVehicle({
  kind,
  motion,
  reference,
  children,
}: {
  kind: PremiumVehicleKind;
  motion: RefObject<VehicleMotion>;
  reference: boolean;
  children: ReactNode;
}) {
  const [template, setTemplate] = useState<Group | null>(null);
  const { scene, invalidate } = useThree();
  useEffect(() => {
    let active = true;
    void loadPremiumVehicle(kind)
      .then((result) => {
        if (active) setTemplate(result);
      })
      .catch(() => {
        // A failed request retains the complete procedural car. Remounting retries the cache.
      });
    return () => {
      active = false;
    };
  }, [kind]);
  const instance = useMemo(
    () =>
      template ? instantiatePremiumVehicle(template, reference, kind) : null,
    [template, reference, kind],
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
