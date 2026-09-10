import { useMemo } from "react";
import type { Lap } from "../../../../packages/shared/schema";
import { formatTime } from "../../../../packages/telemetry";
import { loadExtrema } from "../loadExtrema";
import "./load-extrema.css";

export function LoadExtrema({
  lap,
  onInspect,
}: {
  lap: Lap | null;
  onInspect: (time: number) => void;
}) {
  const extrema = useMemo(() => loadExtrema(lap), [lap]);
  if (!extrema.length) return null;
  return (
    <details className="load-extrema">
      <summary>
        Current-lap extrema <span>Full lap</span>
      </summary>
      <p>
        Inspect pauses playback and opens the full-lap graph at the sampled
        extreme. Equal values use the first sample.
      </p>
      <div className="load-extrema-grid">
        {extrema.map((extreme) => (
          <div key={extreme.id} data-testid={`load-extreme-${extreme.id}`}>
            <span>{extreme.label}</span>
            <strong>
              {Number(extreme.value.toFixed(3)).toFixed(3)}{" "}
              <small>{extreme.unit}</small>
            </strong>
            <small>
              {formatTime(extreme.sample.time)} ·{" "}
              {extreme.sample.distance.toFixed(1)} m
            </small>
            <button
              className="text-button"
              aria-label={`Inspect ${extreme.label.toLowerCase()}`}
              onClick={() => onInspect(extreme.sample.time)}
            >
              Inspect →
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
