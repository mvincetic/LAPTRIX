import { useId, useMemo } from "react";
import {
  isTimingReference,
  type Lap,
  type Reference,
} from "../../../../packages/shared/schema";
import {
  comparisonTone,
  prepareTimeComparison,
  signed,
} from "../../../../packages/telemetry";
import { viewportFraction, type PlotViewport } from "../plotViewport";

export function TimeDeltaPlot({
  lap,
  reference,
  axis,
  time,
  progress,
  viewport,
  onSeek,
}: {
  lap: Lap | null;
  reference: Reference | null;
  axis: "distance" | "time";
  time: number;
  progress: number;
  viewport: PlotViewport;
  onSeek: (fraction: number) => void;
}) {
  const id = useId();
  const comparison = useMemo(
    () => (lap ? prepareTimeComparison(lap, reference) : null),
    [lap, reference],
  );
  const plot = useMemo(() => {
    if (!comparison || !lap) return null;
    const maxDelta = Math.max(
      0,
      ...comparison.samples.map((s) => Math.abs(s.delta)),
    );
    const bound = Math.max(0.1, maxDelta) * 1.1;
    const max = axis === "distance" ? lap.length : lap.lapTime;
    const path = comparison.samples
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${((s[axis] / max) * 1000).toFixed(3)},${(100 - (s.delta / bound) * 90).toFixed(3)}`,
      )
      .join(" ");
    return {
      bound,
      max,
      path,
      neutral: comparisonTone(maxDelta) === "neutral",
    };
  }, [comparison, lap, axis]);
  if (!lap || !reference || !comparison || !plot)
    return (
      <div className="delta-empty">
        Set or import a reference for this source track to compare time along
        the lap.
      </div>
    );
  const delta = comparison.atTime(time);
  const cursorFraction = viewportFraction(progress * plot.max, viewport);
  const cursorInside = cursorFraction >= 0 && cursorFraction <= 1;
  const seekPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };
  const label = isTimingReference(reference)
    ? reference.label
    : (reference.vehicle?.name ?? reference.vehicleId);
  return (
    <div className="delta-analysis">
      <div className="delta-readout">
        <div>
          <span>Time delta at cursor</span>
          <strong className={comparisonTone(delta)} data-testid="cursor-delta">
            {signed(delta)} s
          </strong>
        </div>
        <div className="delta-legend">
          <span className="positive">− Faster</span>
          <span className="negative">+ Slower</span>
        </div>
      </div>
      <div className="delta-chart">
        <div className="delta-y-ticks">
          <span>{signed(plot.bound, 2)}</span>
          <span>0 s</span>
          <span>{signed(-plot.bound, 2)}</span>
        </div>
        <div className="delta-plot">
          <svg
            role="img"
            aria-label="Time difference to reference along the lap"
            viewBox={`${viewport.x} 0 ${viewport.width} 200`}
            preserveAspectRatio="none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              seekPointer(e);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seekPointer(e);
            }}
          >
            <defs>
              <clipPath id={`${id}-slower`}>
                <rect x="0" y="0" width="1000" height="100" />
              </clipPath>
              <clipPath id={`${id}-faster`}>
                <rect x="0" y="100" width="1000" height="100" />
              </clipPath>
            </defs>
            {Array.from({ length: 6 }, (_, i) => (
              <line
                key={i}
                x1={viewport.x + (i * viewport.width) / 5}
                x2={viewport.x + (i * viewport.width) / 5}
                y1="0"
                y2="200"
                stroke="#e8edf3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {[10, 55, 145, 190].map((y) => (
              <line
                key={y}
                x1="0"
                x2="1000"
                y1={y}
                y2={y}
                stroke="#edf1f6"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1="0"
              x2="1000"
              y1="100"
              y2="100"
              stroke="#8d9fb6"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {lap.sectors.slice(0, -1).map((s) => {
              const x =
                ((axis === "distance" ? s.endDistance : s.split) / plot.max) *
                1000;
              return (
                <line
                  key={s.id}
                  x1={x}
                  x2={x}
                  y1="0"
                  y2="200"
                  stroke="#a3b4c9"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            <path
              d={plot.path}
              fill="none"
              stroke={plot.neutral ? "#526379" : "#f3424e"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${id}-slower)`}
            />
            <path
              d={plot.path}
              fill="none"
              stroke={plot.neutral ? "#526379" : "#079e71"}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${id}-faster)`}
            />
            {cursorInside && (
              <g data-testid="delta-cursor">
                <line
                  x1={progress * 1000}
                  x2={progress * 1000}
                  y1="0"
                  y2="200"
                  stroke="#15365a"
                  vectorEffect="non-scaling-stroke"
                />
                <ellipse
                  cx={progress * 1000}
                  cy={100 - (delta / plot.bound) * 90}
                  rx={(3 * viewport.width) / 1000}
                  ry="3"
                  fill="#15365a"
                />
              </g>
            )}
          </svg>
          <div className="delta-x-ticks">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>
                {(
                  viewport.start +
                  ((viewport.end - viewport.start) * i) / 5
                ).toFixed(
                  axis === "time" && viewport.sectorId !== null ? 1 : 0,
                )}
              </span>
            ))}
          </div>
          <span className="axis-label">
            {viewport.sectorId !== null ? `Sector ${viewport.sectorId} · ` : ""}
            {axis === "distance" ? "Distance (m)" : "Time (s)"} · click or drag
            to inspect
          </span>
        </div>
      </div>
      <div className="delta-caption" title={label}>
        Compared with {label} · same source-track position
      </div>
    </div>
  );
}
