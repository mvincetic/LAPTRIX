import {
  ArrowDownRight,
  Gauge,
  Target,
  TrendingUp,
  BookmarkPlus,
  ChevronRight,
  Minus,
} from "lucide-react";
import {
  isTimingReference,
  type Lap,
  type Reference,
} from "../../../../packages/shared/schema";
import {
  cornerDelta,
  formatTime,
  signed,
  referenceSectorTimes,
  comparisonTone,
} from "../../../../packages/telemetry";
export function Analysis({
  lap,
  reference,
  currentVehicleName,
  referenceVehicleName,
  onReference,
  onCorner,
  onSeek,
  selectedCorner,
}: {
  lap: Lap | null;
  reference: Reference | null;
  currentVehicleName?: string;
  referenceVehicleName?: string;
  onReference: () => void;
  onCorner: (id: number) => void;
  onSeek: (time: number) => void;
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
  const deltaTone = comparisonTone(delta);
  const percentDelta =
    delta === null || !reference ? null : (delta / reference.lapTime) * 100;
  const referenceSectors = referenceSectorTimes(lap, reference);
  const corner = lap.corners.find((c) => c.id === selectedCorner);
  const refinement = lap.optimization.refinement;
  const checks = lap.numericalChecks;
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
              <span className={`delta-badge ${deltaTone}`}>
                {deltaTone !== "neutral" && <ArrowDownRight size={14} />}
                {signed(delta)} s
              </span>
            )}
          </div>
          <small data-testid="result-vehicle">
            {currentVehicleName ?? lap.vehicleId}
          </small>
          <small>Approximate · {lap.optimization.method}</small>
          <small data-testid="sector-basis">
            {lap.sectorBasis === "source-progress"
              ? "Fixed sector gates"
              : "Legacy distance sectors"}
          </small>
          {lap.sampling && (
            <small data-testid="sampling-summary">
              {lap.sampling.pointCount.toLocaleString()} samples ·{" "}
              {lap.sampling.meanSpacing.toFixed(2)} m mean
              {lap.sampling.capped ? " · point limit reached" : ""}
            </small>
          )}
          {!lap.optimization.converged && (
            <small className="solver-warning">
              Curvature iteration limit reached · best bounded line
            </small>
          )}
          {refinement && (
            <small
              className="refinement-summary"
              data-testid="refinement-summary"
            >
              {refinement.status === "completed"
                ? `${refinement.gainSeconds > 0 ? "−" : ""}${refinement.gainSeconds.toFixed(3)} s vs curvature seed · ${refinement.evaluations} candidates`
                : "Refinement skipped · seed failed numerical checks"}
            </small>
          )}
          {checks &&
            (!checks.speedConverged ||
              checks.maxDemandRatio > checks.demandTolerance) && (
              <small className="solver-warning">
                Speed constraints need review · check track resolution
              </small>
            )}
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
              const r = referenceSectors[i];
              const d = r === null ? null : s.time - r;
              return (
                <tr key={s.id}>
                  <td>S{s.id}</td>
                  <td>{s.time.toFixed(3)}</td>
                  <td className={comparisonTone(d)}>
                    {d === null ? "—" : signed(d)}
                  </td>
                  <td>{formatTime(s.split)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td>Lap</td>
              <td>{formatTime(lap.lapTime)}</td>
              <td className={deltaTone}>
                {delta === null ? "—" : signed(delta)}
              </td>
              <td>{(lap.length / 1000).toFixed(3)} km</td>
            </tr>
          </tbody>
        </table>
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
            <div className="corner-events">
              {(
                [
                  "brakingIndex",
                  "turnInIndex",
                  "apexIndex",
                  "throttleIndex",
                ] as const
              ).map((event, i) => (
                <button
                  key={event}
                  onClick={() => onSeek(lap.samples[corner[event]].time)}
                >
                  <b>{["Brake", "Turn-in", "Apex", "Throttle"][i]}</b>
                  {lap.samples[corner[event]].distance.toFixed(0)} m
                </button>
              ))}
            </div>
          </div>
        )}
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
                <th>Δ (s)</th>
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
              {lap.corners.map((c) => {
                const d = cornerDelta(lap, reference, c);
                return (
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
                      {d !== null ? (
                        <span className={comparisonTone(d)}>{signed(d)}</span>
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
            const r = referenceSectors[i],
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
                <span className={comparisonTone(d)}>
                  {d === null ? "—" : signed(d)}
                </span>
                <b>S{s.id}</b>
              </div>
            );
          })}
        </div>
        <div className="comparison-foot">
          <span data-testid="reference-vehicle">
            {reference
              ? isTimingReference(reference)
                ? `Reference: ${reference.label} · ${reference.vehicleLabel}`
                : `Reference: ${referenceVehicleName ?? reference.vehicleId} · ${reference.setup.solver === "centerline" ? "centerline" : reference.setup.solver === "lap-time" ? "lap-time refinement" : "minimum curvature"}`
              : "No reference selected"}
          </span>
          {percentDelta !== null && (
            <strong className={comparisonTone(percentDelta, 2)}>
              {signed(percentDelta, 2)}%
            </strong>
          )}
        </div>
        {reference && isTimingReference(reference) && (
          <details className="reference-provenance">
            <summary>
              {reference.origin === "recorded"
                ? "Imported recorded timing"
                : "Imported simulation timing"}{" "}
              · {reference.samples.length.toLocaleString()} points
            </summary>
            <p>Source declared by file: {reference.source}</p>
            <p>
              {reference.samples.length.toLocaleString()} timing points ·
              seconds · linear interpolation along source progress
            </p>
          </details>
        )}
        {reference &&
          !isTimingReference(reference) &&
          reference.referenceImport && (
            <div className="reference-provenance">
              Imported simulation export · {reference.referenceImport.fileName}
            </div>
          )}
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
            {refinement
              ? `${refinement.acceptedSteps} / ${refinement.evaluations}`
              : `${(
                  (lap.optimization.curvatureObjectiveReduction ?? 0) * 100
                ).toFixed(1)}%`}
          </strong>
          <span>
            {refinement
              ? "Accepted local line changes"
              : "Curvature objective reduction"}
          </span>
        </div>
        <div className="insight">
          {deltaTone === "neutral" ? (
            <Minus size={19} />
          ) : (
            <ArrowDownRight size={19} />
          )}
          <strong className={deltaTone}>
            {delta === null ? "—" : `${signed(delta)} s`}
          </strong>
          <span>Lap change vs reference</span>
        </div>
      </section>
    </aside>
  );
}
