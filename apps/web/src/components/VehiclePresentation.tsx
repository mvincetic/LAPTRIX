import { memo, useEffect, useMemo, type RefObject } from "react";
import {
  CatmullRomCurve3,
  DataTexture,
  RGBAFormat,
  Vector3,
  type Group,
} from "three";
import type { Vehicle } from "../../../../packages/shared/schema";
import { VehicleBody, VehicleStrut } from "./VehicleBody";
import { formulaBodyStations, vehicleTyreGeometry } from "../vehicle-geometry";
import formulaAsset from "../../../../assets/vehicles/formula.json";

export type VehicleMotion = {
  wheels: (Group | null)[];
  front: (Group | null)[];
};

function Part({
  size,
  at,
  color = "#1e2938",
  roughness = 0.45,
}: {
  size: [number, number, number];
  at: [number, number, number];
  color?: string;
  roughness?: number;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={0.2}
        roughness={roughness}
      />
    </mesh>
  );
}

function ContactShade({ width, length }: { width: number; length: number }) {
  const texture = useMemo(() => {
    const size = 32,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const r = Math.hypot(
          ((x + 0.5) / size) * 2 - 1,
          ((y + 0.5) / size) * 2 - 1,
        );
        pixels[(y * size + x) * 4 + 3] = Math.round(
          Math.max(0, 1 - r * r) ** 2 * 65,
        );
      }
    const result = new DataTexture(pixels, size, size, RGBAFormat);
    result.needsUpdate = true;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width * 1.4, length * 1.1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Tyre({ radius, width }: { radius: number; width: number }) {
  const geometry = useMemo(
    () => vehicleTyreGeometry(radius, width),
    [radius, width],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[0, 0, Math.PI / 2]}>
      <meshStandardMaterial color="#20242b" roughness={0.92} />
    </mesh>
  );
}

function Wing({
  span,
  chord,
  y,
  z,
  color = "#1e2938",
}: {
  span: number;
  chord: number;
  y: number;
  z: number;
  color?: string;
}) {
  return (
    <VehicleBody
      rounded
      color={color}
      roughness={0.4}
      stations={[
        [z - chord / 2, span * 0.49, y - 0.016, y + 0.016],
        [z - chord * 0.15, span / 2, y - 0.025, y + 0.03],
        [z + chord / 2, span * 0.44, y - 0.01, y + 0.005],
      ]}
    />
  );
}

/** Original bodywork in metres. Memoization retains geometry across setup/viewer edits. */
export const VehicleMesh = memo(function VehicleMesh({
  vehicle,
  color = "#0866ec",
  motion,
}: {
  vehicle?: Vehicle;
  color?: string;
  motion: RefObject<VehicleMotion>;
}) {
  const width = vehicle?.width ?? 2,
    wheelbase = vehicle?.wheelbase ?? 3.6;
  const radius = vehicle?.wheelRadius ?? 0.34,
    coupe = vehicle?.bodyStyle === "coupe";
  const length = wheelbase + (coupe ? 1.7 : 1.4),
    half = wheelbase / 2;
  const tyreWidth = Math.min(width * 0.19, radius * 1.2);
  const halo = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-width * 0.15, 0.85, -0.65),
        new Vector3(-width * 0.17, 1.03, -0.1),
        new Vector3(0, 0.98, 0.45),
        new Vector3(width * 0.17, 1.03, -0.1),
        new Vector3(width * 0.15, 0.85, -0.65),
      ]),
    [width],
  );
  return (
    <group name="vehicle-body">
      <ContactShade width={width} length={length} />
      {coupe ? (
        <Part
          size={[width * 0.88, 0.07, length * 0.88]}
          at={[0, 0.16, -0.08]}
        />
      ) : (
        <VehicleBody
          color="#1e2938"
          roughness={0.55}
          stations={formulaBodyStations("floor", width, wheelbase)}
        />
      )}
      {coupe ? (
        <>
          <VehicleBody
            color={color}
            stations={[
              [-length / 2, width * 0.41, 0.23, 0.59],
              [-length * 0.3, width * 0.48, 0.21, 0.78],
              [length * 0.23, width * 0.48, 0.22, 0.72],
              [length / 2, width * 0.41, 0.25, 0.53],
            ]}
          />
          <VehicleBody
            color="#1e3045"
            roughness={0.22}
            stations={[
              [-length * 0.32, width * 0.31, 0.65, 0.72],
              [-length * 0.14, width * 0.34, 0.67, 1.25],
              [length * 0.1, width * 0.33, 0.67, 1.25],
              [length * 0.28, width * 0.28, 0.65, 0.72],
            ]}
          />
          <Part
            size={[width * 0.67, 0.035, length * 0.23]}
            at={[0, 1.27, -length * 0.02]}
            color={color}
          />
          <Part
            size={[width * 0.92, 0.045, 0.29]}
            at={[0, 1.19, -length * 0.41]}
          />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Part
                size={[0.045, 0.53, 0.09]}
                at={[side * width * 0.27, 0.94, -length * 0.41]}
              />
              <Part
                size={[width * 0.21, 0.1, 0.045]}
                at={[side * width * 0.29, 0.5, length / 2]}
                color="#f2f7fc"
              />
              <Part
                size={[width * 0.25, 0.08, 0.04]}
                at={[side * width * 0.28, 0.53, -length / 2 - 0.01]}
                color="#e93044"
              />
              <Part
                size={[0.11, 0.08, 0.2]}
                at={[side * (width / 2 - 0.06), 0.85, length * 0.19]}
                color={color}
              />
              <Part
                size={[0.035, 0.035, 0.19]}
                at={[side * width * 0.478, 0.74, -length * 0.05]}
                color="#14212e"
              />
            </group>
          ))}
          <Part
            size={[width * 0.48, 0.14, 0.04]}
            at={[0, 0.35, length / 2 + 0.01]}
          />
        </>
      ) : (
        <>
          <VehicleBody
            color={color}
            rounded
            stations={formulaBodyStations("chassis", width, wheelbase)}
          />
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * width * formulaAsset.sidepodOffset, 0, 0]}
            >
              <VehicleBody
                color={color}
                rounded
                stations={formulaBodyStations("sidepod", width, wheelbase)}
              />
              <Part
                size={[width * 0.13, 0.08, 0.012]}
                at={[0, 0.435, wheelbase * 0.16 + 0.005]}
              />
            </group>
          ))}
          <VehicleBody
            color={color}
            rounded
            stations={formulaBodyStations("engineCover", width, wheelbase)}
          />
          <mesh position={[0, 0.64, -0.16]} scale={[0.3, 0.1, 0.48]}>
            <sphereGeometry args={[1, 20, 10]} />
            <meshStandardMaterial color="#101b29" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.83, -0.19]}>
            <sphereGeometry args={[0.195, 20, 12]} />
            <meshStandardMaterial color="#f4f7fb" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.85, -0.025]} scale={[1, 0.38, 0.3]}>
            <sphereGeometry args={[0.18, 16, 10]} />
            <meshStandardMaterial color="#182431" roughness={0.16} />
          </mesh>
          <mesh>
            <tubeGeometry args={[halo, 28, 0.026, 6, false]} />
            <meshStandardMaterial color="#253141" roughness={0.4} />
          </mesh>
          <VehicleStrut
            from={[0, 0.5, 0.43]}
            to={[0, 0.98, 0.45]}
            radius={0.023}
          />
          <Wing span={width * 0.97} chord={0.27} y={0.19} z={half + 0.48} />
          <Wing
            span={width * 0.92}
            chord={0.16}
            y={0.25}
            z={half + 0.27}
            color={color}
          />
          <Wing span={width * 0.83} chord={0.3} y={0.83} z={-half - 0.23} />
          <Wing
            span={width * 0.8}
            chord={0.15}
            y={0.94}
            z={-half - 0.33}
            color={color}
          />
          <Part size={[0.065, 0.55, 0.07]} at={[0, 0.54, -half - 0.2]} />
          <Part
            size={[0.11, 0.09, 0.035]}
            at={[0, 0.35, -half - 0.5]}
            color="#ee344b"
          />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Part
                size={[0.035, 0.24, 0.43]}
                at={[side * width * 0.475, 0.29, half + 0.42]}
                color={color}
              />
              <Part
                size={[0.035, 0.31, 0.43]}
                at={[side * width * 0.41, 0.8, -half - 0.25]}
                color={color}
              />
              <Part
                size={[0.1, 0.07, 0.19]}
                at={[side * width * 0.37, 0.68, 0.4]}
                color={color}
              />
              {[-1, 1].flatMap((axle) =>
                [-0.3, 0.3].map((offset) => (
                  <VehicleStrut
                    key={`${axle}:${offset}`}
                    from={[side * width * 0.18, 0.31, axle * half + offset]}
                    to={[side * (width / 2 - tyreWidth), radius, axle * half]}
                    radius={0.023}
                  />
                )),
              )}
            </group>
          ))}
        </>
      )}
      {[-1, 1].flatMap((side, sideIndex) =>
        [-1, 1].map((axle, axleIndex) => {
          const index = sideIndex * 2 + axleIndex;
          return (
            <group
              key={index}
              position={[
                side * (width / 2 - tyreWidth / 2),
                radius,
                axle * half,
              ]}
              ref={(node) => {
                if (axle === 1) motion.current.front[sideIndex] = node;
              }}
            >
              <group
                ref={(node) => {
                  motion.current.wheels[index] = node;
                }}
              >
                <Tyre radius={radius} width={tyreWidth} />
                <mesh
                  position={[side * (tyreWidth / 2 + 0.004), 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry
                    args={[radius * 0.58, radius * 0.58, 0.012, 20]}
                  />
                  <meshStandardMaterial
                    color="#727e8b"
                    metalness={0.72}
                    roughness={0.35}
                  />
                </mesh>
                {[0, 1, 2].map((spoke) => (
                  <mesh
                    key={spoke}
                    position={[side * (tyreWidth / 2 + 0.015), 0, 0]}
                    rotation={[(spoke * Math.PI) / 3, 0, 0]}
                  >
                    <boxGeometry args={[0.015, radius * 1.06, 0.033]} />
                    <meshStandardMaterial
                      color="#d5dce1"
                      metalness={0.7}
                      roughness={0.3}
                    />
                  </mesh>
                ))}
                <mesh
                  position={[side * (tyreWidth / 2 + 0.026), 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.065, 0.065, 0.016, 12]} />
                  <meshStandardMaterial
                    color="#293340"
                    metalness={0.65}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            </group>
          );
        }),
      )}
    </group>
  );
});
