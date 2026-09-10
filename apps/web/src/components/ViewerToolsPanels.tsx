import { ChevronDown, ChevronUp, Eye, Layers } from "lucide-react";
import type { CameraMode, ViewLayers } from "./TrackView";
import { tabPanelProps } from "./tabs";

export function ViewerToolsPanels({
  prefix,
  active,
  layers,
  onLayers,
  ghost,
  onGhost,
  referenceGhost,
  onReferenceGhost,
  referenceName,
  referenceReason,
  mode,
  onMode,
  legendOpen,
  onLegendChange,
}: {
  prefix: string;
  active: number;
  layers: ViewLayers;
  onLayers: (value: ViewLayers) => void;
  ghost: boolean;
  onGhost: (value: boolean) => void;
  referenceGhost: boolean;
  onReferenceGhost: (value: boolean) => void;
  referenceName: string | null;
  referenceReason: string;
  mode: CameraMode;
  onMode: (value: CameraMode) => void;
  legendOpen: boolean;
  onLegendChange: (value: boolean) => void;
}) {
  return (
    <>
      <div
        {...tabPanelProps(prefix, 0, active === 0)}
        className={`legend${mode === "chase" ? " chase-legend" : ""}`}
      >
        <button
          className="legend-toggle"
          aria-expanded={legendOpen}
          aria-controls={`${prefix}-track-key`}
          onClick={() => onLegendChange(!legendOpen)}
        >
          Track key{" "}
          {legendOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <div
          id={`${prefix}-track-key`}
          className="legend-items"
          hidden={!legendOpen}
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
          <Eye size={14} /> Telemetry ghosts
        </h3>
        <label>
          <input
            type="checkbox"
            checked={ghost}
            onChange={(e) => onGhost(e.target.checked)}
          />
          Show current ghost
        </label>
        <label>
          <input
            type="checkbox"
            checked={referenceGhost}
            disabled={!referenceName}
            onChange={(e) => onReferenceGhost(e.target.checked)}
          />
          Show reference ghost
        </label>
        <p>
          {referenceName ? `Reference · ${referenceName}` : referenceReason}
        </p>
        <p>
          {referenceName
            ? "Both start together. Current-lap playback sets the duration; a finished reference stays at the line."
            : "Playback follows the current calculated lap. Use the transport below to play or seek."}
        </p>
        <span className="tiny muted">
          Blue current · grey reference · vehicles shown at 3× scale.
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
