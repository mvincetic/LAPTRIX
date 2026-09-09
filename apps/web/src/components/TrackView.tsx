import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Object3D,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Expand,
  Layers,
  RotateCcw,
  Navigation,
  Eye,
  Flag,
  MousePointer2,
} from "lucide-react";
import type { Lap, Track } from "../../../../packages/shared/schema";
import {
  normalizeTrack,
  ribbonGeometry,
  type Vec3,
} from "../../../../packages/track-engine";
import {
  formatTime,
  interpolate,
  type PlaybackClock,
} from "../../../../packages/telemetry";

export type ViewLayers = {
  racingLine: boolean;
  braking: boolean;
  apex: boolean;
  corners: boolean;
  sectors: boolean;
  centerline: boolean;
  boundaries: boolean;
  terrain: boolean;
};
const initialLayers: ViewLayers = {
  racingLine: true,
  braking: true,
  apex: true,
  corners: true,
  sectors: true,
  centerline: false,
  boundaries: false,
  terrain: true,
};
type CameraMode = "orbit" | "top" | "chase";

function Ribbon({
  track,
  left,
  right,
  color,
  lift = 0,
}: {
  track: Track;
  left: number | number[];
  right: number | number[];
  color: string;
  lift?: number;
}) {
  const geometry = useMemo(() => {
    const frame = normalizeTrack(track),
      data = ribbonGeometry(track.points, frame.normals, left, right, lift);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    g.setIndex(new BufferAttribute(data.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [track, left, right, lift]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={1} side={DoubleSide} />
    </mesh>
  );
}

function Landscape({ track }: { track: Track }) {
  const data = useMemo(() => {
    const f = normalizeTrack(track),
      positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [],
      trees: Vec3[] = [];
    const box = new Box3(
      new Vector3(...f.min),
      new Vector3(...f.max),
    ).expandByScalar(f.span * 0.18);
    const nx = 70,
      nz = 45;
    function height(x: number, z: number) {
      let nearest = Infinity,
        y = 0;
      for (let i = 0; i < track.points.length; i += 3) {
        const p = track.points[i],
          d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < nearest) {
          nearest = d;
          y = p.y;
        }
      }
      return {
        height: y - 9 - Math.min(25, Math.sqrt(nearest) * 0.055),
        distance: Math.sqrt(nearest),
      };
    }
    for (let z = 0; z <= nz; z++)
      for (let x = 0; x <= nx; x++) {
        const px = box.min.x + ((box.max.x - box.min.x) * x) / nx,
          pz = box.min.z + ((box.max.z - box.min.z) * z) / nz;
        const h = height(px, pz);
        positions.push(px, h.height, pz);
        const c = new Color("#edf0ed").lerp(
          new Color("#dce4df"),
          Math.min(1, h.distance / 280) * 0.55,
        );
        colors.push(c.r, c.g, c.b);
        if (x < nx && z < nz) {
          const a = z * (nx + 1) + x,
            b = a + nx + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    let seed = 37;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 1800; i++) {
      const x = box.min.x + random() * (box.max.x - box.min.x),
        z = box.min.z + random() * (box.max.z - box.min.z),
        h = height(x, z);
      if (h.distance > 38 && h.distance < 240 && random() > 0.25)
        trees.push([x, h.height + 6, z]);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(colors), 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return { geometry, trees };
  }, [track]);
  const treeRef = useRef<import("three").InstancedMesh>(null);
  useEffect(() => {
    const o = new Object3D();
    data.trees.forEach((p, i) => {
      o.position.set(...p);
      const s = 8 + (i % 7);
      o.scale.set(s * 0.65, s, s * 0.65);
      o.updateMatrix();
      treeRef.current?.setMatrixAt(i, o.matrix);
    });
    if (treeRef.current) treeRef.current.instanceMatrix.needsUpdate = true;
    return () => data.geometry.dispose();
  }, [data]);
  return (
    <group>
      <mesh geometry={data.geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <instancedMesh
        ref={treeRef}
        args={[undefined, undefined, data.trees.length]}
      >
        <coneGeometry args={[1, 2, 7]} />
        <meshStandardMaterial color="#c1cec7" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function Ghost({ lap, clock }: { lap: Lap; clock: PlaybackClock }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = interpolate(lap.samples, clock.getSnapshot().time),
      next = interpolate(
        lap.samples,
        (clock.getSnapshot().time + 0.15) % lap.lapTime,
      );
    ref.current.position.set(s.x, s.y + 2, s.z);
    ref.current.rotation.y = Math.atan2(next.x - s.x, next.z - s.z);
  });
  return (
    <group ref={ref} scale={3}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.75, 0.65, 3.8]} />
        <meshStandardMaterial color="#0866ec" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.25, 2]}>
        <boxGeometry args={[1.95, 0.13, 0.6]} />
        <meshStandardMaterial color="#0866ec" />
      </mesh>
      <mesh position={[0, 0.7, -1.9]}>
        <boxGeometry args={[1.7, 0.18, 0.6]} />
        <meshStandardMaterial color="#142746" />
      </mesh>
      <mesh position={[0, 0.82, -0.3]}>
        <sphereGeometry args={[0.34, 12, 8]} />
        <meshStandardMaterial color="#142746" />
      </mesh>
      {[-0.85, 0.85].flatMap((x) =>
        [-1.25, 1.3].map((z) => (
          <mesh
            key={`${x}${z}`}
            position={[x, 0.35, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.4, 0.4, 0.4, 12]} />
            <meshStandardMaterial color="#202b39" />
          </mesh>
        )),
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <ringGeometry args={[3.2, 3.7, 32]} />
        <meshBasicMaterial
          color="#0866ec"
          transparent
          opacity={0.7}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function CameraRig({
  track,
  mode,
  reset,
  lap,
  clock,
}: {
  track: Track;
  mode: CameraMode;
  reset: number;
  lap: Lap | null;
  clock: PlaybackClock;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const frame = useMemo(() => normalizeTrack(track), [track]);
  useEffect(() => {
    const [x, y, z] = frame.center;
    const fit = frame.span * Math.max(0.86, 1.45 / (size.width / size.height));
    if (mode === "top") camera.position.set(x, y + fit * 1.05, z + 1);
    else camera.position.set(x + fit * 0.1, y + fit * 0.79, z + fit * 0.62);
    camera.lookAt(x, y, z);
    controls.current?.target.set(x, y, z);
    controls.current?.update();
  }, [camera, frame, mode, reset, size.width, size.height]);
  useFrame(() => {
    if (mode !== "chase" || !lap) return;
    const state = clock.getSnapshot(),
      s = interpolate(lap.samples, state.time),
      next = interpolate(lap.samples, (state.time + 0.3) % lap.lapTime);
    const dx = next.x - s.x,
      dz = next.z - s.z,
      len = Math.hypot(dx, dz) || 1;
    camera.position.set(s.x - (dx / len) * 50, s.y + 25, s.z - (dz / len) * 50);
    camera.lookAt(next.x, next.y + 2, next.z);
  });
  return (
    <OrbitControls
      ref={controls}
      enabled={mode !== "chase"}
      makeDefault
      minDistance={40}
      maxDistance={frame.span * 3}
      maxPolarAngle={Math.PI * 0.48}
      enableDamping
      dampingFactor={0.12}
    />
  );
}

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-error">
        3D rendering is unavailable. Enable WebGL or hardware acceleration and
        reload. Telemetry and analysis remain available.
      </div>
    ) : (
      this.props.children
    );
  }
}

export function TrackView({
  track,
  lap,
  clock,
  onCorner,
  selectedCorner,
}: {
  track: Track;
  lap: Lap | null;
  clock: PlaybackClock;
  onCorner: (id: number) => void;
  selectedCorner: number | null;
}) {
  const [tab, setTab] = useState("Track View"),
    [layers, setLayers] = useState(initialLayers),
    [mode, setMode] = useState<CameraMode>("orbit"),
    [reset, setReset] = useState(0),
    [ghost, setGhost] = useState(true);
  const panel = useRef<HTMLElement>(null),
    frame = useMemo(() => normalizeTrack(track), [track]);
  const widths = useMemo(
    () => ({
      left: track.points.map((p) => p.widthLeft),
      right: track.points.map((p) => p.widthRight),
    }),
    [track],
  );
  const racing = useMemo(
    () => lap?.samples.map((s) => [s.x, s.y + 1.5, s.z] as Vec3) || [],
    [lap],
  );
  const colors = useMemo(
    () =>
      lap?.samples.map(
        (s) =>
          new Color(layers.braking && s.brake > 0.08 ? "#fa454b" : "#0866ec"),
      ) || [],
    [lap, layers.braking],
  );
  const centerline = useMemo(
    () =>
      [...track.points, track.points[0]].map(
        (p) => [p.x, p.y + 1.8, p.z] as Vec3,
      ),
    [track],
  );
  return (
    <section
      ref={panel}
      className="panel track-panel"
      aria-label="Interactive track viewer"
    >
      <div className="panel-tabs">
        <div className="tabs" role="tablist" aria-label="Viewer tools">
          {["Track View", "Analysis Layers", "Ghost Car", "Camera"].map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="tiny muted desktop-only">
          <span className="status-dot" /> 3D workspace
        </span>
      </div>
      <div className="scene">
        <SceneBoundary>
          <Canvas
            camera={{ position: [0, 1800, 1500], fov: 45, near: 1, far: 12000 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <color attach="background" args={["#f0f3f3"]} />
            <ambientLight intensity={1.65} />
            <directionalLight position={[-800, 1800, 700]} intensity={2.1} />
            {layers.terrain && <Landscape track={track} />}
            <Ribbon
              track={track}
              left={widths.left.map((w) => w + 4)}
              right={widths.right.map((w) => w + 4)}
              color="#f9faf9"
              lift={0.25}
            />
            <Ribbon
              track={track}
              left={widths.left}
              right={widths.right}
              color="#46566a"
              lift={0.55}
            />
            {layers.centerline && (
              <Line
                points={centerline}
                color="#b578c0"
                lineWidth={1}
                dashed
                dashSize={10}
                gapSize={8}
              />
            )}
            {layers.boundaries && (
              <>
                <Line
                  points={[...frame.left, frame.left[0]].map((p) => [
                    p[0],
                    p[1] + 2,
                    p[2],
                  ])}
                  color="#758b9c"
                  lineWidth={1}
                />
                <Line
                  points={[...frame.right, frame.right[0]].map((p) => [
                    p[0],
                    p[1] + 2,
                    p[2],
                  ])}
                  color="#758b9c"
                  lineWidth={1}
                />
              </>
            )}
            {layers.racingLine && lap && (
              <Line points={racing} vertexColors={colors} lineWidth={3} />
            )}
            {lap?.corners.map((c) => {
              const s = lap.samples[c.apexIndex];
              return (
                <group key={c.id}>
                  {layers.apex && (
                    <mesh position={[s.x, s.y + 3, s.z]}>
                      <sphereGeometry args={[4, 12, 8]} />
                      <meshBasicMaterial color="#26b85b" />
                    </mesh>
                  )}
                  {layers.corners && (
                    <Html
                      center
                      position={[
                        s.x + frame.normals[c.apexIndex][0] * 30,
                        s.y + 12,
                        s.z + frame.normals[c.apexIndex][2] * 30,
                      ]}
                      zIndexRange={[10, 0]}
                    >
                      <button
                        className={`corner-marker ${selectedCorner === c.id ? "selected" : ""}`}
                        onClick={() => onCorner(c.id)}
                        aria-label={`Inspect corner ${c.id}`}
                      >
                        {c.id}
                      </button>
                    </Html>
                  )}
                </group>
              );
            })}
            {lap &&
              layers.sectors &&
              lap.sectors.map((s) => {
                const sample = interpolate(
                  lap.samples,
                  (s.startDistance + s.endDistance) / 2,
                  "distance",
                );
                return (
                  <Html
                    key={s.id}
                    position={[sample.x, sample.y + 30, sample.z - 75]}
                    center
                    zIndexRange={[9, 0]}
                  >
                    <div className="sector-label">
                      <span>SECTOR {s.id}</span>
                      <strong>{s.time.toFixed(3)}</strong>
                    </div>
                  </Html>
                );
              })}
            <Html
              position={[
                track.points[0].x,
                track.points[0].y + 18,
                track.points[0].z,
              ]}
              center
              zIndexRange={[8, 0]}
            >
              <div className="start-marker">
                <Flag size={11} />
              </div>
            </Html>
            {lap && ghost && <Ghost lap={lap} clock={clock} />}
            <CameraRig
              track={track}
              mode={mode}
              reset={reset}
              lap={lap}
              clock={clock}
            />
          </Canvas>
        </SceneBoundary>
        <div className="scene-top-left">
          <span className="pill">SYNTHETIC DEVELOPMENT CIRCUIT</span>
          <span className="scene-instruction">
            <MousePointer2 size={12} /> Drag to orbit · scroll to zoom
          </span>
        </div>
        <div className="compass">
          <Navigation size={24} strokeWidth={1.3} />
          <span>N</span>
        </div>
        {tab === "Track View" && (
          <div className="legend">
            <span>
              <i className="line-key blue" />
              Racing line
            </span>
            <span>
              <i className="line-key red" />
              Braking zone
            </span>
            <span>
              <i className="dot-key" />
              Apex point
            </span>
            <span>
              <i className="number-key">1</i>Corner number
            </span>
          </div>
        )}
        {tab === "Analysis Layers" && (
          <div className="viewer-popover">
            <h3>
              <Layers size={14} /> Analysis layers
            </h3>
            {Object.entries(layers).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => setLayers({ ...layers, [key]: !value })}
                />
                {
                  (
                    {
                      racingLine: "Racing line",
                      braking: "Braking zones",
                      apex: "Apex points",
                      corners: "Corner numbers",
                      sectors: "Sector labels",
                      centerline: "Centerline debug",
                      boundaries: "Track boundaries",
                      terrain: "Terrain & trees",
                    } as Record<string, string>
                  )[key]
                }
              </label>
            ))}
          </div>
        )}
        {tab === "Ghost Car" && (
          <div className="viewer-popover">
            <h3>
              <Eye size={14} /> Telemetry ghost
            </h3>
            <label>
              <input
                type="checkbox"
                checked={ghost}
                onChange={(e) => setGhost(e.target.checked)}
              />
              Show ghost vehicle
            </label>
            <p>
              Playback follows the calculated lap. Use the transport below to
              play or seek.
            </p>
            <span className="tiny muted">
              Vehicle shown at 3× scale for visibility.
            </span>
          </div>
        )}
        {tab === "Camera" && (
          <div className="viewer-popover">
            <h3>Camera mode</h3>
            {(["orbit", "top", "chase"] as CameraMode[]).map((m) => (
              <button
                className={`option-button ${mode === m ? "active" : ""}`}
                key={m}
                onClick={() => setMode(m)}
              >
                {
                  {
                    orbit: "Orbit · perspective",
                    top: "Top · engineering",
                    chase: "Chase · telemetry",
                  }[m]
                }
              </button>
            ))}
          </div>
        )}
        <div className="scene-bottom">
          <div className="track-caption">
            <strong>{track.name}</strong>
            <span>
              {(frame.length / 1000).toFixed(3)} km <b>·</b>{" "}
              {lap?.corners.length ?? "—"} detected corners <b>·</b>{" "}
              {frame.elevationRange.toFixed(0)} m elevation
            </span>
          </div>
          <div className="view-actions">
            <div className="segmented">
              {(["orbit", "top", "chase"] as CameraMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={mode === m ? "active" : ""}
                >
                  {m === "orbit"
                    ? "3D View"
                    : m === "top"
                      ? "Top View"
                      : "Chase"}
                </button>
              ))}
            </div>
            <button
              className="icon-button"
              aria-label="Reset camera"
              onClick={() => setReset((x) => x + 1)}
            >
              <RotateCcw size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="Fullscreen viewer"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void panel.current?.requestFullscreen();
              }}
            >
              <Expand size={15} />
            </button>
          </div>
        </div>
        {!lap && (
          <div className="scene-lap-prompt">
            Run a simulation to calculate the racing line.
          </div>
        )}
      </div>
      <div className="scene-footer">
        <span>
          <span className="status-dot" /> Procedural geometry
        </span>
        <span>
          Metres · Y-up <b> / </b> {track.points.length} samples
        </span>
        <span className="tiny">
          {lap
            ? `${formatTime(lap.lapTime)} calculated lap`
            : "Ready for simulation"}
        </span>
      </div>
    </section>
  );
}
