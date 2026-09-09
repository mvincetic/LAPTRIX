import { useId, useState } from "react";
import type { Lap, Sample } from "../../../../packages/shared/schema";
import { formatTime, interpolate } from "../../../../packages/telemetry";
import "./cursor-inspector.css";

const channels: {
  key: keyof Sample;
  label: string;
  unit: string;
  digits: number;
  scale?: number;
}[] = [
  { key: "speed", label: "Speed", unit: "km/h", digits: 2, scale: 3.6 },
  { key: "throttle", label: "Throttle", unit: "%", digits: 1, scale: 100 },
  { key: "brake", label: "Brake", unit: "%", digits: 1, scale: 100 },
  { key: "rpm", label: "Engine", unit: "rpm", digits: 0 },
  { key: "gear", label: "Gear", unit: "", digits: 0 },
  { key: "longitudinalG", label: "Longitudinal G", unit: "G", digits: 3 },
  { key: "lateralG", label: "Lateral G", unit: "G", digits: 3 },
  {
    key: "steering",
    label: "Road-wheel angle",
    unit: "°",
    digits: 2,
    scale: 180 / Math.PI,
  },
  { key: "y", label: "Elevation", unit: "m", digits: 2 },
  {
    key: "trackGradient",
    label: "Track gradient",
    unit: "%",
    digits: 2,
    scale: 100,
  },
  { key: "offset", label: "Line offset", unit: "m", digits: 3 },
  { key: "x", label: "East position", unit: "m", digits: 2 },
  { key: "z", label: "South position", unit: "m", digits: 2 },
  { key: "sectorId", label: "Sector", unit: "", digits: 0 },
  { key: "cornerId", label: "Detected corner", unit: "", digits: 0 },
];

export function CursorInspector({
  lap,
  sample,
  axis,
  onSeek,
}: {
  lap: Lap | null;
  sample: Sample | null;
  axis: "time" | "distance";
  onSeek: (time: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<{
    lap: Lap;
    value: string;
  } | null>(null);
  if (!lap || !sample)
    return (
      <div className="delta-empty">
        Run a simulation to inspect cursor data.
      </div>
    );
  const limit = axis === "time" ? lap.lapTime : lap.length;
  const editing = draft?.lap === lap;
  const value = editing
    ? draft.value
    : String(Math.min(limit, Number(sample[axis].toFixed(3))));
  return (
    <div className="cursor-inspector">
      <form
        className="cursor-position"
        onSubmit={(event) => {
          event.preventDefault();
          const at = editing ? Number(value) : sample[axis];
          if (!value.trim() || !Number.isFinite(at) || at < 0 || at > limit)
            return;
          onSeek(
            axis === "time"
              ? at
              : interpolate(lap.samples, at, "distance").time,
          );
          setDraft(null);
        }}
      >
        <label htmlFor={id}>
          Inspect at {axis === "time" ? "time (s)" : "distance (m)"}
        </label>
        <input
          id={id}
          type="number"
          min={0}
          max={limit}
          step="any"
          required
          value={value}
          aria-describedby={`${id}-help`}
          onChange={(event) => setDraft({ lap, value: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(null);
            }
          }}
        />
        <button type="submit">Inspect</button>
        <span id={`${id}-help`}>
          Enter to pause and seek · Esc restores the cursor value
        </span>
      </form>
      <div className="cursor-location">
        <strong>{formatTime(sample.time)}</strong>
        <span>{sample.distance.toFixed(3)} m along the solved line</span>
      </div>
      <dl className="cursor-values" aria-label="Telemetry at cursor">
        {channels.map((channel) => {
          const value = sample[channel.key] * (channel.scale ?? 1);
          return (
            <div key={channel.key}>
              <dt>{channel.label}</dt>
              <dd data-testid={`cursor-${channel.key}`}>
                {channel.key === "cornerId" && value === 0
                  ? "None"
                  : Number(value.toFixed(channel.digits)).toFixed(
                      channel.digits,
                    )}
                {channel.unit && <small>{channel.unit}</small>}
              </dd>
            </div>
          );
        })}
        <div>
          <dt>Vertical dynamics</dt>
          <dd className="cursor-unavailable">Not modelled</dd>
        </div>
      </dl>
      <p className="cursor-note">
        Calculated telemetry. Continuous values interpolate between samples;
        gear, sector and corner step at sample boundaries. Display precision is
        not model accuracy.
      </p>
    </div>
  );
}
