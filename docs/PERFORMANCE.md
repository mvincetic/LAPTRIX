# Performance

The supplied circuit has 720 unique samples and each lap returns 721 telemetry
samples. The baseline optimizer uses an analytic gradient rather than numerical
finite differences. A 512-point speed/power lookup avoids repeated gear evaluation
inside envelope sweeps. Identical requests use a 24-entry backend LRU cache.

Local initial measurements on the development machine put a noncached solve around
0.5–0.8 seconds. This is an observation, not a guarantee or cross-machine benchmark.
API payloads include the full solved lap once per run, not every animation frame.

Geometry and chart paths are memoized on data changes. The ghost updates one group
transform; trees use one instanced draw. Renderer pixel ratio is limited to 1.5.
The top-level React app does not subscribe to playback frames. Chart subscribers
update around 30 Hz; the scene reads the same clock per frame.

Terrain nearest-sample interpolation is generated on track changes only. Large
custom imports and small screens should be profiled before increasing resolution
or tree counts. The current synthetic scenery is intentionally simple. Production
optimization should follow measured frame time, memory and payload regressions.
