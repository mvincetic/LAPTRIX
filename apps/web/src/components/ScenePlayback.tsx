import { useSyncExternalStore } from "react";
import { Pause, Play, Repeat2 } from "lucide-react";
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
}: {
  lap: Lap | null;
  clock: PlaybackClock;
  calculating: boolean;
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
