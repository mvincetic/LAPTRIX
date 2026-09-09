# Performance

The supplied circuit has 720 unique samples and each lap returns 721 telemetry
samples. The baseline optimizer uses an analytic gradient rather than numerical
finite differences. A 512-point speed/power lookup avoids repeated gear evaluation
inside envelope sweeps. Identical requests use a 24-entry backend LRU cache.

Local initial measurements on the development machine put a noncached solve around
0.6–1.4 seconds after tightening convergence. This is an observation, not a guarantee
or cross-machine benchmark. The tighter criteria reduced the checked start/finish
rotation effect from 87 ms to below 1 ms in predicted lap time.
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
