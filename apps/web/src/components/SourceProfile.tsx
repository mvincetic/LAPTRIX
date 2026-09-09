import { useId, useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { Track } from "../../../../packages/shared/schema";
import {
  sourceProfile,
  sourceSegmentAtDistance,
} from "../../../../packages/track-engine/profile";
import { trackFingerprint } from "../../../../packages/track-engine";
import { download } from "../download";
import "./source-profile.css";

const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
const scaleLabel = (value: number) =>
  Math.abs(value) >= 10000 ? value.toExponential(1) : value.toFixed(1);

export function SourceProfile({
  track,
  expanded = false,
}: {
  track: Track;
  expanded?: boolean;
}) {
  const Container = expanded ? "div" : "details";
  const id = useId();
  const data = useMemo(() => sourceProfile(track.points), [track.points]);
  const [selection, setSelection] = useState<{
    points: Track["points"];
    index: number;
  } | null>(null);
  const [exportError, setExportError] = useState("");
  const index = selection?.points === track.points ? selection.index : 0;
  const selected = data.segments[index];
  const select = (index: number) =>
    setSelection({ points: track.points, index });
  const plots = useMemo(() => {
    const flat = data.maxElevation === data.minElevation;
    const min = data.minElevation - (flat ? 0.5 : 0);
    const max = data.maxElevation + (flat ? 0.5 : 0);
    const grade = Math.max(1, data.maxUphill, -data.maxDownhill);
    const x = (distance: number) =>
      ((distance / data.length) * 1000).toFixed(3);
    const y = (value: number, min: number, max: number) =>
      (82 - ((value - min) / (max - min)) * 78).toFixed(3);
    return [
      {
        key: "elevation",
        label: "Source elevation (m)",
        min,
        max,
        zero: false,
        path:
          data.segments
            .map(
              (s, i) =>
                `${i ? "L" : "M"}${x(s.distance)},${y(s.startElevation, min, max)}`,
            )
            .join(" ") +
          ` L1000,${y(data.segments.at(-1)!.endElevation, min, max)}`,
      },
      {
        key: "grade",
        label: "Segment grade (%)",
        min: -grade,
        max: grade,
        zero: true,
        path: data.segments
          .map(
            (s, i) =>
              `${i ? "V" : "M0,"}${y(s.gradePercent, -grade, grade)} H${x(s.endDistance)}`,
          )
          .join(" "),
      },
    ];
  }, [data]);
  const seek = (fraction: number) =>
    select(sourceSegmentAtDistance(data, fraction * data.length));
  const exportReport = async () => {
    try {
      const fingerprint = await trackFingerprint(track);
      download(
        "laptrix-source-profile.json",
        JSON.stringify(
          {
            format: "laptrix-source-profile-v1",
            algorithm: "closed-source-chords-v1",
            track,
            trackFingerprint: fingerprint,
            units: {
              distance: "m",
              elevation: "m",
              gradePercent: "percent rise / horizontal run",
              index: "zero-based source segment",
            },
            profile: data,
            limitations: [
              "Original closed source chords without smoothing; elevation totals are sensitive to sample noise.",
              "Grade uses rise divided by horizontal run, not the solver's rise divided by 3D length.",
              "Source elevation datum and accuracy are unverified; this is geometry inspection, not a dynamics result.",
            ],
          },
          null,
          2,
        ),
      );
      setExportError("");
    } catch {
      setExportError("Source profile could not be exported. Try again.");
    }
  };
  return (
    <Container className="source-profile">
      {!expanded && (
        <summary>
          <span>Elevation &amp; grade</span>
          <ChevronDown size={13} />
        </summary>
      )}
      <div
        className="source-profile-body"
        role="region"
        aria-label="Source elevation and grade"
      >
        <p className="profile-note">
          Original source samples · no smoothing. Grade is rise divided by
          horizontal run.
        </p>
        <dl className="profile-totals">
          <div>
            <dt>Raw ascent / descent</dt>
            <dd>
              {data.ascent.toFixed(1)} / {data.descent.toFixed(1)} m
            </dd>
          </div>
          <div>
            <dt>Steepest uphill / downhill</dt>
            <dd>
              {signed(data.maxUphill)} / {signed(data.maxDownhill)} %
            </dd>
          </div>
        </dl>
        {plots.map((plot) => (
          <div className="source-chart" key={plot.key}>
            <strong>{plot.label}</strong>
            <div className="source-chart-row">
              <div
                className="source-chart-scale"
                aria-label={`${plot.label}: ${plot.min} to ${plot.max}`}
              >
                <span className="profile-max" title={String(plot.max)}>
                  {scaleLabel(plot.max)}
                </span>
                {plot.zero && <span className="profile-zero">0</span>}
                <span className="profile-min" title={String(plot.min)}>
                  {scaleLabel(plot.min)}
                </span>
              </div>
              <div className="source-chart-plot">
                <svg
                  viewBox="0 0 1000 100"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`${plot.label} over original source distance`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const box = event.currentTarget.getBoundingClientRect();
                    seek((event.clientX - box.left) / box.width);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) {
                      const box = event.currentTarget.getBoundingClientRect();
                      seek((event.clientX - box.left) / box.width);
                    }
                  }}
                >
                  {[4, 82].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      x2={1000}
                      y1={y}
                      y2={y}
                      stroke="#e3eaf2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {plot.zero && (
                    <line
                      x1={0}
                      x2={1000}
                      y1={43}
                      y2={43}
                      stroke="#97a8bf"
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <path
                    data-testid={`source-${plot.key}-trace`}
                    d={plot.path}
                    stroke="#0866ec"
                    fill="none"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    data-testid={`source-${plot.key}-cursor`}
                    x1={(selected.distance / data.length) * 1000}
                    x2={(selected.distance / data.length) * 1000}
                    y1={0}
                    y2={88}
                    stroke="#15365a"
                    strokeWidth={1.2}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="source-chart-ticks" aria-hidden="true">
                  {[0, 0.5, 1].map((fraction) => (
                    <span key={fraction}>
                      {(data.length * fraction).toFixed(0)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <p className="profile-axis">Original source distance (m)</p>
        <label className="source-segment-label" htmlFor={`${id}-segment`}>
          Source segment{" "}
          <span>
            {index + 1} → {((index + 1) % data.segments.length) + 1}
          </span>
        </label>
        <input
          id={`${id}-segment`}
          type="range"
          aria-label="Source segment"
          min={1}
          max={data.segments.length}
          step={1}
          value={index + 1}
          aria-valuetext={`Segment ${index + 1} to ${((index + 1) % data.segments.length) + 1}, ${selected.distance.toFixed(2)} metres, grade ${signed(selected.gradePercent)} percent`}
          onChange={(event) => select(Number(event.target.value) - 1)}
        />
        <dl className="source-selected" data-testid="source-segment-data">
          <div>
            <dt>Start distance</dt>
            <dd>{selected.distance.toFixed(2)} m</dd>
          </div>
          <div>
            <dt>Start → end elevation</dt>
            <dd>
              {selected.startElevation.toFixed(2)} →{" "}
              {selected.endElevation.toFixed(2)} m
            </dd>
          </div>
          <div>
            <dt>Segment length</dt>
            <dd>{selected.length.toFixed(2)} m</dd>
          </div>
          <div>
            <dt>Grade</dt>
            <dd>{signed(selected.gradePercent)} %</dd>
          </div>
        </dl>
        <p className="profile-note">
          Select a segment with the slider or plots. This inspects source
          geometry without moving lap playback. Elevation totals are sensitive
          to source noise.
        </p>
        <button
          type="button"
          className="source-profile-export"
          onClick={() => void exportReport()}
        >
          <Download size={13} />
          Export source profile
        </button>
        {exportError && (
          <p className="profile-error" role="alert">
            {exportError}
          </p>
        )}
      </div>
    </Container>
  );
}
