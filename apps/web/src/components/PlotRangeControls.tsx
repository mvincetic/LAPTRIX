import { useId, useRef, useState } from "react";
import type { Lap } from "../../../../packages/shared/schema";
import { createPlotWindow, type PlotTimeRange } from "../plotViewport";

export function PlotRangeControls({
  lap,
  sectorId,
  custom,
  windowRange,
  outside,
  loopLabel,
  loopSelected,
  onSelect,
  onInspectStart,
  onLoopRange,
  onCustom,
}: {
  lap: Lap | null;
  sectorId: number | null;
  custom: boolean;
  windowRange: PlotTimeRange;
  outside: boolean;
  loopLabel: string | null;
  loopSelected: boolean;
  onSelect: (sectorId: number | null) => void;
  onInspectStart: () => void;
  onLoopRange: () => void;
  onCustom: (range: PlotTimeRange) => void;
}) {
  const id = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<{
    lap: Lap;
    start: string;
    end: string;
    error: string;
  } | null>(null);
  const editing = draft?.lap === lap && draft !== null;
  const close = () => {
    setDraft(null);
    editButton.current?.focus();
  };
  return (
    <>
      <div className="plot-range-controls">
        <label htmlFor={id}>Plot range</label>
        <select
          id={id}
          value={custom ? "custom" : (sectorId ?? "all")}
          title={
            custom ? `${windowRange.start}–${windowRange.end} s` : undefined
          }
          disabled={!lap}
          onChange={(event) => {
            if (event.target.value === "custom") return;
            setDraft(null);
            onSelect(
              event.target.value === "all" ? null : Number(event.target.value),
            );
          }}
        >
          <option value="all">Full lap</option>
          {lap?.sectors.map((sector) => (
            <option key={sector.id} value={sector.id}>
              Sector {sector.id}
            </option>
          ))}
          {custom && <option value="custom">Custom window</option>}
        </select>
        <button
          ref={editButton}
          className="text-button"
          disabled={!lap}
          aria-expanded={editing}
          aria-controls={`${id}-window`}
          onClick={() => {
            if (editing) close();
            else if (lap)
              setDraft({
                lap,
                start: String(windowRange.start),
                end: String(windowRange.end),
                error: "",
              });
          }}
        >
          Custom window
        </button>
        {(sectorId !== null || custom) && (
          <>
            <button className="text-button" onClick={onInspectStart}>
              Inspect start
            </button>
            <button
              className="text-button sector-loop-button"
              aria-pressed={loopSelected}
              onClick={onLoopRange}
            >
              {custom ? "Loop window" : "Loop sector"}
            </button>
            <button className="text-button" onClick={() => onSelect(null)}>
              Full lap
            </button>
            {(outside || !loopLabel) && (
              <span className="plot-range-status">
                {outside
                  ? `Cursor outside selected ${custom ? "window" : "sector"}`
                  : "Full-lap playback"}
              </span>
            )}
          </>
        )}
      </div>
      {editing && (
        <form
          id={`${id}-window`}
          className="plot-window-editor"
          aria-label="Custom telemetry window"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const range =
              draft.start.trim() && draft.end.trim() && lap
                ? createPlotWindow(lap, Number(draft.start), Number(draft.end))
                : null;
            if (!range) {
              setDraft({
                ...draft,
                error:
                  "Choose increasing times within this lap, at least 0.001 s apart.",
              });
              return;
            }
            onCustom(range);
            close();
          }}
        >
          <label htmlFor={`${id}-start`}>Window start (s)</label>
          <input
            id={`${id}-start`}
            autoFocus
            type="number"
            step="any"
            min={0}
            max={lap?.lapTime}
            required
            value={draft.start}
            aria-describedby={`${id}-window-help`}
            onChange={(event) =>
              setDraft({ ...draft, start: event.target.value, error: "" })
            }
          />
          <label htmlFor={`${id}-end`}>Window end (s)</label>
          <input
            id={`${id}-end`}
            type="number"
            step="any"
            min={0}
            max={lap?.lapTime}
            required
            value={draft.end}
            aria-describedby={`${id}-window-help`}
            onChange={(event) =>
              setDraft({ ...draft, end: event.target.value, error: "" })
            }
          />
          <button type="submit">Apply window</button>
          <button type="button" className="text-button" onClick={close}>
            Cancel
          </button>
          <span id={`${id}-window-help`}>
            Minimum 0.001 s · zoom uses existing samples. Applying preserves
            playback.
          </span>
          {draft.error && (
            <span className="plot-window-error" role="alert">
              {draft.error}
            </span>
          )}
        </form>
      )}
    </>
  );
}
