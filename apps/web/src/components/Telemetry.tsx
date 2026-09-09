import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { Pause, Play, SkipBack, Volume2, VolumeX, Repeat2 } from "lucide-react";
import {
  isTimingReference,
  type Lap,
  type Reference,
} from "../../../../packages/shared/schema";
import { TimeDeltaPlot } from "./TimeDeltaPlot";
import { CursorInspector } from "./CursorInspector";
import { PlotRangeControls } from "./PlotRangeControls";
import {
  plotViewport,
  viewportFraction,
  viewportLapFraction,
} from "../plotViewport";
import { TabList } from "./TabList";
import { tabId, tabPanelProps } from "./tabs";
import {
  canPlotTelemetry,
  telemetryChannels,
  telemetryPath,
} from "../telemetryPlot";
import "./telemetry-comparison.css";
import "./plot-range.css";
import {
  formatTime,
  interpolate,
  prepareTelemetryComparison,
  type PlaybackClock,
} from "../../../../packages/telemetry";
export function Telemetry({
  lap,
  reference,
  clock,
  audio,
  onAudio,
}: {
  lap: Lap | null;
  reference: Reference | null;
  clock: PlaybackClock;
  audio: boolean;
  onAudio: () => void;
}) {
  const playback = useSyncExternalStore(clock.subscribe, clock.getSnapshot),
    [axis, setAxis] = useState<"distance" | "time">("distance"),
    [view, setView] = useState("Lap Graphs"),
    [showReference, setShowReference] = useState(false);
  const tabsPrefix = useId();
  const [rangeSelection, setRangeSelection] = useState<{
    lap: Lap;
    sectorId: number | null;
  } | null>(null);
  const sectorId =
    rangeSelection?.lap === lap ? (rangeSelection?.sectorId ?? null) : null;
  const viewport = useMemo(
    () => plotViewport(lap, axis, sectorId),
    [lap, axis, sectorId],
  );
  const sample = lap ? interpolate(lap.samples, playback.time) : null;
  const cursorFraction = viewportFraction(sample?.[axis] ?? 0, viewport);
  const cursorInside = cursorFraction >= 0 && cursorFraction <= 1;
  const comparison = useMemo(
    () => (lap ? prepareTelemetryComparison(lap, reference) : null),
    [lap, reference],
  );
  const referenceSamples = useMemo(
    () => comparison?.points.map((point) => point.sample) ?? [],
    [comparison],
  );
  const displayable = useMemo(
    () => !!comparison && canPlotTelemetry(referenceSamples),
    [comparison, referenceSamples],
  );
  const activeComparison = showReference && displayable ? comparison : null;
  const overlay = activeComparison !== null;
  const referenceSample = activeComparison?.atTime(playback.time) ?? null;
  const channels = useMemo(
    () =>
      telemetryChannels(
        overlay
          ? [...(lap?.samples ?? []), ...referenceSamples]
          : (lap?.samples ?? []),
      ),
    [lap, overlay, referenceSamples],
  );
  const currentPoints = useMemo(
    () =>
      lap?.samples.map((sample) => ({
        time: sample.time,
        distance: sample.distance,
        sample,
      })) ?? [],
    [lap],
  );
  const paths = useMemo(() => {
    if (!lap) return { current: [], reference: [] };
    const extent = axis === "distance" ? lap.length : lap.lapTime;
    return {
      current: channels.map((channel, row) =>
        telemetryPath(currentPoints, channel, row, axis, extent),
      ),
      reference: activeComparison
        ? channels.map((channel, row) =>
            telemetryPath(activeComparison.points, channel, row, axis, extent),
          )
        : [],
    };
  }, [lap, axis, channels, currentPoints, activeComparison]);
  const referenceReason = !reference
    ? "No reference selected"
    : isTimingReference(reference)
      ? "Timing-only reference · no channels"
      : !comparison
        ? "Reference source does not match"
        : !displayable
          ? "Reference values exceed the display range"
          : "Same source position · current-lap axes";
  const progress = lap
    ? axis === "distance"
      ? (sample?.distance ?? 0) / lap.length
      : playback.time / lap.lapTime
    : 0;
  const seek = (fraction: number) => {
    if (!lap) return;
    clock.seek(
      axis === "time"
        ? fraction * lap.lapTime
        : interpolate(lap.samples, fraction * lap.length, "distance").time,
    );
  };
  const seekPlot = (fraction: number) =>
    seek(viewportLapFraction(fraction, viewport));
  const rangeControls = (
    <PlotRangeControls
      lap={lap}
      sectorId={viewport.sectorId}
      outside={!cursorInside}
      onSelect={(sectorId) => {
        if (lap) setRangeSelection({ lap, sectorId });
      }}
      onInspectStart={() => {
        clock.play(false);
        seekPlot(0);
      }}
    />
  );
  return (
    <section className="panel telemetry-panel" aria-label="Telemetry graphs">
      <div className="panel-tabs">
        <h2>TELEMETRY GRAPHS</h2>
        <TabList
          label="Telemetry view"
          prefix={tabsPrefix}
          options={[
            "Lap Graphs",
            "Sector Analysis",
            "Time Delta",
            "Cursor Data",
          ]}
          value={view}
          onChange={setView}
          compact
        />
        <div className="segmented axis-toggle">
          <button
            className={axis === "distance" ? "active" : ""}
            aria-pressed={axis === "distance"}
            onClick={() => setAxis("distance")}
          >
            Distance
          </button>
          <button
            className={axis === "time" ? "active" : ""}
            aria-pressed={axis === "time"}
            onClick={() => setAxis("time")}
          >
            Time
          </button>
        </div>
      </div>
      <div {...tabPanelProps(tabsPrefix, 0, view === "Lap Graphs")}>
        {view === "Lap Graphs" && (
          <>
            <div className="plot-controls">
              {rangeControls}
              <div className="telemetry-comparison-controls">
                <label>
                  <input
                    type="checkbox"
                    checked={overlay}
                    disabled={!displayable}
                    onChange={(event) => setShowReference(event.target.checked)}
                    aria-describedby={`${tabsPrefix}-reference-mode`}
                  />
                  <span className="reference-trace-swatch" aria-hidden="true" />
                  Reference traces
                </label>
                <span id={`${tabsPrefix}-reference-mode`}>
                  {referenceReason}
                </span>
              </div>
            </div>
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
              <div className="plot">
                <div className="channel-sector-labels" aria-hidden="true">
                  {lap?.sectors
                    .filter(
                      (sector) =>
                        viewport.sectorId === null ||
                        sector.id === viewport.sectorId,
                    )
                    .map((sector) => (
                      <span
                        key={sector.id}
                        style={{
                          left: `${
                            viewportFraction(
                              axis === "distance"
                                ? (sector.startDistance + sector.endDistance) /
                                    2
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
                    seekPlot(
                      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                    );
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons === 1) {
                      const r = e.currentTarget.getBoundingClientRect();
                      seekPlot(
                        Math.max(
                          0,
                          Math.min(1, (e.clientX - r.left) / r.width),
                        ),
                      );
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
                            axis === "time" && viewport.sectorId !== null
                              ? 1
                              : 0,
                          )
                        : i * 1000}
                    </span>
                  ))}
                </div>
                <span className="axis-label">
                  {overlay ? "Current lap · " : ""}
                  {viewport.sectorId !== null
                    ? `Sector ${viewport.sectorId} · `
                    : ""}
                  {axis === "distance" ? "Distance (m)" : "Time (s)"} · click or
                  drag to inspect
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      <div {...tabPanelProps(tabsPrefix, 2, view === "Time Delta")}>
        {view === "Time Delta" && (
          <>
            {rangeControls}
            <TimeDeltaPlot
              lap={lap}
              reference={reference}
              axis={axis}
              time={playback.time}
              progress={progress}
              viewport={viewport}
              onSeek={seekPlot}
            />
          </>
        )}
      </div>
      <div
        className="sector-analysis-grid"
        {...tabPanelProps(tabsPrefix, 1, view === "Sector Analysis")}
      >
        {view === "Sector Analysis" &&
          lap?.sectors.map((s) => {
            const samples = lap.samples.filter(
              (p) =>
                p.distance >= s.startDistance && p.distance <= s.endDistance,
            );
            return (
              <div key={s.id}>
                <span>SECTOR {s.id}</span>
                <strong>{s.time.toFixed(3)} s</strong>
                <p>
                  {(((s.endDistance - s.startDistance) / s.time) * 3.6).toFixed(
                    1,
                  )}{" "}
                  km/h average
                </p>
                <p>
                  {(Math.max(...samples.map((p) => p.speed)) * 3.6).toFixed(1)}{" "}
                  km/h maximum
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    clock.play(false);
                    clock.seek(
                      interpolate(lap.samples, s.startDistance, "distance")
                        .time,
                    );
                    setRangeSelection({ lap, sectorId: s.id });
                    setView("Lap Graphs");
                    document.getElementById(tabId(tabsPrefix, 0))?.focus();
                  }}
                >
                  Inspect sector →
                </button>
              </div>
            );
          })}
      </div>
      <div
        className="cursor-panel"
        {...tabPanelProps(tabsPrefix, 3, view === "Cursor Data")}
      >
        {view === "Cursor Data" && (
          <CursorInspector
            key={axis}
            lap={lap}
            sample={sample}
            axis={axis}
            onSeek={(time) => {
              clock.play(false);
              clock.seek(time);
            }}
          />
        )}
      </div>
      <div className="playback">
        <button
          className="icon-button"
          disabled={!lap}
          aria-label="Restart lap"
          onClick={() => clock.seek(0)}
        >
          <SkipBack size={15} />
        </button>
        <button
          className="play-button"
          disabled={!lap}
          aria-label={playback.playing ? "Pause playback" : "Play playback"}
          onClick={() => clock.play(!playback.playing)}
        >
          {playback.playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
        <span className="play-time" data-testid="playback-time">
          {formatTime(playback.time)}
        </span>
        <input
          className="seek"
          aria-label="Lap playback position"
          aria-valuetext={
            sample
              ? `${sample.time.toFixed(3)} seconds, ${sample.distance.toFixed(3)} metres`
              : undefined
          }
          type="range"
          min={0}
          max={lap?.lapTime ?? 1}
          step={0.01}
          value={playback.time}
          disabled={!lap}
          onChange={(e) => clock.seek(Number(e.target.value))}
        />
        <span className="lap-duration">
          {lap ? formatTime(lap.lapTime) : "—"}
        </span>
        <select
          aria-label="Playback speed"
          value={playback.rate}
          onChange={(e) => clock.rate(Number(e.target.value))}
        >
          <option value={0.25}>0.25×</option>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={4}>4×</option>
        </select>
        <button
          className={`icon-button ${playback.loop ? "active" : ""}`}
          aria-label="Loop playback"
          aria-pressed={playback.loop}
          onClick={() => clock.loop(!playback.loop)}
        >
          <Repeat2 size={16} />
        </button>
        <button
          className={`icon-button ${audio ? "active" : ""}`}
          disabled={!lap}
          aria-label={audio ? "Mute audio" : "Enable engine audio"}
          onClick={onAudio}
        >
          {audio ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
    </section>
  );
}
