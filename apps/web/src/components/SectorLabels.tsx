import { useCallback, useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Matrix4, Vector3 } from "three";
import type { Lap } from "../../../../packages/shared/schema";
import { interpolate } from "../../../../packages/telemetry";
import { ROAD_SURFACE_LIFT } from "../chase-camera";
import { registerAnnotationLayout } from "../annotation-layout";
import { layoutSectorLabels } from "../sector-labels";

const canvasOrigin = (): [number, number] => [0, 0];
const ignoreHtmlOcclusion = () => {};
const obstacleSelector =
  ".corner-marker, .start-marker, .event-marker, .legend, .viewer-popover, .scene-top-left, .compass, .scene-bottom";

export function SectorLabels({
  lap,
  layoutKey,
}: {
  lap: Lap;
  layoutKey: string;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const badges = useRef<(HTMLDivElement | null)[]>([]);
  const leaders = useRef<(SVGGElement | null)[]>([]);
  const attachRoot = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) invalidate();
    },
    [invalidate],
  );
  const sectors = useMemo(
    () =>
      lap.sectors.map((sector) => {
        const sample = interpolate(
          lap.samples,
          (sector.startDistance + sector.endDistance) / 2,
          "distance",
        );
        return {
          ...sector,
          anchor: new Vector3(
            sample.x,
            sample.y + ROAD_SURFACE_LIFT + 0.08,
            sample.z,
          ),
        };
      }),
    [lap],
  );
  const previous = useRef({
    matrix: new Matrix4(),
    projection: new Matrix4(),
    width: 0,
    height: 0,
    sectors: null as typeof sectors | null,
    layoutKey: "",
    nodes: [] as HTMLElement[],
    dimensions: "",
  });
  useEffect(() => {
    invalidate();
  }, [sectors, layoutKey, size.width, size.height, invalidate]);
  useEffect(
    () =>
      registerAnnotationLayout("sectors", (upstreamChanged) => {
        if (sectors.some((_, i) => !badges.current[i] || !leaders.current[i]))
          return false;
        camera.updateMatrixWorld();
        const scene = gl.domElement.closest(".scene");
        const nodes = [
          ...(scene?.querySelectorAll<HTMLElement>(obstacleSelector) ?? []),
        ].filter((node) => !node.hidden);
        const dimensions = sectors.map((_, i) => ({
          width: badges.current[i]!.offsetWidth,
          height: badges.current[i]!.offsetHeight,
        }));
        const dimensionKey = dimensions
          .map((d) => `${d.width}:${d.height}`)
          .join(";");
        const last = previous.current;
        if (
          !upstreamChanged &&
          last.sectors === sectors &&
          last.layoutKey === layoutKey &&
          last.width === size.width &&
          last.height === size.height &&
          last.dimensions === dimensionKey &&
          last.matrix.equals(camera.matrixWorld) &&
          last.projection.equals(camera.projectionMatrix) &&
          nodes.length === last.nodes.length &&
          nodes.every((node, i) => node === last.nodes[i])
        )
          return false;
        const canvas = gl.domElement.getBoundingClientRect();
        const obstacles = nodes.flatMap((node) => {
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
        const anchors = sectors.flatMap((sector, id) => {
          const point = sector.anchor.clone().project(camera);
          return point.z >= -1 && point.z <= 1
            ? [
                {
                  id,
                  x: ((point.x + 1) * size.width) / 2,
                  y: ((1 - point.y) * size.height) / 2,
                  ...dimensions[id],
                },
              ]
            : [];
        });
        const placement = layoutSectorLabels(
          anchors,
          size.width,
          size.height,
          obstacles,
        );
        sectors.forEach((_, id) => {
          const badge = badges.current[id]!,
            leader = leaders.current[id]!;
          const point = placement.find((p) => p.id === id);
          badge.hidden = !point;
          leader.style.display = point ? "" : "none";
          if (!point) return;
          badge.style.transform = `translate(${point.labelX}px, ${point.labelY}px)`;
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
        last.width = size.width;
        last.height = size.height;
        last.sectors = sectors;
        last.layoutKey = layoutKey;
        last.nodes = nodes;
        last.dimensions = dimensionKey;
        return true;
      }),
    [camera, gl, sectors, layoutKey, size.width, size.height],
  );
  return (
    <Html
      calculatePosition={canvasOrigin}
      zIndexRange={[9, 9]}
      onOcclude={ignoreHtmlOcclusion}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="sector-labels"
        ref={attachRoot}
        style={{ width: size.width, height: size.height }}
        role="group"
        aria-label="Sector times on track"
      >
        <svg width={size.width} height={size.height} aria-hidden="true">
          {sectors.map((sector, i) => (
            <g
              key={sector.id}
              ref={(node) => {
                leaders.current[i] = node;
              }}
              style={{ display: "none" }}
              data-sector-id={sector.id}
            >
              <line stroke="#718399" strokeWidth={1} opacity={0.7} />
              <circle r={2} fill="#718399" stroke="#fff" strokeWidth={1} />
            </g>
          ))}
        </svg>
        {sectors.map((sector, i) => (
          <div
            key={sector.id}
            ref={(node) => {
              badges.current[i] = node;
            }}
            hidden
            className="sector-label"
            data-sector-id={sector.id}
          >
            <span>SECTOR {sector.id}</span>
            <strong>{sector.time.toFixed(3)}</strong>
          </div>
        ))}
      </div>
    </Html>
  );
}
