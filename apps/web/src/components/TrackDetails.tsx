import { useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { Track } from "../../../../packages/shared/schema";
import {
  normalizeTrack,
  trackFingerprint,
} from "../../../../packages/track-engine";
import { inspectTrackGeometry } from "../../../../packages/track-engine/diagnostics";
import { download } from "../download";
import "./track-details.css";

const gap = (value: number) =>
  value < 0.001 ? "<0.001 m" : `${value.toFixed(3)} m`;

export function TrackDetails({ track }: { track: Track }) {
  const report = useMemo(
    () => inspectTrackGeometry(track.points),
    [track.points],
  );
  const frame = useMemo(() => normalizeTrack(track), [track]);
  const path = useMemo(
    () => `M${track.points.map((p) => `${p.x},${p.z}`).join("L")}Z`,
    [track.points],
  );
  const [selection, setSelection] = useState<{
    points: Track["points"];
    index: number;
  } | null>(null);
  const [exportError, setExportError] = useState("");
  const index = selection?.points === track.points ? selection.index : 0;
  const selected = report.contacts[index];
  const padding = frame.span * 0.06;
  const exportReport = async () => {
    try {
      const trackHash = await trackFingerprint(track);
      download(
        "laptrix-track-diagnostics.json",
        JSON.stringify(
          {
            format: "laptrix-track-diagnostics-v1",
            track,
            trackFingerprint: trackHash,
            diagnostics: report,
            limitations: [
              "Source centerline segments projected onto x/z; pair counts can share one physical location.",
              "Height gaps interpolate source y values; road widths, surfaces, vehicle clearance and bridge structures are not checked.",
              "The full bounded scan is complete, but only the first 100 contact pairs are retained when more exist.",
              "This diagnostic neither changes source geometry nor certifies a valid road or feasible racing line.",
            ],
          },
          null,
          2,
        ),
      );
      setExportError("");
    } catch {
      setExportError("Geometry report could not be exported. Try again.");
    }
  };
  return (
    <details className="track-details">
      <summary>
        <span>
          Track geometry{" "}
          {report.contactCount > 0 && (
            <span className="geometry-count">{report.contactCount}</span>
          )}
        </span>
        <ChevronDown size={14} />
      </summary>
      <div className="track-details-body">
        <strong>{track.name}</strong>
        <p>{track.provenance}</p>
        <dl>
          <div>
            <dt>Source samples / length</dt>
            <dd>
              {track.points.length.toLocaleString()} /{" "}
              {(frame.length / 1000).toFixed(3)} km
            </dd>
          </div>
          <div>
            <dt>Source elevation range</dt>
            <dd>{frame.elevationRange.toFixed(2)} m</dd>
          </div>
        </dl>
        <p className="geometry-summary" data-testid="geometry-summary">
          {report.contactCount === 0
            ? "No projected segment contacts found."
            : `${report.contactCount} projected segment contact${report.contactCount === 1 ? "" : "s"}.`}
        </p>
        <p>
          Closed source centerline · x/z projection. Ordinary adjacent joins are
          excluded; pair counts can share a location.
        </p>
        <svg
          className="geometry-map"
          role="img"
          aria-label="Top view of source centerline with selected contact segments highlighted"
          viewBox={`${frame.min[0] - padding} ${frame.min[2] - padding} ${frame.max[0] - frame.min[0] + 2 * padding} ${frame.max[2] - frame.min[2] + 2 * padding}`}
        >
          <path
            d={path}
            fill="none"
            stroke="#71839b"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {selected &&
            [selected.firstSegment, selected.secondSegment].map((i) => {
              const a = track.points[i],
                b = track.points[(i + 1) % track.points.length];
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.z}
                  x2={b.x}
                  y2={b.z}
                  stroke="#ed8536"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          {selected && (
            <circle
              cx={selected.from.x}
              cy={selected.from.z}
              r={frame.span * 0.017}
              fill="none"
              stroke="#0866ec"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {selected && (
          <>
            <label className="geometry-selector">
              Inspect source segments
              <select
                aria-label="Geometry contact"
                value={index}
                onChange={(e) =>
                  setSelection({
                    points: track.points,
                    index: Number(e.target.value),
                  })
                }
              >
                {report.contacts.map((c, i) => (
                  <option
                    key={`${c.firstSegment}-${c.secondSegment}`}
                    value={i}
                  >
                    {c.firstSegment + 1} / {c.secondSegment + 1} · {c.kind}
                  </option>
                ))}
              </select>
            </label>
            <dl>
              <div>
                <dt>Minimum source height gap</dt>
                <dd data-testid="geometry-height-gap">
                  {gap(selected.minHeightGap)}
                </dd>
              </div>
              {selected.kind === "overlap" && (
                <div>
                  <dt>Maximum source height gap</dt>
                  <dd>{gap(selected.maxHeightGap)}</dd>
                </div>
              )}
              <div>
                <dt>
                  {selected.kind === "overlap"
                    ? "Overlap starts at x / z"
                    : "Contact x / z"}
                </dt>
                <dd>
                  {(Math.abs(selected.from.x) < 0.005
                    ? 0
                    : selected.from.x
                  ).toFixed(2)}{" "}
                  /{" "}
                  {(Math.abs(selected.from.z) < 0.005
                    ? 0
                    : selected.from.z
                  ).toFixed(2)}{" "}
                  m
                </dd>
              </div>
            </dl>
            {report.omittedContacts > 0 && (
              <p>
                First {report.detailLimit} pairs shown and exported;{" "}
                {report.omittedContacts.toLocaleString()} additional pairs
                counted. Full scan complete.
              </p>
            )}
          </>
        )}
        <p>
          Height gaps describe source elevations. Road widths, surface
          intersections and bridge clearance are not checked.
        </p>
        <button
          type="button"
          className="geometry-export"
          onClick={() => void exportReport()}
        >
          <Download size={13} />
          Export geometry report
        </button>
        {exportError && <p role="alert">{exportError}</p>}
      </div>
    </details>
  );
}
