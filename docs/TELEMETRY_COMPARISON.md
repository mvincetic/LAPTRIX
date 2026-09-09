# Native reference channel comparison

In **Lap Graphs**, enable **Reference traces** to overlay an eligible native LAPTRIX
reference. Seven grey dashed curves share the current lap's speed, throttle, brake,
RPM, gear, lateral-G and elevation rows. Current curves retain their channel colors;
reference cursor readings use an **R** prefix. The selected reference and its
provenance remain identified in Lap Comparison.

## Alignment and units

Comparison matches **source-track position**. It does not match array indices,
raw racing-line distances or elapsed seconds. Both laps must carry the same
declared source fingerprint. Different vehicles, racing lines and sampling grids
are supported. A fingerprint identifies the declared source, not the independent
accuracy or authenticity of imported telemetry.

The plotted positions are the sorted union of both source-progress arrays. At each
position, reference telemetry is interpolated on its own time axis and the plot's
horizontal coordinate is interpolated on the current lap's time or distance axis.
This retains reference events between current samples. Each plot point keeps its
native sample separate from the presentation coordinates; neither Lap is rewritten.

Current and reference share one vertical range per channel. Speed converts m/s to
km/h, throttle and brake convert fractions to percent, and RPM, gear, G and metres
retain their declared units. Both gear curves use horizontal/vertical steps, matching
categorical playback interpolation. Other channels are linear between samples;
extra plotting points do not imply extra measured resolution.

The **Scale** column shows rounded display-domain bounds rather than observed
minimum/maximum samples. Bounds use the row's units, apply to both visible laps
and remain fixed during sector inspection. Signed ranges have a dashed zero guide;
its text is omitted when it would crowd a bound. Elevation zero is the source's
vertical origin, not an assertion of a verified sea-level datum. Very large bounds
use compact scientific notation; hover titles and accessible scale-group labels
retain the exact values. Current colored and **R** readings remain cursor values.

## Cursor and availability

The existing clock supplies the current cursor time. Reference readouts map that
time to source progress, then interpolate the native reference there. Chart seeking,
exact Cursor Data entry, playback, pause and axis changes retain that one clock.
The checkbox is a view preference: it changes neither simulation inputs nor saved
results, references, exports or audio. Its choice survives tab and reference changes
within the mounted workspace and is initially off after a page load.

Timing-only references have no channels; the control is disabled with an explicit
explanation. They still support Time Delta and interval comparisons. Missing or
mismatched native alignment also disables the control. Values that become nonfinite
during display-unit conversion cannot be plotted. These display checks do not
redefine the broader historical Lap import contract or calibrate imported values.

Reference **ghosts** answer a different inspection question: both vehicles are shown
at the same elapsed seconds. Channel graphs compare the same source position. See
[GHOST_PLAYBACK](GHOST_PLAYBACK.md) for current-lap duration and finish holding.

## Verification

Hand-calculated unequal-grid tests preserve a reference-only peak, verify current
plot coordinates and native sample timing, and check cursor interpolation, gear
steps, eligibility and unchanged input data. Plot tests verify shared ranges, units,
step coordinates and finite normalization. Browser journeys independently calculate
all seven readouts from real Formula/GT outputs on different grids, check both axes,
playback, keyboard activation and timing-only replacement with no simulation calls.
Run `node scripts/telemetry-comparison-qa.mjs` for actual workspace, time/distance
overlay and unavailable-state images at 1600, 1280 and 390 px, plus cursor/error and
document-width records in the ignored artifacts directory.
