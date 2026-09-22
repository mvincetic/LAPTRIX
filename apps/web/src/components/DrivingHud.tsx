import { useMemo, useSyncExternalStore } from "react";
import type { Lap, Reference, Track } from "../../../../packages/shared/schema";
import {
  comparisonTone,
  formatTime,
  interpolate,
  prepareTimeComparison,
  signed,
  type PlaybackClock,
} from "../../../../packages/telemetry";
import { drivingMap, drivingSectors } from "../driving-hud";
import "./driving-hud.css";

/** Only this overlay subscribes to cursor updates; the 3D scene stays isolated. */
export function DrivingHud({
  track,
  lap,
  reference,
  clock,
}: {
  track: Track;
  lap: Lap;
  reference: Reference | null;
  clock: PlaybackClock;
}) {
  const playback = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const map = useMemo(() => drivingMap(track, lap), [track, lap]);
  const comparison = useMemo(
    () => prepareTimeComparison(lap, reference),
    [lap, reference],
  );
  const sample = interpolate(lap.samples, playback.time);
  const position = map.project(sample);
  const sectors = drivingSectors(lap, playback.time);
  const delta = comparison?.atTime(playback.time) ?? null;
  return (
    <div
      className="driving-hud"
      role="group"
      aria-label="Driving telemetry"
      aria-live="off"
    >
      <div className="driving-hud-left">
        <div className="driving-map hud-card">
          <div className="hud-heading">
            <span>TRACK POSITION</span>
            <span>N ↑</span>
          </div>
          <svg
            viewBox="0 0 180 120"
            role="img"
            aria-label={`Full circuit map · ${track.name} · current vehicle position`}
          >
            <path d={map.path} className="driving-map-edge" />
            <path d={map.path} className="driving-map-line" />
            <rect
              x={map.start.x - 3}
              y={map.start.y - 3}
              width={6}
              height={6}
              className="driving-map-start"
            >
              <title>Start / finish</title>
            </rect>
            <circle
              cx={position.x}
              cy={position.y}
              r={5}
              className="driving-map-car"
              data-testid="driving-map-car"
            >
              <title>Current car</title>
            </circle>
          </svg>
        </div>
        <div className="driving-instruments hud-card">
          <div className="driving-speed">
            <strong data-testid="hud-speed">
              {Math.round(sample.speed * 3.6)}
            </strong>
            <span>km/h</span>
          </div>
          <div className="driving-gear">
            <span>GEAR</span>
            <strong data-testid="hud-gear">{sample.gear}</strong>
          </div>
          <div className="driving-rpm">
            <span>RPM</span>
            <strong data-testid="hud-rpm">
              {Math.round(sample.rpm).toLocaleString("en-US")}
            </strong>
          </div>
          <div className="driving-inputs">
            {(
              [
                ["Throttle", sample.throttle],
                ["Brake", sample.brake],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={`driving-input ${label.toLowerCase()}`}
              >
                <span>{label}</span>
                <meter
                  min={0}
                  max={1}
                  value={value}
                  aria-label={`Driving ${label.toLowerCase()}`}
                />
                <b>{Math.round(value * 100)}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="driving-timing hud-card">
        <div className="hud-heading">
          <span>
            {playback.time >= lap.lapTime
              ? "LAP COMPLETE"
              : playback.playing
                ? "LIVE LAP"
                : "LAP TIME"}
          </span>
          <strong data-testid="hud-time">{formatTime(playback.time)}</strong>
        </div>
        <ol aria-label="Live sector times">
          {sectors.map((sector) => (
            <li
              key={sector.id}
              data-state={sector.state}
              data-testid={`hud-sector-${sector.id}`}
            >
              <span>S{sector.id}</span>
              <small>
                {sector.state === "active"
                  ? "LIVE"
                  : sector.state === "complete"
                    ? "DONE"
                    : "NEXT"}
              </small>
              <strong>
                {sector.elapsed === null ? "—" : sector.elapsed.toFixed(3)}
              </strong>
            </li>
          ))}
        </ol>
        <div className="driving-delta" data-tone={comparisonTone(delta)}>
          <span>Δ reference</span>
          <strong data-testid="hud-delta">
            {delta === null ? "—" : `${signed(delta)} s`}
          </strong>
        </div>
      </div>
    </div>
  );
}
