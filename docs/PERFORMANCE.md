# Performance

The shared clock now sleeps while paused, including new-Lap reset and non-looping
completion. Both widths previously executed 32 animation callbacks in a half-second
despite zero WebGL draws; the strengthened settled-workspace tests now require zero
callbacks and draws. Active playback retains the same rate, delayed-frame cap and
notification cadence. This measures browser animation work, not battery life or
all browser/audio processing. Entry JavaScript is 426.91 kB (129.09 kB gzip); main
CSS is 55.97 kB (11.76 kB gzip) and deferred viewer JavaScript is 966.27 kB
(259.05 kB gzip). Fullscreen recovery stays in that deferred viewer, with 1.00 kB
viewer CSS (0.47 kB gzip). See RENDERING.md for lifecycle and resume behavior.
The track key observes only a compact-scene predicate and reuses existing layout
invalidation after a toggle. Both idle browser checks still require zero settled
frames and draws after expanding and collapsing it. See TRACK_KEY.md.
Stable shoulder widths also remove three unchanged buffer deletions and 51,840
bytes of repeated uploads per measured source-grid interaction. The settled probe
now records zero uploads/deletions for pending fuel, key, tab and Top View changes
at desktop/phone widths. This measures avoided work, not a device-wide speedup.
Custom graph windows retain memoized full-lap curves and scales, changing only the
viewport and labels. Exact axis bounds are derived only when lap/range/axis changes;
the editor and window loop add no timer, solve or sample generation. See
CUSTOM_WINDOWS.md.

Timing CSV adds bounded local parsing and a native review dialog. Conversion is
memoized by parsed table and column/unit selection; editing provenance or playback
does not repeat it. File size, rows, columns and individual fields have explicit
limits. Only first/final records are rendered, and applying a reference performs
one source fingerprint with no simulation request. These bounds are not a device
responsiveness guarantee for every file within the limits.

Comparison export brings the entry to 411.71 kB JavaScript (124.93 kB gzip), with
51.73 kB main CSS (11.09 kB gzip). The deferred viewer remains 962.28 kB (257.66 kB
gzip), with 0.53 kB viewer CSS. Report generation runs only on explicit download,
reusing the existing merged source grid and channel interpolation. The maximum
native/timing case retains all 21,999 possible rows and serializes successfully;
this is a bounded correctness check, not a device-specific latency guarantee.
The QA source-grid reports are about 2.34 MB for native and 1.34 MB for timing-only
references, including original inputs and indented JSON. No additional solve,
clock or continuous computation is introduced.

Ghost-name placement keeps the entry at 409.90 kB JavaScript (124.36 kB gzip) and
main CSS at 51.51 kB (11.05 kB gzip). The deferred viewer is 962.28 kB (257.66 kB
gzip), with 0.53 kB deferred CSS (0.25 kB gzip). Two bounded label searches run
after the existing frame's HTML updates. Static obstacle bounds are reused while
only vehicles move; unchanged anchors/layout return early. The subscription is
cleaned up on changes/unmount and adds no scheduler. Both desktop/phone demand
tests retain zero settled WebGL draws with reference names enabled.

Explicit sector looping brings the entry to 409.90 kB JavaScript (124.36 kB gzip)
and main CSS to 51.51 kB (11.05 kB gzip). The deferred viewer remains 958.27 kB
(256.61 kB gzip). Sector time bounds are memoized per Lap; repeating uses the
existing clock and its notification cadence, with no additional scheduler or solve.

Closed corner windows bring the entry to 408.29 kB JavaScript (123.93 kB gzip).
The deferred viewer remains 958.27 kB (256.61 kB gzip), with 51.08 kB main CSS
(10.98 kB gzip). Event extraction reuses the solved profile; each entry/exit search
is bounded to n/12 samples and the brake-to-exit sequence to less than one lap.
Inspection and reference timing add no solve, renderer or clock.

Sampled source-curvature inspection brings the entry to 407.30 kB JavaScript
(123.61 kB gzip). Its bounded O(n) scan
is memoized on original source changes and adds no timer or simulation call.
The deferred viewer remains 958.27 kB (256.62 kB gzip). These are local build
figures; source validity and reconstruction limits remain separate concerns.

The graphics-restoration listener brings the deferred viewer to 958.27 kB
(256.61 kB gzip); the entry remains 405.50 kB (123.06 kB gzip). The listener requests
a frame on restoration and adds no polling or renderer instance. See RENDERING.md.

The demand-rendering update keeps the initial JavaScript at 405.50 kB (123.06 kB
gzip); the deferred viewer is 958.10 kB (256.57 kB gzip). A settled paused scene
issues no new WebGL draw calls in the desktop/phone regression's observation
windows, while playback, seeking and camera interaction wake rendering. Geometry,
resolution and the existing playback scheduler remain intact. This is an idle-work
measurement, not a hardware frame-rate or battery-life claim. See RENDERING.md.

The load-extrema disclosure brings the entry to 405.48 kB JavaScript (123.06 kB
gzip). Its four extrema are scanned once per current Lap and retain exact sample
objects; the disclosure adds no timer or solver work. The separate viewer remains
unchanged. These are local production build figures, not performance guarantees.

Loads & elevation brings the entry to 403.77 kB JavaScript (122.60 kB gzip) and
main CSS to 50.14 kB (10.80 kB gzip). The deferred viewer remains 957.77 kB
(256.45 kB gzip), plus its 0.26 kB CSS. Channel availability, shared ranges and
paths are memoized on data, group and axis changes; playback only updates cursor
readouts. The additional view uses the existing seven-row SVG, interpolation and
clock, with no simulation calls or new dependencies. These are local build sizes,
not network-latency or frame-rate guarantees.

