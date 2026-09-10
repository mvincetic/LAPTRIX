import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Html } from "@react-three/drei";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { Matrix4, Vector3, type Group } from "three";
import type { ScreenPoint, ScreenRect } from "../corner-callouts";
import {
  GHOST_LABEL_HEIGHT,
  GHOST_LABEL_WIDTH,
  layoutGhostLabels,
} from "../ghost-labels";
import "./ghost-labels.css";

export type GhostLabelSpec = {
  id: "current" | "reference";
  group: RefObject<Group | null>;
  text: string;
  name: string;
  color: string;
};

const canvasOrigin = (): [number, number] => [0, 0];
// Each car's projection determines visibility, independent of the world origin.
const ignoreHtmlOcclusion = () => {};
const obstacleSelector =
  ".sector-label, .corner-marker, .start-marker, .event-marker, .legend, .viewer-popover, .scene-top-left, .compass, .scene-bottom";

export function GhostLabels({
  labels,
  layoutKey,
}: {
  labels: GhostLabelSpec[];
  layoutKey: string;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const names = useRef<(HTMLSpanElement | null)[]>([]);
  const leaders = useRef<(SVGGElement | null)[]>([]);
  const attachRoot = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) invalidate();
    },
    [invalidate],
  );
  const previous = useRef({
    matrix: new Matrix4(),
    projection: new Matrix4(),
    width: 0,
    height: 0,
    labels: null as GhostLabelSpec[] | null,
    layoutKey: "",
    nodes: [] as HTMLElement[],
    obstacles: [] as ScreenRect[],
    anchors: [] as ScreenPoint[],
  });
  useEffect(() => {
    invalidate();
  }, [labels, layoutKey, size.width, size.height, invalidate]);

  // Observe final HTML positions even when corner portals remount after this component.
  useEffect(
    () =>
      addAfterEffect(() => {
        if (
          labels.some(
            (label, index) =>
              !label.group.current ||
              !names.current[index] ||
              !leaders.current[index],
          )
        )
          return;
        camera.updateMatrixWorld();
        const last = previous.current;
        const scene = gl.domElement.closest(".scene");
        // Portal nodes can arrive on a later demand frame without a prop change.
        const nodes = [
          ...(scene?.querySelectorAll<HTMLElement>(obstacleSelector) ?? []),
        ].filter((node) => !node.hidden);
        const geometryChanged =
          last.labels !== labels ||
          last.layoutKey !== layoutKey ||
          last.width !== size.width ||
          last.height !== size.height ||
          !last.matrix.equals(camera.matrixWorld) ||
          !last.projection.equals(camera.projectionMatrix) ||
          nodes.length !== last.nodes.length ||
          nodes.some((node, index) => node !== last.nodes[index]);
        const anchors = labels.flatMap((label, id) => {
          const group = label.group.current!;
          group.updateWorldMatrix(true, false);
          // Use the rendered vehicle transform; label placement never moves a car.
          const point = new Vector3(0, 2, 0)
            .applyMatrix4(group.matrixWorld)
            .project(camera);
          if (point.z < -1 || point.z > 1) return [];
          return [
            {
              id,
              x: ((point.x + 1) * size.width) / 2,
              y: ((1 - point.y) * size.height) / 2,
            },
          ];
        });
        if (
          !geometryChanged &&
          anchors.length === last.anchors.length &&
          anchors.every((point, index) => {
            const before = last.anchors[index];
            return (
              point.id === before.id &&
              point.x === before.x &&
              point.y === before.y
            );
          })
        )
          return;
        if (geometryChanged) {
          const canvas = gl.domElement.getBoundingClientRect();
          last.obstacles = nodes.flatMap((node) => {
            const box = node.getBoundingClientRect();
            return box.width &&
              box.height &&
              box.right > canvas.left &&
              box.left < canvas.right &&
              box.bottom > canvas.top &&
              box.top < canvas.bottom
              ? [
                  {
                    x: box.x - canvas.x - 3,
                    y: box.y - canvas.y - 3,
                    width: box.width + 6,
                    height: box.height + 6,
                  },
                ]
              : [];
          });
        }
        const placement = layoutGhostLabels(
          anchors,
          size.width,
          size.height,
          last.obstacles,
        );
        labels.forEach((_, id) => {
          const name = names.current[id]!,
            leader = leaders.current[id]!;
          const anchor = anchors.find((point) => point.id === id);
          const point = placement.find((point) => point.id === id);
          name.hidden = !point;
          leader.style.display = point ? "" : "none";
          // Expose the visible leader's true anchor separately from the movable name.
          name.dataset.anchorX = anchor ? String(anchor.x) : "";
          name.dataset.anchorY = anchor ? String(anchor.y) : "";
          if (!point) return;
          name.style.transform = `translate(${point.labelX}px, ${point.labelY}px)`;
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
        last.labels = labels;
        last.layoutKey = layoutKey;
        last.width = size.width;
        last.height = size.height;
        last.nodes = nodes;
        last.anchors = anchors;
      }),
    [camera, gl, labels, layoutKey, size.width, size.height],
  );

  return (
    <>
      <Html
        calculatePosition={canvasOrigin}
        zIndexRange={[0, 0]}
        onOcclude={ignoreHtmlOcclusion}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={attachRoot}
          className="ghost-labels"
          style={{ width: size.width, height: size.height }}
        >
          <svg width={size.width} height={size.height} aria-hidden="true">
            {labels.map((label, index) => (
              <g
                key={label.id}
                ref={(node) => {
                  leaders.current[index] = node;
                }}
                style={{ display: "none" }}
              >
                <line stroke={label.color} strokeWidth={1} opacity={0.65} />
                <circle
                  r={2.5}
                  fill={label.color}
                  stroke="#fff"
                  strokeWidth={1}
                />
              </g>
            ))}
          </svg>
        </div>
      </Html>
      <Html
        calculatePosition={canvasOrigin}
        zIndexRange={[10, 10]}
        onOcclude={ignoreHtmlOcclusion}
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={attachRoot}
          className="ghost-labels"
          style={{ width: size.width, height: size.height }}
        >
          {labels.map((label, index) => (
            <span
              key={label.id}
              ref={(node) => {
                names.current[index] = node;
              }}
              hidden
              className="ghost-tag"
              role="img"
              aria-label={label.name}
              style={{
                width: GHOST_LABEL_WIDTH,
                height: GHOST_LABEL_HEIGHT,
                borderColor: label.color,
                color: label.color,
              }}
            >
              {label.text}
            </span>
          ))}
        </div>
      </Html>
    </>
  );
}
