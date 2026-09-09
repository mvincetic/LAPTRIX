import {
  ArrowDownRight,
  Gauge,
  Target,
  TrendingUp,
  BookmarkPlus,
  ChevronRight,
} from "lucide-react";
import type { Lap } from "../../../../packages/shared/schema";
import { formatTime, signed } from "../../../../packages/telemetry";
export function Analysis({
  lap,
  reference,
  onReference,
  onCorner,
  selectedCorner,
}: {
  lap: Lap | null;
  reference: Lap | null;
  onReference: () => void;
  onCorner: (id: number) => void;
  selectedCorner: number | null;
}) {
  if (!lap)
    return (
      <aside className="analysis-column">
        <section className="panel empty-analysis">
          <Gauge size={30} />
          <h2>Your next lap starts here</h2>
          <p>
            Run a simulation to inspect lap time, sectors and corner
            performance.
          </p>
        </section>
      </aside>
    );
  const delta = reference ? lap.lapTime - reference.lapTime : null;
  const corner = lap.corners.find((c) => c.id === selectedCorner);
  return (
    <aside className="analysis-column">
      <section className="panel lap-analysis">
        <header className="panel-heading">
          <h2>LAP ANALYSIS</h2>
          <span className="live">
            <span className="status-dot" /> Calculated
          </span>
        </header>
        <div className="lap-result">
          <span>Theoretical lap time</span>
          <div>
            <strong data-testid="lap-time">{formatTime(lap.lapTime)}</strong>
            {delta !== null && (
              <span
                className={`delta-badge ${delta <= 0 ? "positive" : "negative"}`}
              >
                <ArrowDownRight size={14} />
                {signed(delta)} s
              </span>
            )}
          </div>
          <small>Approximate · {lap.optimization.method}</small>
        </div>
        <table className="sector-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Time</th>
              <th>Δ (s)</th>
              <th>Split</th>
            </tr>
          </thead>
          <tbody>
            {lap.sectors.map((s, i) => {
              const d = reference ? s.time - reference.sectors[i].time : null;
              return (
                <tr key={s.id}>
                  <td>S{s.id}</td>
                  <td>{s.time.toFixed(3)}</td>
                  <td
                    className={d !== null && d <= 0 ? "positive" : "negative"}
                  >
                    {d === null ? "—" : signed(d)}
                  </td>
                  <td>{formatTime(s.split)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td>Lap</td>
              <td>{formatTime(lap.lapTime)}</td>
              <td
                className={
                  delta !== null && delta <= 0 ? "positive" : "negative"
                }
              >
                {delta === null ? "—" : signed(delta)}
              </td>
              <td>{(lap.length / 1000).toFixed(3)} km</td>
            </tr>
          </tbody>
        </table>
        <h3 className="subheading">
          CORNER-BY-CORNER ANALYSIS <span>{lap.corners.length} corners</span>
        </h3>
        <div className="corner-table-wrap">
          <table className="corner-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Entry</th>
                <th>Min.</th>
                <th>Apex G</th>
                <th>Exit</th>
                <th />
              </tr>
              <tr className="units">
                <th />
                <th />
                <th>km/h</th>
                <th>km/h</th>
                <th>G</th>
                <th>km/h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lap.corners.map((c) => (
                <tr
                  key={c.id}
                  className={c.id === selectedCorner ? "selected" : ""}
                >
                  <td>
                    <button
                      aria-label={`Select corner ${c.id}`}
                      onClick={() => onCorner(c.id)}
                    >
                      {c.id}
                    </button>
                  </td>
                  <td>{c.direction}</td>
                  <td>{(c.entrySpeed * 3.6).toFixed(0)}</td>
                  <td>{(c.minSpeed * 3.6).toFixed(0)}</td>
                  <td>{c.lateralG.toFixed(1)}</td>
                  <td>{(c.exitSpeed * 3.6).toFixed(0)}</td>
                  <td>
                    <button
                      className="table-action"
                      aria-label={`Inspect corner ${c.id} data`}
                      onClick={() => onCorner(c.id)}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {corner && (
          <div className="corner-detail">
            <strong>
              T{corner.id} · {corner.direction === "L" ? "Left" : "Right"}{" "}
              corner
            </strong>
            <span>
              {corner.brakingDistance.toFixed(0)} m to apex from braking point
            </span>
            <span>
              Throttle pickup at{" "}
              {lap.samples[corner.throttleIndex].distance.toFixed(0)} m
            </span>
          </div>
        )}
      </section>
      <section className="panel comparison">
        <header className="panel-heading">
          <h2>LAP COMPARISON</h2>
          <button
            className="text-button"
            title="Use this lap as the comparison reference"
            onClick={onReference}
          >
            <BookmarkPlus size={13} /> Set reference
          </button>
        </header>
        <div className="comparison-labels">
          <div>
            <span>
              <i className="small-dot blue" />
              Current lap
            </span>
            <strong>{formatTime(lap.lapTime)}</strong>
          </div>
          <div>
            <span>
              <i className="small-dot gray" />
              Reference lap
            </span>
            <strong>{reference ? formatTime(reference.lapTime) : "—"}</strong>
          </div>
        </div>
        <div className="sector-bars">
          {lap.sectors.map((s, i) => {
            const r = reference?.sectors[i].time,
              max = Math.max(s.time, r ?? 0) * 1.2,
              d = r ? s.time - r : null;
            return (
              <div className="sector-bar-group" key={s.id}>
                <div className="bars">
                  <div style={{ height: `${(s.time / max) * 100}%` }}>
                    <span>{s.time.toFixed(3)}</span>
                  </div>
                  <div style={{ height: `${((r ?? 0) / max) * 100}%` }}>
                    <span>{r?.toFixed(3)}</span>
                  </div>
                </div>
                <span
                  className={d !== null && d <= 0 ? "positive" : "negative"}
                >
                  {d === null ? "—" : signed(d)}
                </span>
                <b>S{s.id}</b>
              </div>
            );
          })}
        </div>
        <div className="comparison-foot">
          {reference?.setup.solver === "centerline"
            ? "Reference: centerline · initial setup"
            : "Reference: saved simulation"}
          {delta !== null && (
            <strong className={delta <= 0 ? "positive" : "negative"}>
              {signed((delta / lap.lapTime) * 100, 2)}%
            </strong>
          )}
        </div>
      </section>
      <section className="panel insights">
        <header className="panel-heading">
          <h2>KEY INSIGHTS</h2>
        </header>
        <div className="insight">
          <Gauge size={19} />
          <strong>{(lap.maxSpeed * 3.6).toFixed(1)} km/h</strong>
          <span>Maximum speed</span>
        </div>
        <div className="insight">
          <Target size={19} />
          <strong>
            {lap.corners.length
              ? Math.min(...lap.corners.map((c) => c.minSpeed * 3.6)).toFixed(0)
              : "—"}{" "}
            km/h
          </strong>
          <span>Slowest corner speed</span>
        </div>
        <div className="insight">
          <TrendingUp size={19} />
          <strong>
            {(
              (lap.optimization.curvatureObjectiveReduction ?? 0) * 100
            ).toFixed(1)}
            %
          </strong>
          <span>Curvature objective reduction</span>
        </div>
        <div className="insight">
          <ArrowDownRight size={19} />
          <strong
            className={delta !== null && delta <= 0 ? "positive" : "negative"}
          >
            {delta === null ? "—" : `${signed(delta)} s`}
          </strong>
          <span>Lap change vs reference</span>
        </div>
      </section>
    </aside>
  );
}
