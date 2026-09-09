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

The Cursor Data tab presents these values numerically with explicit UI units,
including km/h, percentages and road-wheel degrees. Time/distance entry pauses and
seeks the shared clock through this same interpolation. Native number constraints
reject empty, negative and beyond-lap positions; the complete closing endpoint is
accepted. Draft text survives playback updates until Inspect/Enter, Escape, an axis
change or a new result. Gear/corner/sector remain stepped values, zero corner is
shown as None, and reserved vertical dynamics are labelled Not modelled. Numerical
display precision is not an accuracy claim. The playback slider exposes its current
seconds and metres through an accessible value description.

`PlaybackClock` is the only source of playback time. Play, pause, seeking, speed
and looping change this clock. The ghost reads it each 3D frame; graph subscribers
receive approximately 30 Hz updates. After a new simulation the clock resets and
pauses. Elapsed animation steps clamp to 100 ms to prevent hidden-tab jumps.

Comparison uses the same source circuit. Reference sector times interpolate at
the current result's physical gates using source alignment. The distance helper
also uses source progress, with normalized-distance fallback for old native laps
without alignment. Corner deltas compare the
same entry/exit source-track progress via `alignment`, interpolating the reference
time even when sample counts differ. Detected corner numbering need not be identical.
Baseline and current setup
remain separate; saving a reference is explicit. Exported CSV values retain SI
units, even when the dashboard shows km/h or percentages.

Chart domains derive from the current lap, including negative/high elevations and
different RPM/gear limits. Sector markers use the selected time or distance axis.
Stored native references are validated for strict ordering, closed endpoints, sector
partitioning and valid corner indices before use. Timing-only references validate
their separate complete time/progress contract; they carry no invented channels.

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

`Reference` is now a union of native `Lap` and `TimingReference`. The latter carries
explicit seconds/fraction units, declared origin and source description plus paired
time/progress arrays. `parseReference` validates either format. Native reference
imports record `referenceImport.fileName`; API-generated laps omit it. Both formats
restore against the same source identity. See REFERENCE_IMPORT.md for the file
contract and the limits of declared logger alignment.

The Time Delta view prepares both time/progress axes once for each lap/reference.
Its plotted knots are the sorted union of both source-progress grids, retaining
changes between the current simulation's samples. Cursor values interpolate
reference time at the current cursor's source position. Negative means faster,
positive means slower. Both horizontal axes, pointer seeking and the transport
share the existing PlaybackClock. The seven physical channel graphs remain
simulation telemetry; this separate view contains comparison values only.

New results identify `sectorBasis` as `source-progress` for track v2 or
`racing-line-distance` for legacy v1. Every sector also carries its actual source
`startProgress` / `endProgress`, alongside solved distances. Validation requires
these gates to be contiguous, span 0–1 and agree with distance-to-source alignment.
The fields are optional only for older exported laps. Reference comparison still
interpolates at current physical gates, preserving literal old times without
assuming the old sector boundaries match. Track format and Lap schema versions
are separate: the current Lap serialization remains schema version 1.
