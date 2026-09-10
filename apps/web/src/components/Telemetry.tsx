import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { Pause, Play, SkipBack, Volume2, VolumeX, Repeat2 } from "lucide-react";
import {
  isTimingReference,
  type Lap,
  type Reference,
} from "../../../../packages/shared/schema";
import { TimeDeltaPlot } from "./TimeDeltaPlot";
import { CursorInspector } from "./CursorInspector";
import { ChannelPlot } from "./ChannelPlot";
import { LoadExtrema } from "./LoadExtrema";
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
  referenceChannelKeys,
  telemetryChannels,
  telemetryPath,
  type TelemetryGroup,
} from "../telemetryPlot";
import "./telemetry-comparison.css";
import "./plot-range.css";
import "./load-graphs.css";
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
    [groupPreference, setGroupPreference] =
      useState<TelemetryGroup>("overview"),
    [showReference, setShowReference] = useState(false);
  const group =
    groupPreference === "loads" && !lap?.verticalDynamics
      ? "overview"
      : groupPreference;
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
  const sectorLoops = useMemo(
    () =>
      lap?.sectors.map((sector) => ({
        id: sector.id,
        start: interpolate(lap.samples, sector.startDistance, "distance").time,
        end: interpolate(lap.samples, sector.endDistance, "distance").time,
      })) ?? [],
    [lap],
  );
  const activeLoopSector = sectorLoops.find(
    (sector) =>
      sector.start === playback.loopRange?.start &&
      sector.end === playback.loopRange?.end,
  );
  const loopLabel = playback.loopRange
    ? activeLoopSector
      ? `Sector ${activeLoopSector.id}`
      : "Selected interval"
    : null;
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
  const referenceKeys = useMemo(
    () =>
      referenceChannelKeys(
        comparison?.reference ?? null,
        referenceSamples,
        group,
      ),
    [comparison, referenceSamples, group],
  );
  const displayable = useMemo(
    () =>
      !!comparison &&
      (group === "overview"
        ? canPlotTelemetry(referenceSamples)
        : referenceKeys.length > 0),
    [comparison, referenceSamples, referenceKeys, group],
  );
  const activeComparison = showReference && displayable ? comparison : null;
  const overlay = activeComparison !== null;
  const referenceSample = activeComparison?.atTime(playback.time) ?? null;
  const channels = useMemo(
    () =>
      telemetryChannels(
        lap?.samples ?? [],
        group,
        overlay
          ? { samples: referenceSamples, keys: referenceKeys }
          : undefined,
      ),
    [lap, overlay, referenceSamples, referenceKeys, group],
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
            referenceKeys.includes(channel.key)
              ? telemetryPath(
                  activeComparison.points,
                  channel,
                  row,
                  axis,
                  extent,
                )
              : null,
          )
        : [],
    };
  }, [lap, axis, channels, currentPoints, activeComparison, referenceKeys]);
  const missingReference = channels
    .filter((channel) => !referenceKeys.includes(channel.key))
    .map((channel) => channel.label);
  const referenceReason = !reference
    ? "No reference selected"
    : isTimingReference(reference)
      ? "Timing-only reference · no channels"
      : !comparison
        ? "Reference source does not match"
        : !displayable
          ? "Reference values exceed the display range"
          : missingReference.length
            ? `Reference unavailable: ${missingReference.join(", ")}`
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
      loopLabel={loopLabel}
      loopSelected={activeLoopSector?.id === viewport.sectorId}
      onSelect={(sectorId) => {
        if (lap) setRangeSelection({ lap, sectorId });
      }}
      onInspectStart={() => {
        clock.play(false);
        seekPlot(0);
      }}
      onLoopSector={() => {
        const selected = sectorLoops.find(
          (sector) => sector.id === viewport.sectorId,
        );
        if (selected) {
          if (activeLoopSector?.id === selected.id) clock.loop(true);
          else clock.focusLoop(selected.start, selected.end);
        }
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
              <label className="graph-channel-choice">
                Graph channels
                <select
                  value={group}
                  onChange={(event) =>
                    setGroupPreference(event.target.value as TelemetryGroup)
                  }
                >
                  <option value="overview">Overview</option>
                  <option value="loads" disabled={!lap?.verticalDynamics}>
                    Loads &amp; elevation
                  </option>
                </select>
              </label>
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
            {group === "loads" && (
              <p className="load-graph-note">
                Vertical G is road-normal acceleration excluding gravity. Tyre
                load includes gravity, curvature and downforce; its dashed guide
                is 1× weight. Gradient is rise / 3D distance.
              </p>
            )}
            {lap && !lap.verticalDynamics && (
              <p className="load-graph-note">
                Vertical/load telemetry is unavailable for this lap.
              </p>
            )}
            {group === "loads" && (
              <LoadExtrema
                lap={lap}
                onInspect={(time) => {
                  clock.play(false);
                  setRangeSelection(null);
                  clock.seek(time);
                }}
              />
            )}
            <ChannelPlot
              group={group}
              lap={lap}
              channels={channels}
              sample={sample}
              referenceSample={referenceSample}
              viewport={viewport}
              overlay={overlay}
              paths={paths}
              axis={axis}
              onSeek={seekPlot}
              progress={progress}
              cursorInside={cursorInside}
            />
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
      {loopLabel && (
        <div className="playback-loop-status">
          <span id={`${tabsPrefix}-loop-status`} role="status">
            Playback loop: {loopLabel}
          </span>
          <button className="text-button" onClick={() => clock.loop(true)}>
            Full-lap loop
          </button>
          <span className="playback-loop-hint">
            Seek outside to restore full-lap looping.
          </span>
        </div>
      )}
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
          aria-describedby={loopLabel ? `${tabsPrefix}-loop-status` : undefined}
          title={loopLabel ? `Loop ${loopLabel}` : "Loop full lap"}
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
