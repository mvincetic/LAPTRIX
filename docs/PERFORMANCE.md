# Performance

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

Terrain nearest-sample interpolation is generated on track changes only. Large
custom imports and small screens should be profiled before increasing resolution
or tree counts. The current synthetic scenery is intentionally simple. Production
optimization should follow measured frame time, memory and payload regressions.

After exact gear-power evaluation, a local study measured Formula/GT source-grid
curvature runs at 147/139 ms and source-grid refinement at 2.72/2.76 seconds.
Refinement on the 3 m grid took 7.59/7.68 seconds. All six profiles converged with
maximum force-demand ratios within floating-point roundoff of 1.0. These runs
overlapped other validation activity and are observations, not a controlled
performance comparison. Results are retained in `artifacts/exact-power-study.json`.
