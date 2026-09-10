# Explicit sector playback loops

Select a sector with **Plot range**, then enable **Loop sector** to repeat that
sector's calculated telemetry. Selecting a plot range alone retains the current
clock and playback behavior. The loop button has a pressed state and supports
normal keyboard activation. Pressing it again restores full-lap looping.

The persistent strip above transport identifies **Playback loop: Sector N** in
every telemetry tab, including Cursor Data. **Full-lap loop** clears the interval
while retaining the current cursor and play/pause state. The ordinary **Loop
playback** toggle can instead disable looping entirely. Disabling it clears the
selected interval and restores the existing non-looping finish behavior.

Activating a sector loop preserves play/pause state. A paused clock stays paused;
a playing clock continues. A cursor inside the interval stays at its time, while
one outside it moves to the start. An exact end position restarts at the selected
start when Play is pressed. Automatic playback carries any elapsed remainder back
through the interval, respecting the selected rate and multiple crossed cycles.

Seeking inside the interval retains it. Seeking outside restores full-lap looping
and keeps the requested canonical lap position. Exact endpoints remain available
for paused numerical inspection. Restart lap follows that same seek rule: zero is
outside later sectors but remains inside a first-sector loop. Use Full-lap loop to
clear the interval explicitly at either position.

## One clock and unchanged source data

`PlaybackClock` adds an optional readonly `loopRange` snapshot value and
`focusLoop(start, end)`. Bounds must be finite and satisfy
`0 ≤ start < end ≤ duration`; invalid calls preserve the previous snapshot and do
not notify subscribers. The clock continues to use its existing animation-frame
scheduler, elapsed-time clamp, rate and notification interval. No second timer,
alternate Lap or resampled animation path is introduced.

Telemetry memoizes each current sector's time bounds by interpolating its canonical
distance gates. Loop selection is stored only in the clock; the visible sector
label is derived from those bounds. Changing plot sector, graph group, axis or tab
does not replace the active interval. The plotted range can therefore differ from
the repeated sector, and an outside-cursor label retains its existing meaning.

Graphs, reference ghosts, camera and audio consume the same canonical time. Native
reference ghosts still use shared elapsed seconds, while reference curves compare
matched source progress. A repeat jumps back to an earlier point in calculated
telemetry; it does not add a physical transition or change the simulation. Current
and reference data, pending setup and exported project contents stay unchanged.

Configuring a new Lap clears the interval and retains the existing paused/time-zero
reset. A failed calculation keeps the completed Lap and its inspection settings.
The loop is transient and is not added to saved or portable project formats.
Clearing the plotted view alone also leaves playback policy intact.

## Verification and layout

Eight independent clock cases cover activation without autoplay, retained playback,
rate/multiple-cycle remainder, exact boundaries including the first/final sectors,
inside/outside seeks, both ways to clear an interval, new-Lap reset, notifications
and atomic rejection of invalid bounds. Existing full-lap playback, non-looping
finish notification and native-ghost tests remain in the gate.

Desktop and phone browser journeys seek near the second sector's end and observe
two separate real playback crossings, using exported timing as the oracle. Each
crossing retains playback and keeps every observed cursor inside the interval.
They check explicit
activation, keyboard toggling, graph/tab independence, full-lap/disabled looping,
outside seeking, exact project preservation, zero inspection solves and a new
result clearing the interval. These are observed playback transitions; the browser
test does not replace or advance the application's clock.
The original fixture required two complete sectors within a wall-time estimate.
Remote run 34495944339 observed only one wrap before that estimate expired. The
clock deliberately caps each delayed frame to 0.1 seconds, so elapsed wall time
does not guarantee a fixed amount of playback under slow rendering. The revised
fixture tests repeated boundary behavior without a software-renderer speed target;
whole-cycle and multiple-cycle arithmetic remains in deterministic clock tests.
Ordinary assertion/test deadlines, playback code and rendering are unchanged.

`node scripts/sector-loop-qa.mjs` captures GT telemetry with a Formula reference
ghost and load overlays at 1600×1000, 1280×900, 390×844 and 780×390. States cover
load graphs, full-range Time Delta, Cursor Data and a cleared loop, plus a detail
capture of the controls. Bounds, canonical cursor, full project equality and
runtime/WebGL errors are checked. The strip wraps on narrow screens. Expanded
telemetry follows the existing page-scroll layout rather than shrinking plot text;
the pressed control beside Plot range also exposes the active selection.
