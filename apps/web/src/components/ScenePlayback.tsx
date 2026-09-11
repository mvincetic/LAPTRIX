import { useSyncExternalStore } from "react";
import type { Lap } from "../../../../packages/shared/schema";
import {
  formatTime,
  interpolate,
  type PlaybackClock,
} from "../../../../packages/telemetry";

/** A readout of the current lap; subscribing here keeps the scene off UI clock renders. */
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
      <span className="scene-playback-state" data-playing={playback.playing}>
        <span className="scene-playback-state-label">
          <i aria-hidden="true" />
          {state}
        </span>
        {lap && (
          <span className="scene-playback-rate">{playback.rate}× playback</span>
        )}
      </span>
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
    </div>
  );
}
