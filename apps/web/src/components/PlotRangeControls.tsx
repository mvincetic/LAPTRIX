import { useId } from "react";
import type { Lap } from "../../../../packages/shared/schema";

export function PlotRangeControls({
  lap,
  sectorId,
  outside,
  loopLabel,
  loopSelected,
  onSelect,
  onInspectStart,
  onLoopSector,
}: {
  lap: Lap | null;
  sectorId: number | null;
  outside: boolean;
  loopLabel: string | null;
  loopSelected: boolean;
  onSelect: (sectorId: number | null) => void;
  onInspectStart: () => void;
  onLoopSector: () => void;
}) {
  const id = useId();
  return (
    <div className="plot-range-controls">
      <label htmlFor={id}>Plot range</label>
      <select
        id={id}
        value={sectorId ?? "all"}
        disabled={!lap}
        onChange={(event) =>
          onSelect(
            event.target.value === "all" ? null : Number(event.target.value),
          )
        }
      >
        <option value="all">Full lap</option>
        {lap?.sectors.map((sector) => (
          <option key={sector.id} value={sector.id}>
            Sector {sector.id}
          </option>
        ))}
      </select>
      {sectorId !== null && (
        <>
          <button className="text-button" onClick={onInspectStart}>
            Inspect start
          </button>
          <button
            className="text-button sector-loop-button"
            aria-pressed={loopSelected}
            onClick={onLoopSector}
          >
            Loop sector
          </button>
          <button className="text-button" onClick={() => onSelect(null)}>
            Full lap
          </button>
          {(outside || !loopLabel) && (
            <span className="plot-range-status">
              {outside ? "Cursor outside selected sector" : "Full-lap playback"}
            </span>
          )}
        </>
      )}
    </div>
  );
}
