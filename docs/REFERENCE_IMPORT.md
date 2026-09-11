# Importing comparison references

Use **Additional actions → Import reference JSON** for native exports or explicit
timing JSON, or **Import timing CSV** for a reviewed column mapping. Importing changes the reference,
not the current solve or playback. Files stay in the browser and are limited to
5 MB. Save explicitly to retain the reference on this device; Export project also
includes it. Invalid data, unsupported units or a different source track preserve
the existing reference and provide an import-specific retry action.

The most recent reference action takes precedence. A new reference import or
**Set reference** supersedes an earlier pending file read/hash; starting a workspace
calculation invalidates it too. Superseded work cannot change the reference or
publish success/error feedback. A failure of the current import still preserves
the completed reference and offers retry. Reference imports do not pause playback
or trigger a simulation.

## LAPTRIX simulation export

Use **Export telemetry JSON** in another run, then import that file. It retains
the vehicle snapshot and identifies the imported filename. Current v1 exports
carry their source fingerprint/progress. Older unaligned exports can be restored
only when their sample positions and offsets verify against the original source
grid. Historical signed-zero hashes require their original source bytes or a
verified native source grid; see SOURCE_IDENTITY.md. New hashes remain stable when
JSON turns `-0` into `0`, without rounding other geometry.
The reader accepts 41–2,001 simulation samples, including the closed endpoint.
A project export is a bundle; use **Import project JSON** to restore and recalculate
that workspace. To use only its archived lap as a comparison, import its `lap`
object as a separate JSON file, or use Export telemetry JSON directly.

## External timing data

The explicit `laptrix-timing-reference-v1` format carries timing only. It does not
invent missing speed, throttle, brake, position or simulation diagnostics. The
comparison shows total lap, sector and current-corner timing differences. The
current simulation remains the source for the ghost, graphs and audio.
The separate **Time Delta** view compares reference timing along the lap, using
the same cursor and source alignment as the tables. It is available for both native
and external references and retains breakpoints from both sampling grids.
**Export full-lap JSON** in that view preserves the aligned timing comparison and
both original inputs. The resulting comparison report has its own format; use its
original `inputs.reference` object for separate reference reuse, rather than
importing the entire report. See COMPARISON_EXPORT.md.

Use **Export timing reference** to obtain a complete working example from the
current simulation, with its exact track fingerprint. The exported origin is
`external-simulation`, never `recorded`. External loggers can produce this shape:

```json
{
  "format": "laptrix-timing-reference-v1",
  "label": "Session 1, lap 4",
  "vehicleLabel": "My test vehicle",
  "origin": "recorded",
  "source": "Describe the logger, session and how source progress was aligned",
  "trackId": "your-track-id",
  "lapTime": 80,
  "units": { "time": "s", "progress": "fraction" },
  "alignment": {
    "trackFingerprint": "sha256:REPLACE_WITH_THE_EXACT_SOURCE_FINGERPRINT",
    "progress": [0, 0.25, 0.7, 1]
  },
  "samples": [{ "time": 0 }, { "time": 21 }, { "time": 54 }, { "time": 80 }]
}
```

This abbreviated example illustrates the structure, not sufficient measurement
resolution for corner analysis. Supply 2–20,000 paired samples. Time and progress
must strictly increase; time starts at zero and ends at `lapTime`, and progress
starts at zero and ends at one. Seconds and fractional source progress are required;
milliseconds, raw GPS coordinates and implicit conversion are not accepted by the
JSON reader. Label, vehicle label, origin and provenance description are required.

The file producer must map each timestamp to the canonical source track, including
the same start/finish, direction and lap seam. A hash match establishes declared
source identity, **not** the accuracy of a logger's alignment. LAPTRIX does not
currently perform GPS map matching or verify a claimed recording. Imported timing
shows its declared origin, description, sample count and linear interpolation.
Sparse samples can miss braking and corner detail.

## Reviewed timing CSV

**Import timing CSV** accepts a comma-separated header and 2–20,000 complete-lap
records, limited to 5 MB. Choose distinct time and source-progress columns, then
explicitly select seconds/milliseconds and fraction/percent. Only the example's
exact `time_s` and `source_progress` headers are preselected, with seconds/fraction.
Other headers require a column choice. Review the converted first/final records,
record count and lap duration before importing. Extra columns are ignored.

Time and progress must be finite decimal or scientific-notation numbers, strictly
increasing in file order. They start at zero; final progress is one after conversion.
Lap time cannot exceed 86,400 seconds. Formulas, hexadecimal values, blank numeric
cells, duplicate positions, sorting, implicit offsets and raw-distance normalization
are unsupported. Prepare GPS/distance alignment outside LAPTRIX first.

Enter the reference/vehicle labels, declared origin and provenance, including how
progress was aligned. Confirm the displayed source's start/finish and direction.
LAPTRIX stamps that source's actual fingerprint and validates the existing timing
reference contract. This declaration establishes which source you intended; it
does not authenticate a recording or independently verify alignment.

The parser supports quoted commas/newlines and doubled quotes as described in
[RFC 4180](https://www.rfc-editor.org/info/rfc4180/), plus UTF-8 BOM, LF and CR line
endings. Headers must be nonempty and unique after trimming (2–64 columns, each
header at most 100 characters). Every record must have the header's column count;
fields are limited to 100,000 characters. Malformed quoting and interior blank
records are rejected. CSV parsing is local and does not execute cell contents.

**Download simulated CSV example** uses the current calculated lap's exact times
and source progress. It is original simulated data, not a measured recording.
The imported result is the same timing-only reference used by JSON import, so Save,
portable projects, Time Delta and comparison exports work without a new format.
No reference ghost or unavailable telemetry channels are fabricated.

Cancel or Escape closes the dialog and restores focus to Additional actions.
Selecting another CSV terminates the previous file's background review. Parsing
and column conversion run locally in a dedicated worker; ignored raw columns stay
there. Changing columns or units clears the old preview and shows **Preparing
preview…** until the new selection validates. Import stays unavailable while it
is pending. A worker startup failure reports a local error; choose the file again
to retry. Cancel remains available during processing.
Closing the review, a new
JSON reference, Set reference or a workspace calculation invalidates a pending
CSV import. Parsing errors stay in the dialog; the completed workspace remains.

## Physical comparison intervals

Corner reference times interpolate at the current corner's source entry/exit
progress. Sector reference times now also interpolate at the current result's
physical gates. Track v2 defines fixed gates on original source progress; legacy
track v1 retains racing-line-distance fractions. In both cases, the reference
interval maps to the current gate's source positions. This avoids comparing different physical intervals across cars
or grids and keeps the reference sector durations summing to its full lap time.
Stored timing values are never recalculated by the simulation solver. Legacy
references without alignment use their original sector durations until a valid
source-position migration is possible.

Eligible native references can also supply optional **Reference traces** in Lap
Graphs. Channels compare the same source position on current-lap axes and share
display units/ranges; timing-only files cannot provide them. This differs from
shared-elapsed-time ghost comparison. See TELEMETRY_COMPARISON.md.
