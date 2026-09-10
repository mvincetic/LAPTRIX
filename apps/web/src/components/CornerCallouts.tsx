import { useCallback, useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Matrix4, Vector3 } from "three";
import type { Lap } from "../../../../packages/shared/schema";
import type { PlaybackClock } from "../../../../packages/telemetry";
import { layoutEventCallouts, type ScreenRect } from "../corner-callouts";
import "./corner-callouts.css";

const canvasOrigin = (): [number, number] => [0, 0];
// Visibility comes from each projected event, rather than Html's single world origin.
const ignoreHtmlOcclusion = () => {};
const names = ["BRAKE", "TURN-IN", "THROTTLE"];
const colors = ["#de3f4e", "#b07a20", "#079e71"];

export function CornerCallouts({
  lap,
  cornerId,
  clock,
  layoutKey,
}: {
  lap: Lap;
  cornerId: number;
  clock: PlaybackClock;
  layoutKey: string;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const root = useRef<HTMLDivElement>(null);
  const attachRoot = useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      if (node) invalidate();
    },
    [invalidate],
  );
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const leaders = useRef<(SVGGElement | null)[]>([]);
  const events = useMemo(() => {
    const corner = lap.corners.find((corner) => corner.id === cornerId);
    return corner
      ? (["brakingIndex", "turnInIndex", "throttleIndex"] as const).map(
          (key) => {
            const index = corner[key],
              sample = lap.samples[index];
            return {
              index,
              sample,
              position: new Vector3(sample.x, sample.y + 3, sample.z),
            };
          },
        )
      : [];
  }, [lap, cornerId]);
  const previous = useRef({
    matrix: new Matrix4(),
    projection: new Matrix4(),
    width: 0,
    height: 0,
    events: null as typeof events | null,
    layoutKey: "",
  });
  useEffect(() => {
    invalidate();
  }, [events, layoutKey, size.width, size.height, invalidate]);

  useFrame(() => {
    if (
      !root.current ||
      events.some(
        (_, index) => !buttons.current[index] || !leaders.current[index],
      )
    )
      return;
    camera.updateMatrixWorld();
    const last = previous.current;
    if (
      last.events === events &&
      last.layoutKey === layoutKey &&
      last.width === size.width &&
      last.height === size.height &&
      last.matrix.equals(camera.matrixWorld) &&
      last.projection.equals(camera.projectionMatrix)
    )
      return;
    const canvas = gl.domElement.getBoundingClientRect();
    const scene = gl.domElement.closest(".scene");
    const obstacles: ScreenRect[] = [];
    for (const node of scene?.querySelectorAll(
      ".legend, .viewer-popover, .scene-top-left, .compass, .scene-bottom, .sector-label, .corner-marker, .start-marker",
    ) ?? []) {
      const box = node.getBoundingClientRect();
      if (
        box.width &&
        box.height &&
        box.right > canvas.left &&
        box.left < canvas.right &&
        box.bottom > canvas.top &&
        box.top < canvas.bottom
      ) {
        obstacles.push({
          x: box.x - canvas.x - 3,
          y: box.y - canvas.y - 3,
          width: box.width + 6,
          height: box.height + 6,
        });
      }
    }
    const projected = events
      .map((event, id) => {
        const point = event.position.clone().project(camera);
        return {
          id,
          x: ((point.x + 1) * size.width) / 2,
          y: ((1 - point.y) * size.height) / 2,
          depth: point.z,
        };
      })
      .filter((point) => point.depth >= -1 && point.depth <= 1);
    const placement = layoutEventCallouts(
      projected,
      size.width,
      size.height,
      obstacles,
    );
    events.forEach((_, id) => {
      const button = buttons.current[id]!,
        leader = leaders.current[id]!;
      const point = placement.find((point) => point.id === id);
      button.hidden = !point;
      leader.style.display = point ? "" : "none";
      if (!point) return;
      button.style.transform = `translate(${point.labelX}px, ${point.labelY}px)`;
      const line = leader.querySelector("line")!,
        dot = leader.querySelector("circle")!;
      line.setAttribute("x1", String(point.x));
      line.setAttribute("y1", String(point.y));
      line.setAttribute("x2", String(point.leaderX));
      line.setAttribute("y2", String(point.leaderY));
      dot.setAttribute("cx", String(point.x));
      dot.setAttribute("cy", String(point.y));
    });
    last.matrix.copy(camera.matrixWorld);
    last.projection.copy(camera.projectionMatrix);
    last.events = events;
    last.layoutKey = layoutKey;
    last.width = size.width;
    last.height = size.height;
  });

  if (!events.length) return null;
  return (
    <Html
      calculatePosition={canvasOrigin}
      zIndexRange={[11, 11]}
      onOcclude={ignoreHtmlOcclusion}
      style={{ pointerEvents: "none" }}
    >
      <div
        ref={attachRoot}
        className="corner-callouts"
        role="group"
        aria-label="Selected corner events"
        style={{ width: size.width, height: size.height }}
      >
        <svg width={size.width} height={size.height} aria-hidden="true">
          {events.map((event, id) => (
            <g
              key={id}
              ref={(node) => {
                leaders.current[id] = node;
              }}
              style={{ display: "none" }}
              data-sample-index={event.index}
            >
              <line stroke={colors[id]} strokeWidth={1} />
              <circle r={3} fill={colors[id]} stroke="#fff" strokeWidth={1} />
            </g>
          ))}
        </svg>
        {events.map((event, id) => (
          <button
            key={id}
            ref={(node) => {
              buttons.current[id] = node;
            }}
            hidden
            className={`event-marker event-${id}`}
            aria-label={`Inspect ${names[id].toLowerCase()} event at ${event.sample.distance.toFixed(0)} metres`}
            title={`${names[id]} · ${event.sample.distance.toFixed(0)} m`}
            onClick={() => {
              clock.play(false);
              clock.seek(event.sample.time);
            }}
          >
            {names[id]}
          </button>
        ))}
      </div>
    </Html>
  );
}
