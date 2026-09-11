import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  PerspectiveCamera,
  type Group,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { RotateCcw, Flag, MousePointer2 } from "lucide-react";
import {
  isTimingReference,
  type Lap,
  type Reference,
  type Track,
  type Vehicle,
} from "../../../../packages/shared/schema";
import { TelemetryGhost } from "./TelemetryGhost";
import { Landscape } from "./Landscape";
import { RoadDetails } from "./RoadDetails";
import { CornerCallouts } from "./CornerCallouts";
import { ApexPoints } from "./ApexPoints";
import { SectorLabels } from "./SectorLabels";
import { GhostLabels, type GhostLabelSpec } from "./GhostLabels";
import { TabList } from "./TabList";
import { ViewerToolsPanels } from "./ViewerToolsPanels";
import { FullscreenControl } from "./FullscreenControl";
import { ScenePlayback } from "./ScenePlayback";
import { TrackAttribution } from "./TrackAttribution";
import { CAMERA_FOV, fitTrackCamera } from "../camera-framing";
import { CHASE_FOV, ROAD_SURFACE_LIFT, chaseCameraPose } from "../chase-camera";
import {
  ONBOARD_FOV,
  ONBOARD_NEAR,
  onboardCameraPose,
  onboardMount,
} from "../onboard-camera";
import { roadShoulders, roadSurface } from "../road-presentation";
import { surfaceGrain } from "../surface-grain";
import { northScreenAngle, northScreenLabel } from "../north-indicator";
import { normalizeTrack, type Vec3 } from "../../../../packages/track-engine";
import {
  alignedNativeReference,
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
export type CameraMode = "orbit" | "top" | "chase" | "onboard";
const viewerTabs = ["Track View", "Analysis Layers", "Ghost Car", "Camera"];

function PlaybackFrames({ clock }: { clock: PlaybackClock }) {
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    invalidate();
    return clock.subscribe(invalidate);
  }, [clock, invalidate]);
  useEffect(() => {
    const restored = () => invalidate();
    canvas.addEventListener("webglcontextrestored", restored);
    return () => canvas.removeEventListener("webglcontextrestored", restored);
  }, [canvas, invalidate]);
  useFrame(() => {
    if (clock.getSnapshot().playing) invalidate();
  });
  return null;
}

