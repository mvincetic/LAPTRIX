import { ChevronDown } from "lucide-react";
import type { Vehicle } from "../../../../packages/shared/schema";

export function VehicleDetails({
  vehicle,
  fuel,
}: {
  vehicle: Vehicle;
  fuel: number;
}) {
  return (
    <details className="vehicle-details">
      <summary>
        Vehicle data & assumptions <ChevronDown size={14} />
      </summary>
      <div className="vehicle-details-body">
        <strong>{vehicle.name}</strong>
        <p>{vehicle.description}</p>
        <dl>
          <div>
            <dt>Base mass · without fuel</dt>
            <dd>{vehicle.mass.toLocaleString()} kg</dd>
          </div>
          <div>
            <dt>Run mass · with fuel</dt>
            <dd>{(vehicle.mass + fuel).toLocaleString()} kg</dd>
          </div>
          <div>
            <dt>Peak engine power</dt>
            <dd>{vehicle.powerKw} kW</dd>
          </div>
          <div>
            <dt>Drag / downforce area</dt>
            <dd>
              {vehicle.dragArea} / {vehicle.downforceArea} m²
            </dd>
          </div>
          <div>
            <dt>Tyre friction coefficient</dt>
            <dd>{vehicle.friction}</dd>
          </div>
          <div>
            <dt>Commanded braking cap</dt>
            <dd>{vehicle.maxBrakeG} g</dd>
          </div>
          <div>
            <dt>Gear count / final drive</dt>
            <dd>
              {vehicle.gearRatios.length} / {vehicle.finalDrive}
            </dd>
          </div>
          <div>
            <dt>Idle / redline</dt>
            <dd>
              {vehicle.idleRpm.toLocaleString()} /{" "}
              {vehicle.maxRpm.toLocaleString()} rpm
            </dd>
          </div>
        </dl>
        <p className="vehicle-data-label">Model assumptions</p>
        <ul>
          {vehicle.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        {vehicle.sources.map((source) => (
          <div className="vehicle-source" key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
            <p>Anchors: {source.fields.join("; ")}.</p>
          </div>
        ))}
      </div>
    </details>
  );
}
