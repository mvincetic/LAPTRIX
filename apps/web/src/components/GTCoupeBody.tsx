import { useEffect, useMemo, type RefObject } from "react";
import {
  gtBodyGeometry,
  gtCabinGeometry,
  gtGlassGeometry,
  gtDimensions,
} from "../gt-geometry";
import { brakeLightIntensity, type VehicleMotion } from "../vehicle-motion";
import {
  VehicleBody,
  VehiclePart as Part,
  VehicleStrut,
  VehicleWing,
} from "./VehicleBody";

export function GTCoupeBody({
  width,
  wheelbase,
  radius,
  color,
  motion,
}: {
  width: number;
  wheelbase: number;
  radius: number;
  color: string;
  motion: RefObject<VehicleMotion>;
}) {
  const { length, archRadius, core } = gtDimensions(width, wheelbase, radius);
  const body = useMemo(
    () => gtBodyGeometry(width, wheelbase, radius),
    [width, wheelbase, radius],
  );
  const cabin = useMemo(() => gtCabinGeometry(width, length), [width, length]);
  const glass = useMemo(() => gtGlassGeometry(width, length), [width, length]);
  useEffect(() => () => body.dispose(), [body]);
  useEffect(() => () => cabin.dispose(), [cabin]);
  useEffect(() => () => glass.dispose(), [glass]);
  return (
    <group name="gt-bodywork">
      <Part size={[core * 1.85, 0.055, length * 0.96]} at={[0, 0.17, 0]} />
      <mesh name="gt-shell" geometry={body}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh name="gt-cabin" geometry={cabin}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.28} />
      </mesh>
      <mesh name="gt-glass" geometry={glass}>
        <meshStandardMaterial
          color="#17293c"
          metalness={0.4}
          roughness={0.19}
        />
      </mesh>
      <VehicleWing span={width * 0.96} chord={0.3} y={1.18} z={-length * 0.4} />
      {[-1, 1].map((side, index) => (
        <group key={side}>
          <Part
            size={[width * 0.88, 0.045, 0.28]}
            at={[0, 0.165, side * (length / 2 - 0.08)]}
          />
          <Part
            size={[
              0.06,
              0.07,
              Math.max(0.1, wheelbase - archRadius * 2 - 0.05),
            ]}
            at={[side * width * 0.46, 0.205, 0]}
          />
          <VehicleStrut
            from={[side * width * 0.27, 0.74, -length * 0.4]}
            to={[side * width * 0.27, 1.18, -length * 0.4]}
            radius={0.026}
          />
          <Part
            size={[0.035, 0.17, 0.3]}
            at={[side * width * 0.477, 1.19, -length * 0.4]}
          />
          <group position={[side * width * 0.45, 0.9, length * 0.145]}>
            <VehicleBody
              rounded
              color={color}
              stations={[
                [-0.09, 0.058, -0.025, 0.035],
                [0.06, 0.065, -0.035, 0.045],
                [0.11, 0.045, -0.02, 0.025],
              ]}
            />
          </group>
          <Part
            size={[0.022, 0.025, 0.15]}
            at={[side * width * 0.475, 0.72, -length * 0.065]}
            color="#172330"
          />
          <mesh position={[side * width * 0.29, 0.52, length / 2 + 0.006]}>
            <boxGeometry args={[width * 0.19, 0.065, 0.022]} />
            <meshStandardMaterial
              color="#e7f2fb"
              emissive="#b8d5ee"
              emissiveIntensity={0.35}
              roughness={0.2}
            />
          </mesh>
          <mesh
            name={`gt-brake-lamp-${index}`}
            position={[side * width * 0.28, 0.535, -length / 2 - 0.006]}
          >
            <boxGeometry args={[width * 0.24, 0.058, 0.022]} />
            <meshStandardMaterial
              ref={(lamp) => {
                (motion.current.brakeLights ??= [])[index] = lamp;
              }}
              color="#a5162c"
              emissive="#ff1834"
              emissiveIntensity={brakeLightIntensity(0)}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}
      <Part
        size={[width * 0.44, 0.12, 0.025]}
        at={[0, 0.34, length / 2 + 0.007]}
      />
      <Part
        size={[width * 0.54, 0.1, 0.055]}
        at={[0, 0.26, -length / 2 + 0.012]}
      />
    </group>
  );
}
