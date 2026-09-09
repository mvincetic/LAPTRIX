# Importing comparison references

Use **Additional actions → Import reference JSON**. Importing changes the reference,
not the current solve or playback. Files stay in the browser and are limited to
5 MB. Save explicitly to retain the reference on this device; Export project also
includes it. Invalid data, unsupported units or a different source track preserve
the existing reference and provide an import-specific retry action.

## LAPTRIX simulation export

Use **Export telemetry JSON** in another run, then import that file. It retains
the vehicle snapshot and identifies the imported filename. Current v1 exports
carry their source fingerprint/progress. Older exports can be restored only when
their sample positions and offsets verify against the original source grid.
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
milliseconds, raw GPS coordinates, distance-only CSV and implicit conversion are
not accepted. Label, vehicle label, origin and provenance description are required.

The file producer must map each timestamp to the canonical source track, including
the same start/finish, direction and lap seam. A hash match establishes declared
source identity, **not** the accuracy of a logger's alignment. LAPTRIX does not
currently perform GPS map matching or verify a claimed recording. Imported timing
shows its declared origin, description, sample count and linear interpolation.
Sparse samples can miss braking and corner detail.

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