The corner-callout update keeps the layout/projector in the deferred viewer chunk:
957.77 kB JavaScript (256.45 kB gzip) plus 0.26 kB CSS (0.17 kB gzip). The entry is
400.57 kB (121.66 kB gzip). Only camera/projection/viewport/event or relevant UI
changes trigger projection and occupied-rectangle measurement; stable frames reuse
the result. Free-space search considers at most 64 horizontal positions with one
nearest free vertical position per column. There are at most three event controls and no additional
playback timer. These bundle figures are from the final local production build.

At the vertical-load milestone, the production entry is 400.41 kB (121.55 kB gzip),
the separately loaded viewer 953.50 kB (254.82 kB gzip), and CSS 49.80 kB (10.74 kB
gzip). Curvature and normal load are computed once per speed envelope and exported
with the Lap; inspection uses the existing clock and interpolation. The latest
Formula/GT sampling studies ran concurrently, so their observed 4.6/7.4–7.5/12.7–12.8 s
refinement times at source/5 m/3 m are not controlled performance comparisons.
See SOLVER_STUDY.md for exact numerical outputs and runtime provenance. Earlier
measurements below describe their respective historical milestones.

The engineering UI loads independently of the WebGL viewer. At the viewer-split
milestone the entry fell from 1,301.15 kB (359.50 kB gzip) to 352.57 kB (107.31 kB
gzip). With source geometry inspection it is about 359.18 kB (109.60 kB gzip).
A separate 950.27 kB viewer chunk (253.46 kB gzip) loads when its panel mounts.
This is a smaller initial dependency, not a reduction of the full viewer download.
The settings, solver calls and telemetry work while the viewer loads or fails.
Both delayed and failed module delivery are exercised against development and
production-preview servers. The chunk-size warning no longer fires.
Source geometry diagnostics memoize a full bounded pair scan on original points.
The 2,000-point maximum considers 1,999,000 pairs with bounding-box rejection;
retained contact details are capped at 100 while all summary counts remain complete.

Time-delta comparison memoizes source/time axes and the union of source-progress
knots when the current lap or reference changes. Its path is memoized separately
for each selected horizontal axis; playback updates only the readout/cursor. A
20,000-point imported timing file can contribute its own breakpoints instead of
being reduced to the simulation grid. Interpolation uses binary searches.
Native channel overlays similarly memoize merged progress knots, native samples,
shared channel ranges and both sets of paths. Playback maps only its current cursor
through prepared axes; it does not remap the full reference array each frame.
Sector inspection reuses the same paths and changes only SVG viewport bounds,
constant-size grid/label elements and local pointer mapping. It adds no data-grid
reconstruction, alternate lap or second playback clock.

The supplied circuit has 720 unique samples and each lap returns 721 telemetry
samples. The baseline optimizer uses a sparse quadratic and active-set linear solves
rather than numerical finite differences. Scalar gear evaluation uses precomputed
piecewise-linear RPM slopes and binary interval searches. This replaced the
512-point maximum-power lookup after it overstated power across gear redlines.
Identical requests use a 24-entry backend LRU cache.

The 2026-09-09 grid study measured about 0.13 seconds for the 720-point curvature
solve and 2.47 seconds including its optional 78-candidate lap-time search. At 2,000
points the respective times were about 0.56 and 7.35 seconds. These are observations,
not latency guarantees; see SOLVER_STUDY.md. The prior L-BFGS-B seed took roughly
0.6–1.4 seconds at 720 points and could hit its iteration cap at higher resolution.
The sparse solve converged at every studied resolution and the new candidate order
is independent of the canonical start sample. Demanding imported geometry and
concurrent requests can cost more; the API remains a local synchronous worker.
API payloads include the full solved lap once per run, not every animation frame.
Controlled resampling adds effective track points and a source-progress array to
the response. The 5 m (1,121 point) run measured about 0.29 seconds for curvature
and 3.96 seconds with refinement; the 3 m (1,869 point) run measured about 0.55 and
6.44 seconds. Effective rendering geometry is memoized so ordinary setup edits do
not rebuild it. Measurements remain machine/load dependent.

Geometry and chart paths are memoized on data changes. The ghost updates one group
transform; trees use one instanced draw. Renderer pixel ratio is limited to 1.5.
The top-level React app does not subscribe to playback frames. Chart subscribers
update around 30 Hz during playback and on explicit controls; the scene reads the
same clock per frame. Paused playback does not repeatedly notify React subscribers.

Terrain source-segment interpolation and road-clearance caps are generated on
track changes only. The fixed 8,991-vertex grid, 17,600 triangles and 4,200 tree
candidates keep output bounded. Its separate Landscape component stays deferred,
and ordinary setup/viewer changes retain the memoized result.

An original circle measured pure terrain construction at 7.6–10.6 ms for 40 source
points, 56.0–64.2 ms for 720 and 141.5–170.8 ms for 2,000 in the local browser
(three runs each). These observations exclude GPU upload and material creation,
and do not establish a timing guarantee. See `artifacts/terrain-timing.json`.
Large custom imports and small screens should be profiled before increasing resolution
or tree counts. The current synthetic scenery is intentionally simple. Production
optimization should follow measured frame time, memory and payload regressions.

After exact gear-power evaluation, a local study measured Formula/GT source-grid
curvature runs at 147/139 ms and source-grid refinement at 2.72/2.76 seconds.
Refinement on the 3 m grid took 7.59/7.68 seconds. All six profiles converged with
maximum force-demand ratios within floating-point roundoff of 1.0. These runs
overlapped other validation activity and are observations, not a controlled
performance comparison. Results are retained in `artifacts/exact-power-study.json`.
