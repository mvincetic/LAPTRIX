# Driving overview and telemetry

Chase and Onboard show an original LAPTRIX overlay with a complete north-up
circuit map and the current car's position. Overview/Top View keep their existing
annotations. The overlay yields to the viewer's settings panels and returns when
Track View is selected. It stays inside the native fullscreen element.

The left instruments show km/h, gear, RPM, throttle and brake. The right card
shows elapsed lap time, three sector states and the aligned reference delta.
An active sector counts from the preceding native split. Completed sectors show
the stored sector time; upcoming sectors show a dash rather than a future result.
At the exact split the next sector starts at zero. Finish, reverse seeking and
loop/restart are derived from the current cursor, without retaining timing history.
No ERS, tyre wear, fuel consumption or race-position data is invented.

`DrivingHud` alone subscribes to the existing PlaybackClock. Position and numeric
channels use the shared interpolator. Map geometry comes from the continuous
racing path, fitted once against both source and lap bounds; world north is -Z.
The reference delta uses the existing source-aligned time comparison and is absent
without compatible alignment. The overlay has no timers, simulation calls or
persisted settings, and does not rerender TrackView at playback cadence.

The dark panels retain contrast over road and sky. Narrow scenes use a shorter
map and compact instruments, with labelled throttle/brake meters. Short landscape
fullscreen arranges the map and instruments side by side and omits the secondary
RPM row. The centre of the driving view and camera controls stay clear. Readouts
have no live-region announcements and do not intercept camera gestures.
Ghost name placement treats the three HUD cards as occupied screen space, keeping
visible current/reference names clear of the map, instruments and sector timing.

Validation covers split boundaries, finish rounding, backwards seeks, map fitting
on both circuits, both cameras/vehicles, Play/Pause, fullscreen, and zero new
simulation requests. Visual evidence is under ignored `artifacts/driving-hud-*`.

The full local gate passes: 369 TypeScript tests in 60 files, 178 Python tests,
lint/types, asset reproduction and production build. Twelve development browser
cases cover the HUD, Onboard, scene playback and viewer controls; all pass. The
three HUD cases also pass in the final production build. Twelve captured driving
views span 1600/1280/390/320px and short 780/844px fullscreen. Narrow instruments
were shortened after visual inspection; short-fullscreen timing now clears the
camera actions. Bounds checks confirm no horizontal overflow or control overlap.
