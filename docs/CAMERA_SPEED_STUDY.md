# Driving-camera study — 2026-09-21

After the continuous turn-in repair at `f8ab1ab`, compare the existing cameras
against two presentation-only prototypes in Red Bull Ring's finish–T1 slice.
Each uses the same optimized Formula/GT laps, native positions and PlaybackClock.
No solver, track, vehicle, rig, surface or asset changes are involved.

## Selection

The study compares the existing Chase 58° / Onboard 60° vertical fields of view,
a wider 64° / 66° pair with unchanged mounts, and that wider pair with a lower,
closer Chase position. The wider-only Chase makes the car 11.3% smaller in both
projected dimensions. The lower/closer option preserves its projected width
within −1.9% to +3.6% of the baseline across the twelve inspected Chase states;
height decreases 3.4–6.8% as less roof is visible. It is the selected candidate.

The lower perspective gives the GT's rear and the Formula's silhouette more
presence while retaining lateral road cues. The wider Onboard view reveals more
bodywork and road periphery with the original physical mount. This is an
editorial visual choice, not a measured human speed-perception result.

| Parameter | Previous | Selected |
| --- | --- | --- |
| Chase vertical FOV | 58° | 64° |
| Follow distance | `4.5 + 1.3 × wheelbase` | `4 + 1.2 × wheelbase` |
| Height above current sample | `1.7 + 0.25 × wheelbase` | `1.25 + 0.22 × wheelbase` |
| Minimum height above rear sample | 1.9 m | 1.5 m |
| Onboard vertical FOV | 60° | 66° |

The existing vehicle-surface lift is added to both height terms. Follow distance
still caps at 8% of lap length; the forward target, 12% target blend, portrait
retreat, near planes and original Onboard mounts are unchanged. All poses remain
deterministic through seeking, pausing and rate changes. There is no animated
zoom, shake, artificial speed multiplier or second clock.

## Prototype evidence

The read-only browser study substitutes camera modules in isolated test pages.
It records 72 static states and 24 actual Play sequences, with 72 moving captures
and six videos. Each variant covers both cars, 1600/390 px widths and Chase/
Onboard at high speed, brake onset and the T1 apex. The native peak speeds are
309.39 km/h for Formula and 246.84 km/h for GT. These are development-model values.

All 36 Chase states retain every actual vehicle vertex inside the frame. A
downward ray to the rendered road measures at least 2.074 m clearance in the
selected twelve Chase states. This is a sampled check, not a collision guarantee
around arbitrary imported circuits. Authoritative lap-content hashes match
between variants. No extra solves or runtime errors occur.
The identified renderer is an RTX 3060 Ti through ANGLE/Direct3D11. Maximum
recorded static render cost stays at 77 calls and 561,840 submitted triangles
across all three variants. This does not establish software-renderer or sustained
lap performance.

Evidence lives under ignored `artifacts/camera-speed-study/`, including the
comparison script/JSON, event metadata, frame streams, screenshots and recordings.
The integrated application, without substituted modules, matches all 24 selected
static camera positions, fields of view and actual vehicle projections exactly.
Eight further Play sequences preserve lap hashes with no extra solves or runtime
errors. These 48 integrated static/moving captures, recordings and frame streams
live under `artifacts/camera-speed-integrated/`.

The full quality gate passes 360 TypeScript / 178 Python tests (46.56 seconds),
lint/types, eleven asset packages, source-context reproduction and build (870 ms).
Existing analytical camera checks retain physical distance, deterministic seeks,
finish continuity, translated sources and complete car projection through tight
hairpins at four aspect ratios. Seventeen affected browser journeys pass in
7.5 minutes, including the partitioned brake-light matrix, actual camera/north
alignment, both vehicles/tracks Onboard, portrait hairpins, playback entry and
fullscreen completion. Four further complete 1× laps in 390 px portrait fullscreen
inspect 19,728 presented frames, with no clipped body bounds or runtime errors.
Maximum horizontal normalized bounds improve from 0.740/0.802 to 0.722/0.783 on
Red Bull Ring (Formula/GT) and from 0.643/0.689 to 0.628/0.677 on the Dev Track.
Finish and widest-view captures are retained as `artifacts/camera-speed-chase-*`.
Exact-revision CI results are available in the
[working-branch runs](https://github.com/mvincetic/LAPTRIX/actions?query=branch%3Acodex%2Fautonomous-mvp).

## Remaining limits

The source racing line is still piecewise linear, scenery is approximate and the
previous software-renderer performance limit remains open. Fixed-FOV presentation
does not create suspension dynamics or surveyed camera mounts. Broader circuit
construction remains paused while the existing slice is assessed.
