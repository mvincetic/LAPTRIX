# Track format v1

Track JSON contains `schemaVersion: 1`, a lowercase hyphenated `id`, `name`,
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
Example: `[0.32, 0.67, 1]`. They partition the solved racing-line distance.

Normalization derives cumulative distance, total length including the seam,
tangents, horizontal lateral normals, boundaries, bounding box and elevation range.
Rendering uses this data, not per-track conditionals. The UI imports JSON through
the actions menu (1.5 MB limit); backend validation remains authoritative.

The API supports custom tracks per request; imports do not modify repository files.
Save persists the selected custom track on this device. Track crossings, road
surface clearance at bridges and geodetic coordinate conversion are not validated.
