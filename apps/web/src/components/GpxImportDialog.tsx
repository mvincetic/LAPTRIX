import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { Track } from "../../../../packages/shared/schema";
import { normalizeTrack } from "../../../../packages/track-engine";
import {
  parseGpx,
  prepareGpxTrack,
  type GpxOptions,
  type GpxSource,
} from "../gpx";
import "./gpx-import.css";

export type GpxDraft = {
  source: GpxSource;
  options: GpxOptions;
  fileName: string;
};

export function GpxImportDialog({
  initial,
  onClose,
  onImport,
}: {
  initial: GpxDraft | null;
  onClose: () => void;
  onImport: (track: Track, draft: GpxDraft) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseFile = useRef<HTMLButtonElement>(null);
  const readGeneration = useRef(0);
  const mounted = useRef(false);
  const [draft, setDraft] = useState(initial);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    if (!draft) return null;
    try {
      const track = prepareGpxTrack(draft.source, draft.options);
      return { track, geometry: normalizeTrack(track), error: "" };
    } catch (error) {
      return {
        track: null,
        geometry: null,
        error: error instanceof Error ? error.message : "Invalid GPX geometry.",
      };
    }
  }, [draft]);
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current;
    element?.showModal();
    chooseFile.current?.focus();
    return () => {
      mounted.current = false;
      element?.close();
    };
  }, []);
  const load = async (file: File) => {
    const generation = ++readGeneration.current;
    setReading(true);
    setError("");
    setDraft(null);
    try {
      if (file.size > 1_500_000)
        throw new Error("GPX file must be smaller than 1.5 MB.");
      const text = await file.text();
      if (!mounted.current || generation !== readGeneration.current) return;
      const source = parseGpx(text);
      setDraft({
        source,
        fileName: file.name,
        options: {
          name: source.name,
          source: file.name.slice(0, 140),
          widthLeft: 6,
          widthRight: 6,
        },
      });
    } catch (error) {
      if (mounted.current && generation === readGeneration.current)
        setError(
          error instanceof Error ? error.message : "Could not read GPX file.",
        );
    } finally {
      if (mounted.current && generation === readGeneration.current)
        setReading(false);
    }
  };
  const change = (values: Partial<GpxOptions>) =>
    setDraft((current) =>
      current
        ? { ...current, options: { ...current.options, ...values } }
        : current,
    );
  const geometry = preview?.geometry;
  const source = draft?.source;
  const span = geometry ? Math.max(geometry.span, 1) : 1;
  const position = (point: { x: number; z: number }) => [
    20 + ((point.x - geometry!.center[0]) / span + 0.5) * 320,
    20 + ((point.z - geometry!.center[2]) / span + 0.5) * 320,
  ];
  return (
    <dialog
      ref={dialog}
      className="gpx-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="gpx-heading">
        <h1 id={`${id}-title`}>Import GPX circuit</h1>
        <button
          type="button"
          className="icon-button"
          aria-label="Close GPX import"
          onClick={close}
        >
          <X size={17} />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft && preview?.track && !reading) {
            dialog.current?.close();
            onImport(preview.track, draft);
          }
        }}
      >
        <div className="gpx-body">
          <p id={`${id}-intro`}>
            Review one closed circuit before calculating. GPX 1.1, 40–2,000
            points and elevation at every point are required.
          </p>
          <div className="gpx-file">
            <Upload size={15} /> GPX source file
          </div>
          <div className="gpx-file-picker">
            <button
              ref={chooseFile}
              type="button"
              aria-describedby={`${id}-file-help`}
              onClick={() => fileInput.current?.click()}
            >
              Choose GPX file
            </button>
            <span>{draft?.fileName ?? "No source loaded"}</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            hidden
            aria-label="GPX source file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            aria-describedby={`${id}-file-help`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void load(file);
              event.target.value = "";
            }}
          />
          <small id={`${id}-file-help`}>
            Up to 1.5 MB. Timing and logger channels are not imported.
          </small>
          {reading && <p role="status">Reading GPX geometry…</p>}
          {(error || preview?.error) && (
            <p className="gpx-error" role="alert">
              {error || preview?.error}
            </p>
          )}
          {draft && (
            <>
              <div className="gpx-fields">
                <label>
                  Track name
                  <input
                    value={draft.options.name}
                    required
                    maxLength={100}
                    onChange={(event) => change({ name: event.target.value })}
                  />
                </label>
                <label>
                  Source description
                  <input
                    value={draft.options.source}
                    required
                    maxLength={140}
                    onChange={(event) => change({ source: event.target.value })}
                  />
                </label>
                <label>
                  Assumed left half-width (m)
                  <input
                    type="number"
                    min={2}
                    max={40}
                    step="any"
                    required
                    value={
                      Number.isNaN(draft.options.widthLeft)
                        ? ""
                        : draft.options.widthLeft
                    }
                    onChange={(event) =>
                      change({ widthLeft: event.target.valueAsNumber })
                    }
                  />
                </label>
                <label>
                  Assumed right half-width (m)
                  <input
                    type="number"
                    min={2}
                    max={40}
                    step="any"
                    required
                    value={
                      Number.isNaN(draft.options.widthRight)
                        ? ""
                        : draft.options.widthRight
                    }
                    onChange={(event) =>
                      change({ widthRight: event.target.valueAsNumber })
                    }
                  />
                </label>
              </div>
              {geometry && source && (
                <div className="gpx-preview">
                  <svg
                    viewBox="0 0 360 360"
                    role="img"
                    aria-label="GPX circuit preview, north up, with start point and closing segment"
                  >
                    <path
                      d={source.points
                        .map(
                          (point, i) =>
                            `${i ? "L" : "M"}${position(point).join(",")}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#0866ec"
                      strokeWidth={2}
                    />
                    <path
                      d={`M${position(source.points.at(-1)!).join(",")} L${position(source.points[0]).join(",")}`}
                      fill="none"
                      stroke="#df7141"
                      strokeWidth={3}
                      strokeDasharray="4 3"
                    />
                    <circle
                      cx={position(source.points[0])[0]}
                      cy={position(source.points[0])[1]}
                      r={5}
                      fill="#15365a"
                    />
                    <text x={20} y={16}>
                      N ↑
                    </text>
                  </svg>
                  <div>
                    <strong>Model geometry · unverified</strong>
                    <dl>
                      <div>
                        <dt>Retained points</dt>
                        <dd>{source.points.length}</dd>
                      </div>
                      <div>
                        <dt>Closed length</dt>
                        <dd>{(geometry.length / 1000).toFixed(3)} km</dd>
                      </div>
                      <div>
                        <dt>Elevation range</dt>
                        <dd>
                          {geometry.min[1].toFixed(1)} to{" "}
                          {geometry.max[1].toFixed(1)} m
                        </dd>
                      </div>
                      <div>
                        <dt>
                          {source.closingPointRemoved
                            ? "Closing segment"
                            : "Endpoint join"}
                        </dt>
                        <dd>{source.seam.toFixed(2)} m</dd>
                      </div>
                    </dl>
                    <p>
                      {source.closingPointRemoved
                        ? "One repeated closing point is removed."
                        : "The last point is joined to the first with the highlighted segment."}{" "}
                      The dark marker is the start.
                    </p>
                  </div>
                </div>
              )}
              <div className="gpx-assumptions">
                <strong>Import assumptions</strong>
                <p>
                  The path becomes the model centerline. Widths are your
                  assumptions; banking is zero. Three equal source-distance
                  sectors are created.
                </p>
                <p>
                  Horizontal coordinates use a local WGS84 surface projection
                  within 10 km of the first point. Supplied elevations are
                  retained; their datum and accuracy are unverified.
                </p>
                <p>
                  Calculation replaces the current track and reference only when
                  both new laps succeed. Save or export retains the converted
                  geometry; keep the original GPX separately.
                </p>
              </div>
            </>
          )}
        </div>
        <footer className="gpx-footer">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!preview?.track || reading}
          >
            Import and simulate
          </button>
        </footer>
      </form>
    </dialog>
  );
}
