import { useSyncExternalStore } from "react";
import { Crosshair, Pause, Play, Repeat2, SkipBack } from "lucide-react";
import type { Lap } from "../../../../packages/shared/schema";
import {
  formatTime,
  interpolate,
  type PlaybackClock,
} from "../../../../packages/telemetry";

/** Viewer transport shares the existing clock without rerendering scene geometry. */
export function ScenePlayback({
  lap,
  clock,
  calculating,
  vehicleName,
  referenceName,
  currentVisible,
  onFollow,
}: {
  lap: Lap | null;
  clock: PlaybackClock;
  calculating: boolean;
  vehicleName?: string;
  referenceName?: string;
  currentVisible: boolean;
  onFollow: () => void;
}) {
  const playback = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const sample = lap ? interpolate(lap.samples, playback.time) : null;
  const state = !lap
    ? calculating
      ? "Calculating"
      : "Ready to simulate"
    : playback.playing
      ? "Playing"
      : playback.time >= lap.lapTime
        ? "Lap complete"
        : playback.time === 0
          ? "Ready"
          : "Paused";
  return (
    <div
      className="scene-footer scene-playback"
      role="group"
      aria-label="Current lap playback"
      aria-live="off"
    >
      <div className="scene-identity">
        <div className="scene-identity-names" aria-label="Vehicles in playback">
          <span className="scene-identity-entry" title={vehicleName}>
            <i aria-hidden="true" />
            <span>Current{!currentVisible ? " · hidden" : ""}</span>
            <strong>{vehicleName ?? "No calculated lap"}</strong>
          </span>
          {referenceName && (
            <span
              className="scene-identity-entry reference"
              title={referenceName}
            >
              <i aria-hidden="true" />
              <span>Reference</span>
              <strong>{referenceName}</strong>
            </span>
          )}
        </div>
        <div className="scene-identity-actions">
          <button
            className="icon-button"
            disabled={!lap}
            onClick={onFollow}
            aria-label="Follow current car"
            title="Show and follow current car"
          >
            <Crosshair size={15} />
          </button>
          <button
            className="icon-button"
            disabled={!lap}
            onClick={() => clock.seek(0)}
            aria-label="Restart viewer lap"
            title="Restart lap"
          >
            <SkipBack size={14} />
          </button>
          <select
            aria-label="Viewer playback rate"
            value={playback.rate}
            onChange={(event) => clock.rate(Number(event.target.value))}
          >
            {[0.25, 0.5, 1, 2, 4].map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="scene-transport-actions">
        <button
          className="scene-play-button"
          disabled={!lap}
          aria-label={playback.playing ? "Pause viewer lap" : "Play viewer lap"}
          title={playback.playing ? "Pause lap" : "Play lap"}
          onClick={() => clock.play(!playback.playing)}
        >
          {playback.playing ? (
            <Pause size={15} />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </button>
        <button
          className={`scene-loop-button${playback.loop ? " active" : ""}`}
          disabled={!lap}
          aria-label="Loop viewer playback"
          aria-pressed={playback.loop}
          title={
            playback.loopRange
              ? "Toggle interval looping"
              : "Toggle full-lap looping"
          }
          onClick={() => clock.loop(!playback.loop)}
        >
          <Repeat2 size={15} />
        </button>
        <span className="scene-playback-state" data-playing={playback.playing}>
          <span className="scene-playback-state-label">
            <i aria-hidden="true" />
            {state}
          </span>
          {lap && (
            <span className="scene-playback-rate">
              {playback.rate}× playback
            </span>
          )}
        </span>
      </div>
      <label className="scene-scrub">
        <span>Lap position</span>
        <input
          className="seek scene-seek"
          type="range"
          aria-label="Viewer lap position"
          aria-valuetext={
            sample
              ? `${sample.time.toFixed(3)} seconds, ${sample.distance.toFixed(3)} metres`
              : undefined
          }
          min={0}
          max={lap?.lapTime ?? 1}
          step={0.01}
          value={playback.time}
          disabled={!lap}
          onChange={(event) => clock.seek(Number(event.target.value))}
        />
      </label>
      <dl className="scene-playback-values">
        <div>
          <dt>Speed</dt>
          <dd data-testid="scene-speed">
            {sample ? Math.round(sample.speed * 3.6) : "—"}
            <small> km/h</small>
          </dd>
        </div>
        <div>
          <dt>Gear</dt>
          <dd data-testid="scene-gear">{sample?.gear ?? "—"}</dd>
        </div>
        <div className="scene-playback-time">
          <dt>Elapsed / lap</dt>
          <dd>
            <span data-testid="scene-time">
              {lap ? formatTime(playback.time) : "—"}
            </span>
            <small> / {lap ? formatTime(lap.lapTime) : "—"}</small>
          </dd>
        </div>
      </dl>
      {playback.loopRange && (
        <span className="scene-loop-summary">
          Interval loop · {formatTime(playback.loopRange.start)}–
          {formatTime(playback.loopRange.end)}
        </span>
      )}
    </div>
  );
}
