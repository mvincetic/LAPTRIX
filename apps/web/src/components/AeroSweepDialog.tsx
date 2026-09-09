import { useEffect, useRef, useState } from "react";
import { FlaskConical, LoaderCircle, X } from "lucide-react";
import type {
  Lap,
  Setup,
  Track,
  Vehicle,
} from "../../../../packages/shared/schema";
import { formatTime } from "../../../../packages/telemetry";
import { runSimulation } from "../api";
import {
  aeroCandidates,
  comparisonIssue,
  buildAeroReport,
  type AeroCandidate,
  type StudyRun,
} from "../aeroComparison";
import { download } from "../download";
import "./aero-comparison.css";

type Props = {
  track: Track;
  vehicle: Vehicle;
  projectName: string;
  setup: Setup;
  custom: boolean;
  onClose: () => void;
  onApply: (lap: Lap) => void;
};
const aeroLabel = (value: number) => (value > 0 ? `+${value}` : `${value}`);

export function AeroSweepDialog({
  track,
  vehicle,
  projectName,
  setup,
  custom,
  onClose,
  onApply,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(false);
  const [rows, setRows] = useState<AeroCandidate[]>(() =>
    aeroCandidates(setup.aero).map((aero) => ({ aero })),
  );
  const [running, setRunning] = useState(false);
  const [activeAero, setActiveAero] = useState<number | null>(null);
  const [status, setStatus] = useState("Ready to compare");
  const [selected, setSelected] = useState<number | null>(null);
  const [studyRun, setStudyRun] = useState<StudyRun | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  useEffect(() => {
    alive.current = true;
    const element = dialog.current;
    element?.showModal();
    return () => {
      alive.current = false;
      controller.current?.abort();
      element?.close();
    };
  }, []);
  const baseline = rows.find((row) => row.aero === setup.aero)?.lap;
  const checked = rows.filter((row) => row.lap && !comparisonIssue(row.lap));
  const best = checked.reduce<AeroCandidate | null>(
    (winner, row) =>
      !winner || row.lap!.lapTime < winner.lap!.lapTime ? row : winner,
    null,
  );
  const chosen = checked.find((row) => row.aero === selected)?.lap;
  const completed = rows.filter((row) => row.lap || row.error).length;
  const start = async () => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    const startedAt = new Date().toISOString();
    setStudyRun(null);
    setExportError("");
    const results: AeroCandidate[] = aeroCandidates(setup.aero).map((aero) => ({
      aero,
    }));
    setRows(results);
    setRunning(true);
    setSelected(null);
    for (let i = 0; i < results.length; i++) {
      if (abort.signal.aborted) break;
      const row = results[i];
      setActiveAero(row.aero);
      setStatus(
        `Calculating ${i + 1} of ${results.length} · aero ${aeroLabel(row.aero)}`,
      );
      try {
        const lap = await runSimulation(
          track,
          vehicle.id,
          { ...setup, aero: row.aero },
          custom,
          abort.signal,
        );
        if (abort.signal.aborted || !alive.current) break;
        results[i] = { ...row, lap };
      } catch (error) {
        if (abort.signal.aborted || !alive.current) break;
        results[i] = {
          ...row,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
      setRows([...results]);
    }
    if (!alive.current) return;
    const eligible = results.filter(
      (row) => row.lap && !comparisonIssue(row.lap),
    );
    eligible.sort((a, b) => a.lap!.lapTime - b.lap!.lapTime);
    setSelected(eligible[0]?.aero ?? null);
    setActiveAero(null);
    setRunning(false);
    setStudyRun({
      startedAt,
      finishedAt: new Date().toISOString(),
      outcome: abort.signal.aborted ? "stopped" : "completed",
    });
    setStatus(
      `${abort.signal.aborted ? "Comparison stopped" : "Comparison complete"} · ${eligible.length} checked results`,
    );
    controller.current = null;
  };
  const exportStudy = async () => {
    if (!studyRun) return;
    setExporting(true);
    setExportError("");
    try {
      const report = await buildAeroReport({
        projectName,
        track,
        vehicle,
        setup,
        rows,
        selectedAero: selected,
        run: studyRun,
      });
      if (alive.current)
        download("laptrix-aero-study.json", JSON.stringify(report, null, 2));
    } catch (error) {
      if (alive.current)
        setExportError(
          error instanceof Error
            ? error.message
            : "Study export failed. Please retry.",
        );
    } finally {
      if (alive.current) setExporting(false);
    }
  };
  const close = () => {
    controller.current?.abort();
    dialog.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="aero-dialog"
      aria-labelledby="aero-title"
      aria-describedby="aero-description"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="aero-heading">
        <div>
          <span className="aero-eyebrow">
            <FlaskConical size={13} /> SETUP STUDY
          </span>
          <h1 id="aero-title">Compare aero settings</h1>
        </div>
        <button
          className="icon-button"
          aria-label="Close aero comparison"
          onClick={close}
        >
          <X size={17} />
        </button>
      </header>
      <div className="aero-body">
        <p id="aero-description">
          Run {rows.length} settings on {track.name}. All other setup values
          stay fixed. Select a checked result to apply it to your workspace.
        </p>
        <div className="aero-context">
          <strong>{vehicle.name}</strong>
          <span>
            {setup.solver === "lap-time"
              ? "Lap-time refinement"
              : setup.solver === "centerline"
                ? "Centerline baseline"
                : "Curvature optimization"}{" "}
            ·{" "}
            {setup.sampling === "source"
              ? "Source grid"
              : `${setup.sampling} sampling`}{" "}
            · {setup.fuel} kg fuel
          </span>
        </div>
        <div className="aero-progress">
          <span role="status" data-testid="aero-status">
            {running && <LoaderCircle size={13} className="spin" />}
            {status}
          </span>
          <span>
            {completed} / {rows.length}
          </span>
        </div>
        <progress
          aria-label="Aero comparison progress"
          value={completed}
          max={rows.length}
        />
        <table className="aero-table">
          <caption>
            Aero setting results · compared with the starting setting
          </caption>
          <thead>
            <tr>
              <th scope="col">Aero</th>
              <th scope="col">Lap time</th>
              <th scope="col">Δ start</th>
              <th scope="col">Checks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const issue =
                row.error ?? (row.lap ? comparisonIssue(row.lap) : null);
              const delta =
                row.lap && baseline && !comparisonIssue(baseline)
                  ? row.lap.lapTime - baseline.lapTime
                  : null;
              const deltaText =
                delta === null
                  ? "—"
                  : `${delta < -0.0005 ? "−" : delta >= 0.0005 ? "+" : ""}${Math.abs(delta).toFixed(3)}`;
              return (
                <tr
                  key={row.aero}
                  className={selected === row.aero ? "aero-selected" : ""}
                >
                  <th scope="row">
                    <label>
                      <input
                        type="radio"
                        name="aero-result"
                        aria-label={`Select aero ${aeroLabel(row.aero)}`}
                        disabled={running || !row.lap || !!issue}
                        checked={selected === row.aero}
                        onChange={() => setSelected(row.aero)}
                      />
                      <span>
                        {aeroLabel(row.aero)}
                        {row.aero === setup.aero && <small>Start</small>}
                      </span>
                    </label>
                  </th>
                  <td>
                    {row.lap ? formatTime(row.lap.lapTime) : "—"}
                    {!running && row === best && (
                      <small className="aero-best">Fastest checked</small>
                    )}
                  </td>
                  <td
                    className={
                      delta !== null && delta < -0.0005
                        ? "aero-faster"
                        : delta !== null && delta > 0.0005
                          ? "aero-slower"
                          : ""
                    }
                  >
                    {deltaText}
                  </td>
                  <td>
                    {issue ? (
                      <details className="aero-issue">
                        <summary>{row.error ? "Failed" : "Excluded"}</summary>
                        <p>{issue}</p>
                      </details>
                    ) : row.lap ? (
                      <span className="aero-faster">Passed</span>
                    ) : activeAero === row.aero ? (
                      "Running…"
                    ) : (
                      "Pending"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="aero-note">
          Aero couples drag and downforce in this development model. The fastest
          checked result is best among this set; it is not a global optimum.
          Deltas use a fresh run at the starting setting.
        </p>
        {chosen && !running && (
          <p className="aero-selection">
            Selected: aero <strong>{aeroLabel(chosen.setup.aero)}</strong> ·{" "}
            <strong>{formatTime(chosen.lapTime)}</strong>
          </p>
        )}
        {studyRun && !running && (
          <div className="aero-export">
            <span>Keep inputs, full results and checks.</span>
            <button disabled={exporting} onClick={() => void exportStudy()}>
              {exporting ? "Exporting…" : "Export study JSON"}
            </button>
          </div>
        )}
        {exportError && (
          <p className="aero-slower" role="alert">
            {exportError}
          </p>
        )}
      </div>
      <footer className="aero-footer">
        {running ? (
          <button onClick={() => controller.current?.abort()}>
            Stop comparison
          </button>
        ) : (
          <button disabled={exporting} onClick={() => void start()}>
            {completed ? "Run again" : "Run comparison"}
          </button>
        )}
        <button
          className="primary-button"
          disabled={running || !chosen}
          onClick={() => {
            if (chosen) {
              dialog.current?.close();
              onApply(chosen);
            }
          }}
        >
          Apply selected result
        </button>
      </footer>
    </dialog>
  );
}
