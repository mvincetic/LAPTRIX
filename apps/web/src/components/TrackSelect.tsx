import { useId } from "react";
import type { Track } from "../../../../packages/shared/schema";

const categories = [
  "Development Tracks",
  "Real Circuits",
  "Imported Tracks",
] as const;

export function TrackSelect({
  tracks,
  track,
  imported,
  disabled,
  onSelect,
}: {
  tracks: Track[];
  track: Track | null;
  imported: ReadonlySet<string>;
  disabled: boolean;
  onSelect: (track: Track) => void;
}) {
  const description = useId();
  // Import origin takes precedence over a file's self-declared synthetic flag.
  const category = (item: Track) =>
    imported.has(item.id) ? 2 : item.synthetic ? 0 : 1;
  const status = track
    ? ["Development", "Real · approximate", "Imported · unverified"][
        category(track)
      ]
    : "";
  return (
    <label className="topbar-field track-field">
      <span className="track-selector-label">
        <span>Track</span>
        <span
          className="track-category"
          id={description}
          title={track ? `${track.country} · ${track.provenance}` : undefined}
        >
          {status}
        </span>
      </span>
      <select
        aria-label="Track"
        aria-describedby={description}
        disabled={disabled}
        value={track?.id ?? ""}
        onChange={(e) => {
          const next = tracks.find((item) => item.id === e.target.value);
          if (next) onSelect(next);
        }}
      >
        {categories.map((label, index) => {
          const options = tracks.filter((item) => category(item) === index);
          return options.length ? (
            <optgroup key={label} label={label}>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
    </label>
  );
}
