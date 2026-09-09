import { ChevronDown, Info, Layers, Sun, RotateCcw } from "lucide-react";
import type { Setup, Track, Vehicle } from "../../../../packages/shared/schema";
import { VehicleDetails } from "./VehicleDetails";
import { TrackDetails } from "./TrackDetails";
type Props = {
  setup: Setup;
  onChange: (setup: Setup) => void;
  onReset: () => void;
  disabled: boolean;
  dirty: boolean;
  vehicle?: Vehicle;
  customVehicle?: boolean;
  track?: Track | null;
};
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (n: number) => void;
  hint: string;
}) {
  return (
    <label className="setting">
      <span className="setting-label">
        {label}
        <Info size={12}>
          <title>{hint}</title>
        </Info>
      </span>
      <span className="setting-value">{display}</span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={
          {
            "--fill": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </label>
  );
}
export function Settings({
  setup,
  onChange,
  onReset,
  disabled,
  dirty,
  vehicle,
  customVehicle,
  track,
}: Props) {
  const update = <K extends keyof Setup>(key: K, value: Setup[K]) =>
    onChange({ ...setup, [key]: value });
  return (
    <aside className="panel settings-panel">
      <header className="panel-heading">
        <h2>SIMULATION SETTINGS</h2>
        <button
          className="text-button"
          onClick={onReset}
          disabled={disabled}
          aria-label="Reset settings"
        >
          <RotateCcw size={12} />
          <span className="reset-label">Reset</span>
        </button>
      </header>
      <fieldset disabled={disabled} className="settings-fields">
        <label className="setting">
          <span className="setting-label">
            Tyre compound <Info size={12} />
          </span>
          <span className="tire-select">
            <span className={`tire-badge ${setup.tire}`}>
              {setup.tire[0].toUpperCase()}
            </span>
            <select
              aria-label="Tyre compound"
              value={setup.tire}
              onChange={(e) => update("tire", e.target.value as Setup["tire"])}
            >
              <option value="soft">Soft · performance</option>
              <option value="medium">Medium · balanced</option>
              <option value="hard">Hard · endurance</option>
            </select>
          </span>
        </label>
        <Range
          label="Fuel load"
          value={setup.fuel}
          min={0}
          max={110}
          display={`${setup.fuel.toFixed(1)} kg`}
          hint="Fuel mass is added to vehicle mass."
          onChange={(v) => update("fuel", v)}
        />
        <Range
          label="Aero balance"
          value={setup.aero}
          min={-5}
          max={5}
          display={`${setup.aero > 0 ? "+" : ""}${setup.aero} · ${setup.aero < 0 ? "Less drag" : setup.aero > 0 ? "More downforce" : "Balanced"}`}
          hint="Development model: couples downforce and drag coefficients."
          onChange={(v) => update("aero", v)}
        />
        <Range
          label="Brake bias"
          value={setup.brakeBias}
          min={50}
          max={70}
          display={`${setup.brakeBias}% front`}
          hint="Approximate efficiency penalty away from the 56% reference balance."
          onChange={(v) => update("brakeBias", v)}
        />
        <label className="setting">
          <span className="setting-label">
            Weather conditions <Info size={12} />
          </span>
          <span className="weather-setting">
            <span>
              <Sun size={19} /> Dry
            </span>
            <span className="temperature">
              <input
                type="number"
                aria-label="Temperature"
                min={5}
                max={45}
                value={setup.temperature}
                onChange={(e) => update("temperature", Number(e.target.value))}
                onBlur={(e) =>
                  update(
                    "temperature",
                    Math.max(5, Math.min(45, Number(e.target.value))),
                  )
                }
              />
              °C
            </span>
          </span>
        </label>
        <label className="setting">
          <span className="setting-label">
            Track state <Info size={12} />
          </span>
          <select
            aria-label="Track state"
            value={setup.trackState}
            onChange={(e) =>
              update("trackState", e.target.value as Setup["trackState"])
            }
          >
            <option value="optimum">Optimum</option>
            <option value="green">Green · reduced grip</option>
          </select>
        </label>
        <label className="setting">
          <span className="setting-label">
            Solver mode <Info size={12} />
          </span>
          <span className="solver-select">
            <Layers size={16} />
            <select
              aria-label="Solver mode"
              value={setup.solver}
              onChange={(e) =>
                update("solver", e.target.value as Setup["solver"])
              }
            >
              <option value="optimized">Minimum curvature</option>
              <option value="lap-time">Lap-time refinement</option>
              <option value="centerline">Centerline baseline</option>
            </select>
          </span>
          {setup.solver === "lap-time" && (
            <span className="solver-hint">
              Vehicle-aware search · 78 candidates. Starts from the curvature
              line; may retain it if no improvement is found.
            </span>
          )}
        </label>
        <details className="advanced">
          <summary>
            Advanced settings <ChevronDown size={14} />
          </summary>
          <label className="setting">
            <span className="setting-label">
              Spatial sampling <Info size={12} />
            </span>
            <select
              aria-label="Spatial sampling"
              value={setup.sampling}
              onChange={(e) =>
                update("sampling", e.target.value as Setup["sampling"])
              }
            >
              <option value="source">Original samples</option>
              <option value="5m">Uniform · 5 m target</option>
              <option value="3m">Uniform · 3 m target</option>
            </select>
            <span className="solver-hint">
              Resampling is limited to 2,000 points. More samples add no source
              accuracy.
            </span>
          </label>
          <Range
            label="Air density"
            value={setup.airDensity}
            min={0.9}
            max={1.4}
            step={0.005}
            display={`${setup.airDensity.toFixed(3)} kg/m³`}
            hint="Air density affects drag and downforce."
            onChange={(v) => update("airDensity", v)}
          />
          <p>
            Dry, steady-state conditions. No tyre wear, fuel burn or transient
            suspension model.
          </p>
        </details>
        {track && <TrackDetails track={track} />}
        {vehicle && (
          <VehicleDetails
            vehicle={vehicle}
            fuel={setup.fuel}
            imported={customVehicle}
          />
        )}
      </fieldset>
      <div className={`setup-state ${dirty ? "dirty" : ""}`}>
        <span className="status-dot" />
        {disabled
          ? "Calculating setup…"
          : dirty
            ? "Setup changed · run to apply"
            : "Setup matches current run"}
      </div>
      <div className="model-note">
        <span className="model-icon">
          <Layers size={17} />
        </span>
        <div>
          <strong>Development Physics Model</strong>
          <p>Approximate simulation. Not validated against real telemetry.</p>
        </div>
      </div>
    </aside>
  );
}
