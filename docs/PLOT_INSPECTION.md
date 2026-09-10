# Sector-focused graph inspection

**Plot range** selects the full lap or one current-lap sector in Lap Graphs and
Time Delta. Selecting a range changes the horizontal view only. The current
cursor, play/pause state, reference choice, channel scales and setup remain intact.
Both views retain the same selected sector across axis and tab changes.
Overview and Loads & elevation also share this range. Changing graph channels
retains the cursor and sector, with full-lap scales for the selected group.

**Inspect start** pauses and seeks the existing clock to the selected sector's
start. **Full lap** restores the complete view without moving that clock. The
Sector Analysis action **Inspect sector** pauses at that sector's start, opens
Lap Graphs at its range and focuses the Lap Graphs tab for keyboard continuity.
The Current-lap extrema disclosure in Loads & elevation deliberately restores Full
lap when inspecting one of its global sampled extrema, making that event visible.
It pauses at the original exact sample time. See LOAD_EXTREMA.md.

Playback covers the entire current lap unless **Loop sector** is explicitly
enabled. This separate toggle repeats the selected sector through the same clock;
its persistent strip identifies the active loop even after plot/tab changes.
See PLAYBACK_LOOPS.md for activation, clearing and boundary behavior.
If the cursor is outside the chosen
sector, a text label says so and the graph hides its cursor marker; it does not pin
the marker to an edge or change playback policy. Numerical values still
describe the shared cursor. Pointer seeking maps the local plot position into the
selected time/distance interval, then uses the existing full-lap clock mapping.

## Data and rendering

`plotViewport` derives bounds from the completed lap's sector start/end distances
or split times. Full-lap SVG coordinates and paths remain intact. A changed viewBox
clips and magnifies those paths, preserving current and reference sample grids,
gear steps and interpolated boundary segments without constructing another Lap.
Native-reference source-position alignment and timing-reference delta calculations
retain their existing semantics. Vertical scales remain those of the full lap and
eligible reference, so changing sectors does not silently change channel scale.
The Scale column exposes these full-lap display limits. Signed zero guides use the
same vertical mapping as the curves and remain aligned while the horizontal view
changes between full-lap/sector and time/distance axes.

Horizontal tick labels and sector annotations use ordinary layout text; line
strokes retain their display width under zoom. Controls belong to their labelled
tab panels. A view choice belongs to the current Lap object: failed calculations
retain it, and successful new results return to full-lap view. This transient view
preference is not serialized into saved projects or simulation exports.

## Verification and limits

Hand-calculated unequal time/distance sector gates test viewport geometry, local
pointer-to-lap mapping, unclamped outside-cursor positions, full-lap fallback and
unchanged input data. Browser journeys inspect real source/5 m reference comparisons,
unchanged path strings, projected cursor position, timing-only replacement, exact
sector entry, keyboard focus, pending setup retention and failed/successful reruns.
The native transport range input rounds to its 0.01-second step; exact-seek checks
use the plotted clock position rather than that rounded control value.

Run `node scripts/plot-range-qa.mjs` for workspace, outside-cursor, channel-range and
timing-delta screenshots at 1600/1280/390 px, with axis, cursor, runtime-error and
document-width records. Zoom exposes existing sampled detail; it does not improve
source resolution, numerical accuracy or real-world calibration. Arbitrary range
selection is not implemented. Explicit sector loops repeat existing telemetry;
they do not construct new timing or physical transitions.
