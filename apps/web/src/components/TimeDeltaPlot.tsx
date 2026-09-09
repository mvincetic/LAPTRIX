import { useId, useMemo } from "react";
import {
  isTimingReference,
  type Lap,
  type Reference,
} from "../../../../packages/shared/schema";
import { prepareTimeComparison, signed } from "../../../../packages/telemetry";

export function TimeDeltaPlot({
  lap,
  reference,
  axis,
  time,
  progress,
  onSeek,
}: {
  lap: Lap | null;
  reference: Reference | null;
  axis: "distance" | "time";
  time: number;
  progress: number;
  onSeek: (fraction: number) => void;
}) {
  const id = useId();
  const comparison = useMemo(
    () => (lap ? prepareTimeComparison(lap, reference) : null),
    [lap, reference],
  );
  const plot = useMemo(() => {
    if (!comparison || !lap) return null;
    const bound =
      Math.max(0.1, ...comparison.samples.map((s) => Math.abs(s.delta))) * 1.1;
    const max = axis === "distance" ? lap.length : lap.lapTime;
    const path = comparison.samples
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${((s[axis] / max) * 1000).toFixed(3)},${(100 - (s.delta / bound) * 90).toFixed(3)}`,
      )
      .join(" ");
    return { bound, max, path };
  }, [comparison, lap, axis]);
  if (!lap || !reference || !comparison || !plot)
    return (
      <div className="delta-empty">
        Set or import a reference for this source track to compare time along
        the lap.
      </div>
    );
  const delta = comparison.atTime(time);
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
          <strong
            className={delta <= 0 ? "positive" : "negative"}
            data-testid="cursor-delta"
          >
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
            viewBox="0 0 1000 200"
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
                x1={i * 200}
                x2={i * 200}
                y1="0"
                y2="200"
                stroke="#e8edf3"
              />
            ))}
            {[10, 55, 145, 190].map((y) => (
              <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#edf1f6" />
            ))}
            <line
              x1="0"
              x2="1000"
              y1="100"
              y2="100"
              stroke="#8d9fb6"
              strokeDasharray="4 4"
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
                />
              );
            })}
            <path
              d={plot.path}
              fill="none"
              stroke="#f3424e"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${id}-slower)`}
            />
            <path
              d={plot.path}
              fill="none"
              stroke="#079e71"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${id}-faster)`}
            />
            <line
              x1={progress * 1000}
              x2={progress * 1000}
              y1="0"
              y2="200"
              stroke="#15365a"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={progress * 1000}
              cy={100 - (delta / plot.bound) * 90}
              r="3"
              fill="#15365a"
            />
          </svg>
          <div className="delta-x-ticks">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{((plot.max * i) / 5).toFixed(0)}</span>
            ))}
          </div>
          <span className="axis-label">
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
