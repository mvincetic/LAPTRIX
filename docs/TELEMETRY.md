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
when different optimized lines have different lengths. Corner deltas compare the
same entry/exit source-track progress via `alignment`, interpolating the reference
time even when sample counts differ. Detected corner numbering need not be identical.
Baseline and current setup
remain separate; saving a reference is explicit. Exported CSV values retain SI
units, even when the dashboard shows km/h or percentages.

Chart domains derive from the current lap, including negative/high elevations and
different RPM/gear limits. Sector markers use the selected time or distance axis.
Stored references are validated for strict ordering, closed endpoints, sector
partitioning and valid corner indices before use.

Lap-time mode adds `optimization.refinement`: `seedLapTime`, `gainSeconds`,
`evaluations`, `evaluationBudget`, `acceptedSteps`, `rejectedCandidates` and `status`
(`completed` or `seed-infeasible`). Seed time minus final time must equal the gain;
counts cannot exceed the budget. Curvature optimizer convergence and projected
gradient refer to the seed solve; the lap and all telemetry describe the accepted
final trajectory. `numericalChecks` reports speed convergence, maximum integrated
force demand/capacity ratio and tolerance. Both diagnostic blocks are optional in
the reader for compatibility with older saved references. Old saved numerical
results remain literal references and are not silently recalculated.

`sampling` stores actual grid points, original/grid counts, mode, requested and
actual spacing, cap status and interpolation displacement. `alignment` stores a
source fingerprint and a strictly increasing progress array paired with telemetry,
including 0 at the start and 1 at the closing endpoint. Runtime validation checks
array lengths and ordering. These blocks are optional for old exports; new results
always include them. SAMPLING.md describes their geometry and migration contract.

New results include a `vehicle` snapshot with physical parameters and provenance;
its ID must equal `vehicleId`. It is optional when reading old exports. Reference
comparison permits different vehicles on the same source. Results preserve the
snapshot used at calculation time, so later catalog changes cannot rename or
replace those inputs. Setup and vehicle changes are both marked pending until a
new solve succeeds. The reference footer identifies its vehicle and solver mode.
