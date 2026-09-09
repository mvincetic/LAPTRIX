# Performance

The supplied circuit has 720 unique samples and each lap returns 721 telemetry
samples. The baseline optimizer uses a sparse quadratic and active-set linear solves
rather than numerical finite differences. A 512-point speed/power lookup avoids repeated gear evaluation
inside envelope sweeps. Identical requests use a 24-entry backend LRU cache.

The 2026-09-09 grid study measured about 0.13 seconds for the 720-point curvature
solve and 2.47 seconds including its optional 78-candidate lap-time search. At 2,000
points the respective times were about 0.56 and 7.35 seconds. These are observations,
not latency guarantees; see SOLVER_STUDY.md. The prior L-BFGS-B seed took roughly
0.6–1.4 seconds at 720 points and could hit its iteration cap at higher resolution.
The sparse solve converged at every studied resolution and the new candidate order
is independent of the canonical start sample. Demanding imported geometry and
concurrent requests can cost more; the API remains a local synchronous worker.
API payloads include the full solved lap once per run, not every animation frame.

Geometry and chart paths are memoized on data changes. The ghost updates one group
transform; trees use one instanced draw. Renderer pixel ratio is limited to 1.5.
The top-level React app does not subscribe to playback frames. Chart subscribers
update around 30 Hz during playback and on explicit controls; the scene reads the
same clock per frame. Paused playback does not repeatedly notify React subscribers.

Terrain nearest-sample interpolation is generated on track changes only. Large
custom imports and small screens should be profiled before increasing resolution
or tree counts. The current synthetic scenery is intentionally simple. Production
optimization should follow measured frame time, memory and payload regressions.
