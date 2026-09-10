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
| `steering` | Schematic plan-view road-wheel angle in radians |
| `longitudinalG`, `lateralG` | Acceleration / 9.80665; lateral is signed and uses horizontal projected speed |
| `verticalG` | With `verticalDynamics`: signed road-normal kinematic acceleration / 9.80665, excluding gravity; legacy laps retain reserved zero |
| `normalLoadG` | Optional positive total tyre contact force / vehicle weight, including gravity, curvature and downforce |
| `trackGradient` | Local rise / 3D outgoing segment length, the sine of slope angle |
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
accepted. Focusing the input captures its value before selection or typing, so
playback cannot overwrite an edit in progress. The draft survives playback and
blur until Inspect/Enter, Escape, an axis change or a new result. Escape captures
the current value again. Gear/corner/sector remain stepped values, zero corner is
shown as None. Declared vertical/load channels show G and multiples of weight to
three decimals; legacy current laps retain Vertical dynamics / Not modelled. Numerical
display precision is not an accuracy claim. The playback slider exposes its current
seconds and metres through an accessible value description.

New laps declare `verticalDynamics: "quasi-steady-road-normal-v1"`, requiring a
positive `normalLoadG` at every sample and a matching
`numericalChecks.minNormalLoadG`. Partial, inconsistent or undeclared load arrays
are rejected. Old native references retain their original data and interpretation.
Optional normal load interpolates only when both endpoints contain it. Vertical G
is neither world-Y acceleration nor suspension travel or accelerometer output.
See VERTICAL_LOAD.md for equations, the road-contact reserve and model bounds.
Lap Graphs exposes these channels through Loads & elevation alongside the original
Overview. It shares source alignment, axes, range and the existing clock, with
per-channel legacy-reference availability and no serialized view state. See
LOAD_GRAPHS.md for display units and scale semantics.
The Current-lap extrema disclosure retains exact source sample objects for minimum/
maximum load and vertical G. Its explicit Inspect actions pause/seek the same clock
and restore the full range; labels and actions remain current-lap data when native
reference overlays are shown. See LOAD_EXTREMA.md.

`PlaybackClock` is the only source of playback time. Play, pause, seeking, speed
and looping change this clock. The ghost reads it each 3D frame; graph subscribers
receive approximately 30 Hz updates. After a new simulation the clock resets and
pauses. Elapsed animation steps clamp to 100 ms to prevent hidden-tab jumps.

Optional native-reference playback also reads this elapsed time, never normalized
progress through each lap. Both ghosts start together, and each interpolates its
own samples. The current lap defines loop duration; a faster reference remains at
its finish after completing, while a slower one can be interrupted by that loop.
Source identity must match and timing-only files cannot supply a reference ghost.
Current-lap audio, camera and telemetry inspection remain on the existing clock.
See GHOST_PLAYBACK.md for rendering, source declarations and finish semantics.

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
Comparison displays use shared signed formatting and semantic tones at their shown
precision: three decimals for seconds, two for percentage change. Values that round
to zero and absent comparisons are neutral; clear negative/positive differences
remain faster/slower. If the entire delta trace rounds to zero, its stroke is
neutral too. This changes presentation only: full-precision comparison values,
path coordinates, axis bounds, seeking and exported samples remain unchanged.
Optional native-reference channel curves now share those graph rows. Their merged
source-progress knots use current-lap plot coordinates while retaining native
sample values and timing separately. Shared ranges and units allow direct channel
comparison; gear is stepped in both curves. The cursor maps current time through
source progress, with no additional playback clock. See TELEMETRY_COMPARISON.md.

New results identify `sectorBasis` as `source-progress` for track v2 or
`racing-line-distance` for legacy v1. Every sector also carries its actual source
`startProgress` / `endProgress`, alongside solved distances. Validation requires
these gates to be contiguous, span 0–1 and agree with distance-to-source alignment.
The fields are optional only for older exported laps. Reference comparison still
interpolates at current physical gates, preserving literal old times without
assuming the old sector boundaries match. Track format and Lap schema versions
are separate: the current Lap serialization remains schema version 1.

Sector-range inspection changes the plot viewport without replacing samples or
resampling either reference. Time bounds use current sector splits; distance bounds
use current gate distances. Both views map local pointer positions back to the
full-lap clock. Outside cursors are labelled and hidden, and full-lap channel scales
remain fixed across range changes. See PLOT_INSPECTION.md.
