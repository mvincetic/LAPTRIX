# Exact load-extrema inspection

In **Lap Graphs → Loads & elevation**, open **Current-lap extrema** to inspect the
minimum/maximum tyre load and minimum/maximum vertical G over the complete current
lap. Four cards show the sampled value, units, time and solved-line distance.

**Inspect** pauses the existing playback clock, restores the full-lap graph range
and seeks the exact sample time. Displayed seconds/metres are rounded for reading;
the action uses the original full-precision time. This works on either graph axis.
The current graph cursor and numerical values, ghost, audio and other inspectors
continue to consume the same clock.

## Scope and data

The extrema describe the **current lap**, including when native reference curves
are displayed. They cover the **full lap**, including when the graph was showing
one sector. The disclosure explicitly explains that Inspect opens the full-lap
view. Reference selection, pending setup and complete project data remain intact;
these actions make no simulation requests.

The helper scans the existing samples once per completed lap. It retains the exact
sample objects and keeps the earliest sample when values tie, including a duplicate
closing endpoint. Vertical and tyre-load extremes are computed independently: they
need not occur at the same position because gravity and downforce also affect load.
Minimum/maximum vertical G are signed numerical extrema, not inferred corner or
surface classifications.

The disclosure starts collapsed when its graph content mounts. It appears only
for declared complete vertical/load telemetry; legacy current laps cannot acquire
extrema from their reserved zeros. Values retain the graph's G and multiples-of-
weight units with three decimal places. These sampled extrema do not establish
continuous force limits, source accuracy or measured suspension behavior. See
[VERTICAL_LOAD](VERTICAL_LOAD.md) and [ELEVATION_SENSITIVITY](ELEVATION_SENSITIVITY.md).

## Verification

Four TypeScript cases check exact independent extrema, sample identity, full
precision, tied/closing samples, unchanged inputs and explicit unavailability for
legacy, empty or incomplete channels. Two real-browser journeys use a GT current
lap with a Formula reference and pending fuel edits at 1600/390 px. Independent
array extrema supply the expected values; every action pauses playback, restores
the full range and matches the exact plotted coordinate on both axes. Keyboard
disclosure access, collapsing, full project exports, zero extra API requests and
document widths are checked too. The existing legacy-current graph journey checks
that the disclosure is absent.

`node scripts/load-graphs-qa.mjs` also captures expanded extrema alongside the
other graph states at 1600/1280/390 px. It retains the existing layout, cursor,
trace-count, error and project checks. See VALIDATION.md for the final gate record.
Visual capture checks stable document bounds before clipping a page image, avoiding
an element-scroll wait through the live scene. Only standalone captures allow
30 seconds after observed 15-second capture timeouts; browser test and action
deadlines retain their existing values.
