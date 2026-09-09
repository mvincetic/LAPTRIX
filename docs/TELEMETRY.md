# Telemetry v1

The simulation result contains identity, setup, model label, warnings, optimizer
diagnostics, lap time, racing-line length, summary values, sectors, corners and
`samples`. A 720-point circuit yields 721 samples: the final sample repeats the
start position at full lap time and distance so interpolation and integration cover
the complete seam. Distances and timestamps strictly increase.

| Fields | Units / semantics |
| --- | --- |
| `distance`, `time` | Metres along solved line; seconds from flying-lap start |
| `x`, `y`, `z` | Local metres; y is elevation |
| `speed` | m/s, converted to km/h only in the UI |
| `rpm`, `gear` | Engine revolutions/minute; one-based gear |
| `throttle`, `brake` | Normalized 0–1 requests |
| `steering` | Approximate road-wheel angle in radians |
| `longitudinalG`, `lateralG` | Acceleration / 9.80665; lateral is signed |
| `verticalG` | Reserved zero; vertical dynamics are not solved |
| `trackGradient` | Local rise / segment length |
| `cornerId`, `sectorId` | Zero means no detected corner; sectors start at one |
| `offset` | Metres laterally from centerline |

`interpolate` clamps boundaries, binary-searches time or distance, linearly
interpolates continuous values, and steps discrete gear/corner/sector fields.
Linear playback interpolation is a visual approximation within short samples;
it does not reintegrate or modify the solver's trajectory.

`PlaybackClock` is the only source of playback time. Play, pause, seeking, speed
and looping change this clock. The ghost reads it each 3D frame; graph subscribers
receive approximately 30 Hz updates. After a new simulation the clock resets and
pauses. Elapsed animation steps clamp to 100 ms to prevent hidden-tab jumps.

Comparison uses the same circuit. Sector differences compare the configured sector
fractions. The generic distance comparison helper maps normalized lap progress
when different optimized lines have different lengths. Baseline and current setup
remain separate; saving a reference is explicit. Exported CSV values retain SI
units, even when the dashboard shows km/h or percentages.
