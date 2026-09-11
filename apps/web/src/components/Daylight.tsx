import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import type { Lap } from "../../../../packages/shared/schema";
import type { PlaybackClock } from "../../../../packages/telemetry";
import {
  daylightEnvironment,
  daylightSun,
  positionDaylightSun,
} from "../daylight";
import recipe from "../../../../assets/environment/daylight.json";

export function Daylight({
  currentGhost,
  clock,
  lap,
}: {
  currentGhost: RefObject<Group | null>;
  clock: PlaybackClock;
  lap?: Lap | null;
}) {
  const { scene, gl, invalidate } = useThree();
  const environment = useMemo(daylightEnvironment, []),
    sun = useMemo(daylightSun, []),
    anchor = useMemo(() => new Vector3(), []);
  const previous = useRef<{ time: number; car: Group | null }>({
    time: NaN,
    car: null,
  });
  useEffect(() => {
    const oldEnvironment = scene.environment,
      oldIntensity = scene.environmentIntensity;
    scene.environment = environment;
    scene.environmentIntensity = recipe.environment.intensity;
    invalidate();
    return () => {
      scene.environment = oldEnvironment;
      scene.environmentIntensity = oldIntensity;
      environment.dispose();
    };
  }, [environment, scene, invalidate]);
  useEffect(() => () => sun.dispose(), [sun]);
  useEffect(() => {
    sun.shadow.needsUpdate = true;
    invalidate();
  }, [lap, sun, invalidate]);
  useEffect(() => {
    const restored = () => {
      sun.shadow.needsUpdate = true;
      invalidate();
    };
    gl.domElement.addEventListener("webglcontextrestored", restored);
    return () =>
      gl.domElement.removeEventListener("webglcontextrestored", restored);
  }, [gl, sun, invalidate]);
  useFrame(() => {
    const car = currentGhost.current,
      time = clock.getSnapshot().time;
    if (
      previous.current.time !== time ||
      previous.current.car !== car ||
      sun.shadow.needsUpdate
    ) {
      if (car) car.getWorldPosition(anchor);
      else anchor.set(0, 0, 0);
      positionDaylightSun(sun, anchor);
      sun.shadow.needsUpdate = true;
      previous.current.time = time;
      previous.current.car = car;
    }
  }, -0.25); // Consume the real ghost transform after its -0.5 telemetry update.
  return (
    <>
      <color attach="background" args={[recipe.background]} />
      <hemisphereLight
        name="daylight-fill"
        args={[
          recipe.hemisphere.sky,
          recipe.hemisphere.ground,
          recipe.hemisphere.intensity,
        ]}
      />
      <primitive object={sun} />
      <primitive object={sun.target} />
    </>
  );
}
