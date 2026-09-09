import type { Lap, Sample } from "../../../../packages/shared/schema";
import { viewportFraction, type PlotViewport } from "../plotViewport";
import { channelFraction, type Channel } from "../telemetryPlot";
import { ChannelScales } from "./ChannelScales";
import "./channel-scales.css";

export function ChannelPlot({
  lap,
  channels,
  sample,
  referenceSample,
  viewport,
  overlay,
  paths,
  axis,
  onSeek,
  progress,
  cursorInside,
}: {
  lap: Lap | null;
  channels: Channel[];
  sample: Sample | null;
  referenceSample: Sample | null;
  viewport: PlotViewport;
  overlay: boolean;
  paths: { current: string[]; reference: string[] };
  axis: "time" | "distance";
  onSeek: (fraction: number) => void;
  progress: number;
  cursorInside: boolean;
}) {
  return (
    <div className="graph-area">
      <div className="channel-labels">
        {channels.map((c) => (
          <div key={c.key}>
            <span>
              {c.label}
              <small>{c.unit ? `(${c.unit})` : ""}</small>
            </span>
            <span className="channel-values">
              <b style={{ color: c.color }}>
                {sample
                  ? (sample[c.key] * (c.scale ?? 1)).toFixed(
                      c.key === "lateralG" ? 1 : 0,
                    )
                  : "—"}
              </b>
              {referenceSample && (
                <small
                  data-testid={`reference-value-${c.key}`}
                  aria-label={`Reference ${c.label}`}
                >
                  R{" "}
                  {(referenceSample[c.key] * (c.scale ?? 1)).toFixed(
                    c.key === "lateralG" ? 1 : 0,
                  )}
                </small>
              )}
            </span>
          </div>
        ))}
      </div>
      <ChannelScales channels={channels} />
      <div className="plot">
        <div className="channel-sector-labels" aria-hidden="true">
          {lap?.sectors
            .filter(
              (sector) =>
                viewport.sectorId === null || sector.id === viewport.sectorId,
            )
            .map((sector) => (
              <span
                key={sector.id}
                style={{
                  left: `${
                    viewportFraction(
                      axis === "distance"
                        ? (sector.startDistance + sector.endDistance) / 2
                        : sector.split - sector.time / 2,
                      viewport,
                    ) * 100
                  }%`,
                }}
              >
                S{sector.id}
              </span>
            ))}
        </div>
        <svg
          role="img"
          aria-label={`Synchronized speed, throttle, brake, RPM, gear, lateral G and elevation traces${overlay ? " with source-aligned native reference" : ""}`}
          viewBox={`${viewport.x} 0 ${viewport.width} 251`}
          preserveAspectRatio="none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) {
              const r = e.currentTarget.getBoundingClientRect();
              onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
            }
          }}
        >
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`x${i}`}
              x1={viewport.x + (i * viewport.width) / 10}
              y1={0}
              x2={viewport.x + (i * viewport.width) / 10}
              y2={231}
              stroke="#e8edf3"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {channels.map((c, i) => (
            <g key={c.key}>
              {[3, 27].map((y) => (
                <line
                  key={y}
                  x1={0}
                  x2={1000}
                  y1={i * 33 + y}
                  y2={i * 33 + y}
                  stroke="#e9eff5"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {c.min < 0 && c.max > 0 && (
                <line
                  data-testid={`channel-zero-${c.key}`}
                  x1={0}
                  x2={1000}
                  y1={i * 33 + 27 - channelFraction(0, c) * 24}
                  y2={i * 33 + 27 - channelFraction(0, c) * 24}
                  stroke="#8d9fb6"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <line
                x1={0}
                y1={i * 33 + 31}
                x2={1000}
                y2={i * 33 + 31}
                stroke="#dce3eb"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                data-testid={`current-trace-${c.key}`}
                d={paths.current[i]}
                fill="none"
                stroke={c.color}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              {overlay && (
                <path
                  data-testid={`reference-trace-${c.key}`}
                  d={paths.reference[i]}
                  fill="none"
                  stroke="#687a91"
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          ))}
          {lap?.sectors.slice(0, -1).map((s) => {
            const p =
              (axis === "distance"
                ? s.endDistance / lap.length
                : s.split / lap.lapTime) * 1000;
            return (
              <line
                key={s.id}
                x1={p}
                x2={p}
                y1={0}
                y2={231}
                stroke="#a3b4c9"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {cursorInside && (
            <g data-testid="channel-cursor">
              <line
                x1={progress * 1000}
                x2={progress * 1000}
                y1={0}
                y2={231}
                stroke="#15365a"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={`M${progress * 1000 - (4 * viewport.width) / 1000},0 h${(8 * viewport.width) / 1000} l${(-4 * viewport.width) / 1000},6 z`}
                fill="#15365a"
              />
            </g>
          )}
        </svg>
        <div className="channel-x-ticks">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ left: `${i * 20}%` }}>
              {lap
                ? (
                    viewport.start +
                    ((viewport.end - viewport.start) * i) / 5
                  ).toFixed(
                    axis === "time" && viewport.sectorId !== null ? 1 : 0,
                  )
                : i * 1000}
            </span>
          ))}
        </div>
        <span className="axis-label">
          {overlay ? "Current lap · " : ""}
          {viewport.sectorId !== null ? `Sector ${viewport.sectorId} · ` : ""}
          {axis === "distance" ? "Distance (m)" : "Time (s)"} · click or drag to
          inspect
        </span>
      </div>
    </div>
  );
}