function Ribbon({
  track,
  color,
  shoulder = false,
}: {
  track: Track;
  color: string;
  shoulder?: boolean;
}) {
  const geometry = useMemo(() => {
    const frame = normalizeTrack(track),
      data = shoulder
        ? { positions: roadShoulders(track), indices: null }
        : roadSurface(track);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    const uv = new Float32Array((data.positions.length / 3) * 2);
    for (let i = 0; i < data.positions.length / 3; i++) {
      uv[i * 2] = (data.positions[i * 3] - frame.center[0]) / 4;
      uv[i * 2 + 1] = (data.positions[i * 3 + 2] - frame.center[2]) / 4;
    }
    g.setAttribute("uv", new BufferAttribute(uv, 2));
    if (data.indices) g.setIndex(new BufferAttribute(data.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [track, shoulder]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const grain = useMemo(() => surfaceGrain(), []);
  useEffect(() => () => grain.dispose(), [grain]);
  return (
    <mesh
      name={shoulder ? "road-shoulders" : "road-asphalt"}
      geometry={geometry}
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        map={grain}
        roughness={1}
        side={DoubleSide}
      />
    </mesh>
  );
}

function CameraRig({
  track,
  mode,
  reset,
  lap,
  clock,
  northIndicator,
  vehicle,
}: {
  track: Track;
  mode: CameraMode;
  reset: number;
  lap: Lap | null;
  clock: PlaybackClock;
  northIndicator: RefObject<HTMLDivElement | null>;
  vehicle?: Vehicle;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const lastNorth = useRef<{
    node: HTMLDivElement;
    angle: number | null;
    label: string;
  } | null>(null);
  const { camera, size, invalidate } = useThree();
  const fit = useMemo(
    () =>
      fitTrackCamera(
        track,
        Math.max(1, size.width) / Math.max(1, size.height),
        mode === "top" ? "top" : "orbit",
      ),
    [track, mode, size.width, size.height],
  );
  useEffect(() => {
    // Drain residual drag/pan motion before imposing a new fitted pose.
    const orbit = controls.current;
    if (orbit) {
      const damping = orbit.enableDamping;
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = damping;
    }
    camera.position.set(...fit.position);
    camera.lookAt(...fit.target);
    if (camera instanceof PerspectiveCamera) {
      camera.fov =
        mode === "onboard"
          ? ONBOARD_FOV
          : mode === "chase"
            ? CHASE_FOV
            : CAMERA_FOV;
      camera.near =
        mode === "onboard" ? ONBOARD_NEAR : mode === "chase" ? 0.2 : fit.near;
      camera.far = fit.far;
      camera.updateProjectionMatrix();
    }
    orbit?.target.set(...fit.target);
    orbit?.update();
    invalidate();
  }, [camera, fit, reset, invalidate, mode]);
  useFrame(() => {
    if (mode === "chase" && lap) {
      const pose = chaseCameraPose(
        lap,
        clock.getSnapshot().time,
        vehicle,
        Math.max(1, size.width) / Math.max(1, size.height),
      );
      camera.position.set(...pose.position);
      camera.lookAt(...pose.target);
    }
    if (mode === "onboard" && lap) {
      const pose = onboardCameraPose(lap, clock.getSnapshot().time, vehicle);
      camera.position.set(...pose.position);
      camera.lookAt(...pose.target);
    }
    // OrbitControls updates before this callback; chase lookAt above also updates rotation.
    const node = northIndicator.current;
    if (!node) return;
    const bearing = northScreenAngle(camera.quaternion);
    const angle =
      bearing === null ? null : (Math.round(bearing * 100) % 36000) / 100;
    const previous = lastNorth.current;
    if (previous?.node === node && previous.angle === angle) return;
    const arrow = node.querySelector("svg");
    if (arrow) {
      arrow.style.transform = angle === null ? "" : `rotate(${angle}deg)`;
      arrow.style.visibility = angle === null ? "hidden" : "visible";
    }
    const label = northScreenLabel(angle);
    if (previous?.node !== node || previous.label !== label) {
      node.setAttribute("aria-label", label);
      node.title = label;
    }
    lastNorth.current = { node, angle, label };
  }, -0.5);
  return (
    <OrbitControls
      ref={controls}
      enabled={mode !== "chase" && mode !== "onboard"}
      makeDefault
      minDistance={fit.minDistance}
      maxDistance={fit.maxDistance}
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
  vehicle,
  reference,
  referenceVehicle,
  clock,
  onCorner,
  selectedCorner,
  calculating,
}: {
  track: Track;
  lap: Lap | null;
  vehicle?: Vehicle;
  reference: Reference | null;
  referenceVehicle?: Vehicle;
  clock: PlaybackClock;
  onCorner: (id: number) => void;
  selectedCorner: number | null;
  calculating: boolean;
}) {
  const [tab, setTab] = useState("Track View"),
    [layers, setLayers] = useState(initialLayers),
    [mode, setMode] = useState<CameraMode>("orbit"),
    [reset, setReset] = useState(0),
    [ghost, setGhost] = useState(true),
    [showReference, setShowReference] = useState(false),
    [compactScene, setCompactScene] = useState(false),
    [legendChoice, setLegendChoice] = useState<boolean | null>(null);
  const legendOpen = legendChoice ?? !compactScene;
  const cameraChosen = useRef(false);
  // Observe only play transitions; the scene must not rerender at clock cadence.
  useEffect(() => {
    let wasPlaying = false;
    const update = () => {
      const playing = clock.getSnapshot().playing;
      if (playing && !wasPlaying && !cameraChosen.current) {
        setMode("chase");
        setGhost(true);
      }
      wasPlaying = playing;
    };
    update();
    return clock.subscribe(update);
  }, [clock]);
  const chooseCamera = (next: CameraMode) => {
    cameraChosen.current = true;
    setMode(next);
    if (next === "chase" || next === "onboard") setGhost(true);
  };
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setCompactScene(
        entry.contentRect.width < 480 || entry.contentRect.height < 350,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const referenceLap = alignedNativeReference(lap, reference);
  const referenceVisible = showReference && !!referenceLap;
  const currentGhost = useRef<Group>(null);
  const referenceGhost = useRef<Group>(null);
  const ghostLabels = useMemo(() => {
    const labels: GhostLabelSpec[] = [];
    if (lap && ghost && referenceVisible && mode !== "onboard")
      labels.push({
        id: "current",
        group: currentGhost,
        text: "CURRENT",
        name: `Current ghost: ${vehicle?.name ?? lap.vehicleId}`,
        color: "#0866ec",
      });
    if (referenceVisible && referenceLap)
      labels.push({
        id: "reference",
        group: referenceGhost,
        text: "REF",
        name: `Reference ghost: ${referenceVehicle?.name ?? referenceLap.vehicleId}`,
        color: "#78879c",
      });
    return labels;
  }, [
    lap,
    ghost,
    referenceVisible,
    referenceLap,
    vehicle,
    referenceVehicle,
    mode,
  ]);
  const tabsPrefix = useId();
  const northIndicator = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null),
    frame = useMemo(() => normalizeTrack(track), [track]);
  const racing = useMemo(
    () =>
      lap?.samples.map(
        (s) => [s.x, s.y + ROAD_SURFACE_LIFT + 0.08, s.z] as Vec3,
      ) || [],
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
        <TabList
          label="Viewer tools"
          prefix={tabsPrefix}
          options={viewerTabs}
          value={tab}
          onChange={setTab}
        />
        <span className="tiny muted desktop-only">
          <span className="status-dot" /> 3D workspace
        </span>
      </div>
      <div className="scene" ref={scene}>
        <ViewerToolsPanels
          prefix={tabsPrefix}
          active={viewerTabs.indexOf(tab)}
          layers={layers}
          onLayers={setLayers}
          ghost={ghost}
          onGhost={setGhost}
          referenceGhost={referenceVisible}
          onReferenceGhost={setShowReference}
          referenceName={
            referenceLap
              ? (referenceVehicle?.name ?? referenceLap.vehicleId)
              : null
          }
          referenceReason={
            !reference
              ? "Set or import a native lap reference to show its vehicle."
              : isTimingReference(reference)
                ? "This timing-only reference has no vehicle positions."
                : "Reference positions must match this source track."
          }
          mode={mode}
          hasLap={!!lap}
          onMode={chooseCamera}
          legendOpen={legendOpen}
          onLegendChange={setLegendChoice}
        />
        <SceneBoundary>
          <Canvas
            className="scene-canvas"
            frameloop="demand"
            camera={{
              position: [0, 1800, 1500],
              fov: CAMERA_FOV,
              near: 1,
              far: 12000,
            }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <PlaybackFrames clock={clock} />
            <color attach="background" args={["#edf2f5"]} />
            <ambientLight intensity={1.65} />
            <directionalLight position={[-800, 1800, 700]} intensity={2.1} />
            {layers.terrain && (
              <Landscape
                track={track}
                sourceFingerprint={lap?.alignment?.trackFingerprint}
              />
            )}
            <Ribbon track={track} color="#c9c5b7" shoulder />
            <Ribbon track={track} color="#363d43" />
            <RoadDetails track={track} />
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
            {lap &&
              lap.corners.length > 0 &&
              layers.apex &&
              mode !== "chase" &&
              mode !== "onboard" && <ApexPoints lap={lap} />}
            {lap?.corners.map((c) => {
              const s = lap.samples[c.apexIndex];
              return (
                <group key={c.id}>
                  {layers.corners && mode !== "chase" && mode !== "onboard" && (
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
              mode !== "chase" &&
              mode !== "onboard" && (
                <SectorLabels
                  lap={lap}
                  layoutKey={`${tab}:${layers.corners}:${legendOpen}`}
                />
              )}
            {mode !== "onboard" && (
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
            )}
            {lap && ghost && (
              <TelemetryGhost
                lap={lap}
                clock={clock}
                marker={mode !== "chase" && mode !== "onboard"}
                vehicle={vehicle}
                groupRef={currentGhost}
              />
            )}
            {referenceVisible && referenceLap && (
              <TelemetryGhost
                lap={referenceLap}
                clock={clock}
                marker
                vehicle={referenceVehicle}
                reference
                groupRef={referenceGhost}
              />
            )}
            <CameraRig
              track={track}
              mode={mode}
              reset={reset}
              lap={lap}
              clock={clock}
              northIndicator={northIndicator}
              vehicle={vehicle}
            />
            {lap &&
              selectedCorner &&
              mode !== "chase" &&
              mode !== "onboard" && (
                <CornerCallouts
                  lap={lap}
                  cornerId={selectedCorner}
                  clock={clock}
                  layoutKey={`${tab}:${layers.sectors}:${layers.corners}:${legendOpen}`}
                />
              )}
            {ghostLabels.length > 0 && (
              <GhostLabels
                labels={ghostLabels}
                layoutKey={`${tab}:${layers.sectors}:${layers.corners}:${selectedCorner}:${mode}:${legendOpen}`}
              />
            )}
          </Canvas>
        </SceneBoundary>
        <div className="scene-top-left">
          <span className="pill" title={track.provenance}>
            {track.synthetic
              ? "SYNTHETIC DEVELOPMENT CIRCUIT"
              : track.attribution
                ? "APPROXIMATE CIRCUIT · SOURCE DATA"
                : "USER-SUPPLIED TRACK · UNVERIFIED"}
          </span>
          <span className="scene-instruction">
            <MousePointer2 size={12} />{" "}
            {mode === "onboard"
              ? `${onboardMount(vehicle ?? lap?.vehicle).label} · play or scrub below`
              : mode === "chase"
                ? "Chase camera · play or scrub below"
                : "Drag to orbit · scroll to zoom"}
          </span>
        </div>
        <div
          ref={northIndicator}
          className="compass"
          role="img"
          aria-label="North direction unavailable until the view is ready."
        >
          <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2 20 21 12 17 4 21Z"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinejoin="round"
            />
          </svg>
          <span>N</span>
        </div>
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
              {(["orbit", "top", "chase", "onboard"] as CameraMode[]).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => chooseCamera(m)}
                    className={mode === m ? "active" : ""}
                    aria-pressed={mode === m}
                    disabled={!lap && (m === "chase" || m === "onboard")}
                  >
                    {m === "orbit"
                      ? "3D View"
                      : m === "top"
                        ? "Top View"
                        : m === "onboard"
                          ? "Onboard"
                          : "Chase"}
                  </button>
                ),
              )}
            </div>
            <button
              className="icon-button"
              aria-label="Reset camera"
              onClick={() => {
                cameraChosen.current = true;
                setReset((x) => x + 1);
              }}
            >
              <RotateCcw size={15} />
            </button>
            <FullscreenControl target={panel} />
          </div>
        </div>
        {!lap && (
          <div className="scene-lap-prompt">
            {calculating
              ? "Calculating the racing line…"
              : "Run a simulation to calculate the racing line."}
          </div>
        )}
      </div>
      <ScenePlayback
        lap={lap}
        clock={clock}
        calculating={calculating}
        vehicleName={vehicle?.name ?? lap?.vehicleId}
        referenceName={
          referenceVisible
            ? (referenceVehicle?.name ?? referenceLap?.vehicleId)
            : undefined
        }
        currentVisible={ghost}
        onFollow={() => chooseCamera("chase")}
      />
      <TrackAttribution track={track} />
    </section>
  );
}
