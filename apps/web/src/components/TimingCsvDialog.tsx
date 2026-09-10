import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import type { Lap, Track } from "../../../../packages/shared/schema";
import { formatTime } from "../../../../packages/telemetry";
import { download } from "../download";
import {
  parseTimingCsv,
  prepareTimingCsv,
  type TimingCsvData,
  type TimingCsvMetadata,
  type TimingCsvSelection,
  type TimingCsvTable,
} from "../timingCsv";
import "./timing-csv.css";

export function TimingCsvDialog({
  track,
  example,
  onImport,
  onClose,
}: {
  track: Track;
  example: Lap | null;
  onImport: (data: TimingCsvData, metadata: TimingCsvMetadata) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    choose = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false),
    workGeneration = useRef(0);
  const [table, setTable] = useState<TimingCsvTable | null>(null),
    [fileName, setFileName] = useState("");
  const [selection, setSelection] = useState<TimingCsvSelection>({
    timeColumn: -1,
    progressColumn: -1,
    timeUnit: "s",
    progressUnit: "fraction",
  });
  const [label, setLabel] = useState(""),
    [vehicleLabel, setVehicleLabel] = useState(""),
    [origin, setOrigin] = useState<TimingCsvMetadata["origin"] | "">(""),
    [source, setSource] = useState("");
  const [aligned, setAligned] = useState(false),
    [reading, setReading] = useState(false),
    [importing, setImporting] = useState(false),
    [error, setError] = useState("");
  const preview = useMemo(() => {
    if (!table || selection.timeColumn < 0 || selection.progressColumn < 0)
      return null;
    try {
      return { data: prepareTimingCsv(table, selection), error: "" };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Invalid timing data.",
      };
    }
  }, [table, selection]);
  const close = () => {
    workGeneration.current += 1;
    dialog.current?.close();
    onClose();
  };
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    element?.showModal();
    choose.current?.focus();
    return () => {
      mounted.current = false;
      workGeneration.current += 1;
      element?.close();
    };
  }, []);
  const load = async (file: File) => {
    if (importing) return;
    const generation = ++workGeneration.current;
    setReading(true);
    setError("");
    setTable(null);
    setFileName(file.name);
    setAligned(false);
    try {
      if (file.size > 5_000_000) throw new Error("CSV is limited to 5 MB.");
      const text = await file.text();
      if (!mounted.current || generation !== workGeneration.current) return;
      const parsed = parseTimingCsv(text);
      setTable(parsed);
      setSelection({
        timeColumn: parsed.headers.indexOf("time_s"),
        progressColumn: parsed.headers.indexOf("source_progress"),
        timeUnit: "s",
        progressUnit: "fraction",
      });
      setLabel(
        file.name
          .replace(/\.[^.]+$/, "")
          .trim()
          .slice(0, 100),
      );
      setVehicleLabel("");
      setOrigin("");
      setSource("");
    } catch (error) {
      if (mounted.current && generation === workGeneration.current)
        setError(
          error instanceof Error ? error.message : "Could not read CSV.",
        );
    } finally {
      if (mounted.current && generation === workGeneration.current)
        setReading(false);
    }
  };
  const submit = async () => {
    if (!preview?.data || !aligned || !origin || importing) return;
    if (!label.trim() || !vehicleLabel.trim() || !source.trim()) {
      setError("Enter a reference label, vehicle label and provenance.");
      return;
    }
    const generation = ++workGeneration.current;
    setImporting(true);
    setError("");
    try {
      await onImport(preview.data, { label, vehicleLabel, origin, source });
      if (mounted.current && generation === workGeneration.current) close();
    } catch (error) {
      if (mounted.current && generation === workGeneration.current)
        setError(
          error instanceof Error ? error.message : "Could not import timing.",
        );
    } finally {
      if (mounted.current && generation === workGeneration.current)
        setImporting(false);
    }
  };
  const columnOptions = (
    <>
      <option value={-1}>Choose a column</option>
      {table?.headers.map((header, i) => (
        <option key={i} value={i}>
          {header}
        </option>
      ))}
    </>
  );
  const previewRows = preview?.data
    ? [
        ...new Set([
          0,
          1,
          2,
          preview.data.samples.length - 2,
          preview.data.samples.length - 1,
        ]),
      ].filter((index) => index >= 0 && index < preview.data!.samples.length)
    : [];
  return (
    <dialog
      ref={dialog}
      className="timing-csv-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="timing-csv-heading">
        <h1 id={`${id}-title`}>Import timing CSV</h1>
        <button
          type="button"
          className="icon-button"
          aria-label="Close timing CSV import"
          onClick={close}
        >
          <X size={17} />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="timing-csv-body">
          <p>
            Compare a complete lap already aligned to{" "}
            <strong>{track.name}</strong>. Raw distance and GPS need source
            alignment before import.
          </p>
          <div className="timing-csv-file">
            <button
              type="button"
              ref={choose}
              disabled={importing}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={14} /> Choose CSV
            </button>
            <span>
              {reading ? "Reading CSV…" : fileName || "No file selected"}
            </span>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".csv,text/csv"
              aria-label="Timing CSV file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void load(file);
              }}
            />
          </div>
          <p className="tiny muted">
            Comma-separated header · 2–20,000 records · up to 5 MB.
          </p>
          <button
            type="button"
            className="text-button timing-csv-example"
            disabled={!example?.alignment}
            onClick={() => {
              if (example?.alignment)
                download(
                  "laptrix-simulated-timing.csv",
                  [
                    "time_s,source_progress",
                    ...example.samples.map(
                      (sample, i) =>
                        `${sample.time},${example.alignment!.progress[i]}`,
                    ),
                  ].join("\r\n"),
                  "text/csv",
                );
            }}
          >
            <Download size={13} /> Download simulated CSV example
          </button>
          <p className="tiny muted">
            The example uses the current calculated lap, not recorded telemetry.
          </p>
          {error && (
            <p className="timing-csv-error" role="alert">
              {error}
            </p>
          )}
          {table && (
            <fieldset disabled={importing}>
              <legend>Columns and units</legend>
              <div className="timing-csv-fields">
                <label>
                  Time column
                  <select
                    aria-label="Time column"
                    value={selection.timeColumn}
                    onChange={(event) =>
                      setSelection({
                        ...selection,
                        timeColumn: Number(event.target.value),
                      })
                    }
                  >
                    {columnOptions}
                  </select>
                </label>
                <label>
                  Time units
                  <select
                    aria-label="Time units"
                    value={selection.timeUnit}
                    onChange={(event) =>
                      setSelection({
                        ...selection,
                        timeUnit: event.target
                          .value as TimingCsvSelection["timeUnit"],
                      })
                    }
                  >
                    <option value="s">Seconds (s)</option>
                    <option value="ms">Milliseconds (ms)</option>
                  </select>
                </label>
                <label>
                  Source-progress column
                  <select
                    aria-label="Source-progress column"
                    value={selection.progressColumn}
                    onChange={(event) =>
                      setSelection({
                        ...selection,
                        progressColumn: Number(event.target.value),
                      })
                    }
                  >
                    {columnOptions}
                  </select>
                </label>
                <label>
                  Progress units
                  <select
                    aria-label="Progress units"
                    value={selection.progressUnit}
                    onChange={(event) =>
                      setSelection({
                        ...selection,
                        progressUnit: event.target
                          .value as TimingCsvSelection["progressUnit"],
                      })
                    }
                  >
                    <option value="fraction">Fraction (0–1)</option>
                    <option value="percent">Percent (0–100)</option>
                  </select>
                </label>
              </div>
              {preview?.error ? (
                <p className="timing-csv-error" role="alert">
                  {preview.error}
                </p>
              ) : !preview ? (
                <p className="muted">Choose columns to preview the lap.</p>
              ) : (
                <div className="timing-csv-preview">
                  <p role="status">
                    <strong>
                      {table.rows.length.toLocaleString()} records ·{" "}
                      {formatTime(preview.data!.lapTime)}
                    </strong>
                    <span> Converted to seconds and source fraction</span>
                  </p>
                  <table>
                    <caption>First and final records</caption>
                    <thead>
                      <tr>
                        <th>Record</th>
                        <th>Time (s)</th>
                        <th>Source progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            {preview.data!.samples[index].time.toFixed(3)}
                          </td>
                          <td>{preview.data!.progress[index].toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="timing-csv-fields">
                <label>
                  Reference label
                  <input
                    value={label}
                    maxLength={100}
                    required
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </label>
                <label>
                  Vehicle label
                  <input
                    value={vehicleLabel}
                    maxLength={100}
                    required
                    onChange={(event) => setVehicleLabel(event.target.value)}
                  />
                </label>
                <label className="timing-csv-wide">
                  Declared origin
                  <select
                    aria-label="Declared origin"
                    value={origin}
                    required
                    onChange={(event) =>
                      setOrigin(event.target.value as typeof origin)
                    }
                  >
                    <option value="">Choose an origin</option>
                    <option value="recorded">Recorded timing</option>
                    <option value="external-simulation">
                      External simulation
                    </option>
                  </select>
                </label>
                <label className="timing-csv-wide">
                  Provenance and alignment
                  <textarea
                    value={source}
                    maxLength={500}
                    required
                    rows={3}
                    placeholder="Logger or simulation, session, and how progress was aligned to this source."
                    onChange={(event) => setSource(event.target.value)}
                  />
                </label>
              </div>
              <label className="timing-csv-alignment">
                <input
                  type="checkbox"
                  checked={aligned}
                  required
                  aria-label="CSV uses this source track"
                  onChange={(event) => setAligned(event.target.checked)}
                />
                <span>
                  Source progress uses {track.name}'s start/finish and
                  direction. This declaration does not independently verify a
                  recording.
                </span>
              </label>
            </fieldset>
          )}
        </div>
        <footer className="timing-csv-footer">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!preview?.data || reading || importing || !aligned}
          >
            {importing ? "Importing…" : "Import timing reference"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
