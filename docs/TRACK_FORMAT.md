# Track format v2, with v1 compatibility

Track JSON contains `schemaVersion: 2`, a lowercase hyphenated `id`, `name`,
`country`, `provenance`, `synthetic`, `closed: true`, `sectorFractions`, and `points`.
The checked-in development dataset is a complete example. The live JSON Schema is
available at `GET /api/schema/track`.

Coordinates use **metres**, x east, y up, z south, in a local right-handed frame.
Widths are half-widths in metres, measured from centerline to each boundary.
`banking` is radians and reserved: this solver version accepts only zero.

```json
{"x": 120.5, "y": 18.2, "z": -80.0, "widthLeft": 8, "widthRight": 8, "banking": 0}
```

Include 40–2000 distinct ordered samples around a closed circuit, **without**
repeating the first sample at the end. Every adjacent segment, including the seam,
must be 0.1–150 m; the total length must be at most 30 km. Coordinates must stay
within 100 km of the local origin. Widths are 2–40 m per side; the chosen vehicle
also needs lateral safety clearance. Degenerate horizontal frames and gradients
above 30% are rejected. Use reasonably uniform spacing for this curvature baseline.
Optional controlled resampling can normalize spacing without changing the imported
source. It retains narrow widths conservatively and rejects excessive interpolation
displacement. Its effective grid and source alignment are separate Lap metadata;
see SAMPLING.md.
This is not yet a general geospatial import format or a validated road survey.

`sectorFractions` has 2–6 strictly increasing fractions above zero, ending at 1.
Example: `[0.32, 0.67, 1]`. In **v2**, they locate fixed gates along the original
source centerline's closed 3D chord length. The solver maps those source positions
to each solved racing line before integrating sector times. Changing vehicle,
offsets or sampling therefore does not move the gates to a different source
position. The same interpolation defines sector telemetry, tables and graph axes.

**Version 1 remains accepted** and retains its original meaning: fractions of the
solved racing-line distance. Changing only `schemaVersion` from 1 to 2 explicitly
changes sector interpretation; it does not change geometry, speed or total lap
time. New Lap results identify `sectorBasis` and include each sector's actual
`startProgress` / `endProgress`. Older native laps without these fields still load.
The interface labels fixed gates or legacy distance sectors alongside the result.

Source fingerprints remain identical across v1/v2 when coordinates, widths,
banking and fraction values match. They identify source correspondence, not the
whole serialized track or the historical interpretation of sector timing. This
allows legacy references to compare against current physical intervals. Portable
project import checks both fingerprint and track version before reusing a catalog
track, preserving a legacy file's sector meaning under a separate local ID.

Normalization derives cumulative distance, total length including the seam,
tangents, horizontal lateral normals, boundaries, bounding box and elevation range.
Rendering uses this data, not per-track conditionals. The UI imports JSON through
the actions menu (1.5 MB limit); backend validation remains authoritative.

The API supports custom tracks per request; imports do not modify repository files.
Save persists the selected custom track on this device. Expand Track geometry for
source segment contacts and height gaps, with a selectable diagram and local report.
This diagnostic does not change track acceptance or certify road surface clearance
at bridges. Geodetic coordinate conversion remains unimplemented. See
TRACK_DIAGNOSTICS.md for tolerance, pair counts and the bounded-detail contract.

Import validates the file and calculates the selected setup and centerline
reference before adding its ID or changing the current source. If either request
fails, the previous workspace stays intact and the same file/ID can be retried.
Superseded import completions cannot add catalog entries or overwrite newer work.
Switching between loaded tracks likewise activates the new source and both laps
together; Retry remembers a failed target rather than recalculating the old track.
