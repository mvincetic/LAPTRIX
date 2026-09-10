# Exact telemetry windows

**Custom window** opens a small editor in Lap Graphs or Time Delta. Enter start and
end seconds, then use **Apply window**. The bounds must be finite, ordered, inside
the current lap and at least 0.001 seconds apart. The minimum keeps this inspection
control within the workspace's millisecond time presentation; it is not a claim
that interpolation adds measured or physically accurate detail. Cancel or Escape
keeps the current view. Invalid edits retain the existing view and playback.

The committed endpoints are exact canonical current-lap times. Switching to
Distance maps both through the existing telemetry interpolator, so both axes show
the same lap positions even when speed varies. No endpoint is rounded for storage.
The editor reopens those exact values. Sector options and **Full lap** remain
available, and full-lap channel scales and current/reference SVG paths stay intact.
Only the SVG viewport changes; no samples are inserted or resampled. Native
reference traces still compare source positions and timing-only references still
contribute only comparison time. Reference and complete comparison exports retain
their full-lap scope.

Applying or clearing a window preserves the cursor and play/pause state. A cursor
outside the view is labelled and hidden rather than pinned to the plot edge.
**Inspect start** pauses and seeks the shared clock to the exact start time.
**Loop window** explicitly applies the same endpoints through `clock.focusLoop`;
it has a pressed state and repeats calculated telemetry under the existing loop
rules. Its status persists across graph, axis and tab changes. Choosing another
plot range alone leaves an existing loop intact; Inspect outside it restores
full-lap looping through the ordinary seek behavior. See PLAYBACK_LOOPS.md.

Window/editor state belongs to the completed Lap object and is transient. A new
successful simulation resets it; a failed calculation retains it. It does not
modify project serialization, pending setup, source geometry or the solver.
Windows are increasing intervals within one lap; crossing the start/finish seam
requires inspecting the two portions separately. Sector loops remain available.

## Implementation and verification

`createPlotWindow` validates endpoints and rejects a collapsed distance projection.
`plotViewport` uses those times or mapped distances, retaining canonical path
coordinates. Tick precision follows window width and exact values remain in titles.
Sector annotations are included only when their actual midpoint is inside the
window. The minimum window retains six distinct labels on both axes in the tests.
Both graphs share a visibility decision from the canonical axis position. A
browser regression reproduced an exact start cursor disappearing when Time Delta
converted time to a fraction and back before testing the bounds. That redundant
conversion is removed; Inspect start seeks the stored time directly.

Six independent math cases cover unequal-speed axis conversion, exact boundary
values, invalid/minimum/collapsed windows, pointer clamping, outside cursors, tick
precision and unchanged inputs. Desktop/phone browser journeys cover keyboard
apply/cancel, invalid recovery, unchanged native paths/scales, exact seeking,
observed playback wrapping, separate graph/loop state, tab changes, timing-only
replacement, complete project preservation, no inspection solves and new-Lap reset.
The existing sector-inspection and sector-loop cases remain in the browser gate.

`node scripts/plot-window-qa.mjs` captures the editor, native distance/time curves,
looped Time Delta, the minimum time window and an exact-boundary cursor at
1600×1000, 1280×900, 390×844 and
780×390. It checks control containment, separate ticks, chart height, complete
project and paused cursor preservation, request counts and runtime/console errors.
