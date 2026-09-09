import { Eye, Layers } from "lucide-react";
import type { CameraMode, ViewLayers } from "./TrackView";
import { tabPanelProps } from "./tabs";

export function ViewerToolsPanels({
  prefix,
  active,
  layers,
  onLayers,
  ghost,
  onGhost,
  mode,
  onMode,
}: {
  prefix: string;
  active: number;
  layers: ViewLayers;
  onLayers: (value: ViewLayers) => void;
  ghost: boolean;
  onGhost: (value: boolean) => void;
  mode: CameraMode;
  onMode: (value: CameraMode) => void;
}) {
  return (
    <>
      <div
        {...tabPanelProps(prefix, 0, active === 0)}
        className={`legend${mode === "chase" ? " chase-legend" : ""}`}
      >
        <span>
          <i className="line-key blue" />
          Racing line
        </span>
        <span>
          <i className="line-key red" />
          Braking zone
        </span>
        <span>
          <i className="dot-key" />
          Apex point
        </span>
        <span>
          <i className="number-key">1</i>Corner number
        </span>
      </div>
      <div
        {...tabPanelProps(prefix, 1, active === 1)}
        className="viewer-popover"
      >
        <h3>
          <Layers size={14} /> Analysis layers
        </h3>
        {Object.entries(layers).map(([key, value]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={() => onLayers({ ...layers, [key]: !value })}
            />
            {
              (
                {
                  racingLine: "Racing line",
                  braking: "Braking zones",
                  apex: "Apex points",
                  corners: "Corner numbers",
                  sectors: "Sector labels",
                  centerline: "Centerline debug",
                  boundaries: "Track boundaries",
                  terrain: "Terrain & trees",
                } as Record<string, string>
              )[key]
            }
          </label>
        ))}
      </div>
      <div
        {...tabPanelProps(prefix, 2, active === 2)}
        className="viewer-popover"
      >
        <h3>
          <Eye size={14} /> Telemetry ghost
        </h3>
        <label>
          <input
            type="checkbox"
            checked={ghost}
            onChange={(e) => onGhost(e.target.checked)}
          />
          Show ghost vehicle
        </label>
        <p>
          Playback follows the calculated lap. Use the transport below to play
          or seek.
        </p>
        <span className="tiny muted">
          Vehicle shown at 3× scale for visibility.
        </span>
      </div>
      <div
        {...tabPanelProps(prefix, 3, active === 3)}
        className="viewer-popover"
      >
        <h3>Camera mode</h3>
        {(["orbit", "top", "chase"] as CameraMode[]).map((m) => (
          <button
            className={`option-button ${mode === m ? "active" : ""}`}
            key={m}
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
          >
            {
              {
                orbit: "Orbit · perspective",
                top: "Top · engineering",
                chase: "Chase · telemetry",
              }[m]
            }
          </button>
        ))}
      </div>
    </>
  );
}
