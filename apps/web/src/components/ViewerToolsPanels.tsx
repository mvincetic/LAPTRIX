import { ChevronDown, ChevronUp, Eye } from "lucide-react";
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
  hasLap,
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
  hasLap: boolean;
  onMode: (value: CameraMode) => void;
  legendOpen: boolean;
  onLegendChange: (value: boolean) => void;
}) {
  const layer = (key: keyof ViewLayers, label: string) => (
    <label>
      <input
        type="checkbox"
        checked={layers[key]}
        onChange={(e) => onLayers({ ...layers, [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  return (
    <>
      <div
        {...tabPanelProps(prefix, 0, active === 0)}
        className={`legend${mode === "chase" || mode === "onboard" ? " chase-legend" : ""}`}
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
        <fieldset className="viewer-layer-group">
          <legend>Lap overlays</legend>
          {layer("racingLine", "Racing line")}
          {layer("braking", "Braking zones")}
          {layer("apex", "Apex points")}
          {layer("corners", "Corner numbers")}
          {layer("sectors", "Sector labels")}
          {(mode === "chase" || mode === "onboard") && (
            <p>Markers and labels appear in 3D and Top views.</p>
          )}
        </fieldset>
        <fieldset className="viewer-layer-group">
          <legend>Scene</legend>
          {layer("terrain", "Environment")}
          <p>Terrain, trees and barriers are schematic scenery.</p>
        </fieldset>
        <details className="viewer-source-layers">
          <summary>Source inspection</summary>
          {layer("centerline", "Source centerline")}
          {layer("boundaries", "Source road edges")}
          <p>Original geometry and road widths.</p>
        </details>
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
          Blue current · grey reference · vehicles use source metres; dots
          locate them in overview.
        </span>
      </div>
      <div
        {...tabPanelProps(prefix, 3, active === 3)}
        className="viewer-popover"
      >
        <h3>Camera mode</h3>
        {(["orbit", "top", "chase", "onboard"] as CameraMode[]).map((m) => (
          <button
            className={`option-button ${mode === m ? "active" : ""}`}
            key={m}
            aria-pressed={mode === m}
            disabled={!hasLap && (m === "chase" || m === "onboard")}
            onClick={() => onMode(m)}
          >
            {
              {
                orbit: "Orbit · perspective",
                top: "Top · engineering",
                chase: "Chase · telemetry",
                onboard: "Onboard · vehicle mounted",
              }[m]
            }
          </button>
        ))}
        <p>
          Onboard uses an original roof or roll-hoop mount. All cameras follow
          the same lap; switching keeps playback in place.
        </p>
      </div>
    </>
  );
}
