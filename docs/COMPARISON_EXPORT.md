# Exporting a source-aligned comparison

Open **Time Delta → Export full-lap JSON** to download `laptrix-comparison.json`.
The control is available when the current Lap and selected reference share their
declared source fingerprint. It exports the complete lap even when the graph shows
one sector. Export does not seek, pause, change an active loop, run a simulation,
alter pending setup or save the project. Generation happens only on activation.

The `laptrix-comparison-v1` report contains:

- Export time, full-lap scope, source fingerprint and native/timing-only reference kind.
- Explicit source-progress alignment, current-minus-reference delta convention,
  interpolation rules, sample units and lap-time summary units.
- Independent copies of both original **comparison inputs**: the current Lap and
  selected native Lap or timing reference. These retain all supplied vehicle/setup
  snapshots, solver provenance, warnings, alignment arrays and reference metadata.
- A sorted union of both source-progress grids. Each row has `progress`, `current`,
  `reference` and `deltaTime`, retaining knots unique to either input.
- An `availableFields` list for each side, so omitted channels are distinguishable
  from zero values.

These inputs are the completed comparison data, rather than pending setup edits
or the original source-track file. Export project remains the complete workspace
preservation action. The report is an analysis artifact, not a native Lap, timing
reference or portable project accepted by those import controls. Its `inputs`
objects retain the original supported data shapes for separate inspection/reuse.

## Correspondence and values

`prepareTimeComparison` now exposes the source progress and independently matched
reference time it already computes for the plot. The report consumes those exact
points. Each side's channels use the existing telemetry interpolator at that side's
time. Continuous fields are linear; gear, corner ID and sector ID use the preceding
sample until the next knot. Exact endpoints retain the original closing samples.
Each side keeps its own racing-line distance and elapsed time. A reference-only
speed peak survives even when it lies between current-lap samples.

Times are seconds, distances/positions/offsets metres, speed m/s and steering radians.
Throttle and brake remain fractions; RPM remains revolutions per minute. Acceleration
ratios use the development model's `g0 = 9.81 m/s²`; normal load is a ratio to vehicle
weight. Track gradient is rise divided by 3D distance, matching the native telemetry
contract. These are declared canonical units; display conversions such as km/h and
percent are not applied. JSON retains numeric precision rather than plotted rounding.
Plot display-range limits do not remove otherwise valid native values from the
report; field availability describes the stored data and declared vertical model.

A timing-only reference contributes only `{ time }` rows. It never acquires speed,
position, gear or other channels. Historical native inputs without declared vertical
dynamics omit `verticalG` and `normalLoadG` from comparison rows, as the load plots do;
the complete archived input still retains its literal original fields. Missing
provenance stays absent. Matching source declarations establish correspondence, not
independent measurement accuracy or authentication. Interpolation adds no measured
detail, and this export does not calibrate the development physics model.

## Bounds and checks

The existing input boundaries allow up to 2,001 native samples and 20,000 timing
samples. Their union is at most 21,999 rows after shared endpoints are removed.
The maximum-grid regression retains every timing knot and serializes the full
report. Large reports include original inputs as well as derived rows and can be
larger than the files accepted by a reference importer; they are downloaded locally.

Eight unit cases cover independently calculated unequal grids, speed peaks, separate
distances/times, discrete gears, precision/units, timing-only inputs, both legacy
channel directions, snapshot independence, rejected alignment and maximum grids.
Two browser journeys export a GT 5 m lap against its Formula source-grid reference,
then an explicitly downsampled timing fixture. They verify complete input equality,
all source knots, full-lap endpoints and keyboard activation while preserving the
sector, axis, paused cursor, active loop, pending fuel and project, with no new API
request. See VALIDATION.md for the final gates and visual review.
