import type { Vehicle } from "../../../../packages/shared/schema";

/** Original schematic geometry. Body style changes appearance, never simulation physics. */
export function VehicleMesh({ vehicle }: { vehicle?: Vehicle }) {
  const width = vehicle?.width ?? 2;
  const wheelbase = vehicle?.wheelbase ?? 3.6;
  const radius = vehicle?.wheelRadius ?? 0.34;
  const coupe = vehicle?.bodyStyle === "coupe";
  const length = wheelbase + (coupe ? 1.7 : 1.0);
  return (
    <group>
      <mesh position={[0, coupe ? 0.57 : 0.4, 0]}>
        <boxGeometry
          args={[
            coupe ? width * 0.94 : width * 0.38,
            coupe ? 0.55 : 0.55,
            length,
          ]}
        />
        <meshStandardMaterial color="#0866ec" metalness={0.3} roughness={0.3} />
      </mesh>
      {coupe ? (
        <>
          <mesh position={[0, 1.0, -0.12]}>
            <boxGeometry args={[width * 0.73, 0.5, length * 0.44]} />
            <meshStandardMaterial
              color="#203550"
              metalness={0.4}
              roughness={0.22}
            />
          </mesh>
          <mesh position={[0, 1.27, -0.2]}>
            <boxGeometry args={[width * 0.74, 0.06, length * 0.29]} />
            <meshStandardMaterial color="#0866ec" />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * width * 0.33, 0.62, length / 2 + 0.01]}>
                <boxGeometry args={[0.34, 0.12, 0.05]} />
                <meshStandardMaterial
                  color="#eaf6ff"
                  emissive="#aacdff"
                  emissiveIntensity={0.3}
                />
              </mesh>
              <mesh position={[side * width * 0.32, 0.6, -length / 2 - 0.01]}>
                <boxGeometry args={[0.44, 0.1, 0.05]} />
                <meshStandardMaterial color="#f3424e" />
              </mesh>
              <mesh position={[side * width * 0.3, 1.03, -length * 0.42]}>
                <boxGeometry args={[0.08, 0.55, 0.12]} />
                <meshStandardMaterial color="#142746" />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <mesh position={[0, 0.82, -0.3]}>
          <sphereGeometry args={[0.34, 12, 8]} />
          <meshStandardMaterial color="#142746" />
        </mesh>
      )}
      <mesh position={[0, 0.22, length / 2]}>
        <boxGeometry args={[width * 0.97, 0.12, 0.4]} />
        <meshStandardMaterial color="#142746" />
      </mesh>
      <mesh position={[0, coupe ? 1.3 : 0.75, -length * 0.42]}>
        <boxGeometry args={[width * 0.9, 0.14, 0.5]} />
        <meshStandardMaterial color="#142746" />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((axle) => (
          <mesh
            key={`${side}-${axle}`}
            position={[
              side * (width / 2 - 0.15),
              radius,
              (axle * wheelbase) / 2,
            ]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[radius, radius, 0.3, 16]} />
            <meshStandardMaterial color="#202b39" />
          </mesh>
        )),
      )}
    </group>
  );
}
