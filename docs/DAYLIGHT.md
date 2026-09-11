# Original daylight and vehicle shadows

The dry-day presentation uses a fixed world-space sun, a sky/ground hemisphere
and an original analytic environment. `assets/environment/daylight.json` holds
the authored colours, radiance and resource limits; `apps/web/src/daylight.ts`
builds the runtime data. This is illustrative lighting, independent of geographic
date/time and the simulation's atmospheric inputs. It is not captured circuit
photography or a weather reconstruction.

The environment contains 128×64 linear RGBA float texels (128 KiB of CPU data).
It combines a blue upper sky, a pale horizon, green ground and a broad sun lobe
aligned with the direct light. Horizontal wrapping and linear filtering avoid an
artificial texture boundary. Three creates and caches its filtered reflection map
from this source; no external HDRI, image, service or library is added.

The direct light's direction is fixed at normalized (-8, 18, 7). Its single
1024² shadow map covers a 24×24 m orthographic region around the actual current
vehicle, with 1–80 m depth bounds and a 40 m light offset. This retains centimetre
scale shadow texels without allocating a circuit-sized map. Only the current
vehicle casts a shadow. The native reference remains a comparison overlay; it
receives lighting without darkening the current car or road with a second shadow.
The road, road paint, shoulder and earthworks receive vehicle shadows.

The lighting frame runs after the existing vehicle telemetry frame, reads its
actual world transform and the same PlaybackClock time, and translates the shadow
volume without rotating sunlight. There is no new timer or simulation clock.
Seeking, playback, current-vehicle visibility and a new lap refresh the map.
A dirty map also refreshes its anchor: switching tracks at the same zero clock
time must not retain the previous circuit's shadow target. The browser test first
reproduced this stale-target case, then verifies both source-switch directions.
Paused camera movement reuses it. Graphics restoration explicitly invalidates
the map and the paused canvas. Environment data and materials remain available
for reupload; owned resources are disposed when their viewer ends.

Validation covers bounded radiance, sky orientation, the texture seam, deterministic
generation and shadow projection under a 90 km translation. Browser checks inspect
the actual sun target, current/reference caster flags, retained maps, camera/seek/
playback behavior and complete pending workspace retention. The production check
compares the complete composited paused scene before and after two graphics losses,
including vehicle shading and shadows, without clicking to wake the restored view.

The first version passes graphics recovery but repeatedly exposes a desktop idle
assertion after an orbit drag. Isolated render submissions do not demonstrate a
material-environment penalty, and disabling both new lighting features reproduces
the tail. Frame tracing identifies OrbitControls' fixed per-frame inertia as the
remaining invalidation source: later frames arrive hundreds of milliseconds apart.
Camera decay now preserves its established 0.12 factor at 60 Hz over elapsed frame
time, so slow frames do not prolong inertia. Active dragging retains its existing
input response. The demand test also tracks scheduled/cancelled animation frames:
a 300 ms gap with pending work cannot count as settled. Its original zero-draw,
zero-frame and buffer-retention assertions remain. The corrected six-journey pass
is green; the final independent trace stops rendering at 1.894 seconds after
release and stays silent through its 3.5-second observation.

The full gate passes 309 TypeScript / 152 Python tests, five asset validators and
lint/type/build checks. All 128 final close/onboard/motion views pass across both
cars and circuits. A single-car scene uses nine textures in driving views and ten
with overview apex points. A dirty shadow pass submits at most 56 / 5,406 Formula
draws / triangles or 47 / 4,910 GT draws / triangles; ordinary paused camera changes
reuse that pass. These counts describe resources and submissions, not hardware
frame rate. All 24 final interaction journeys pass in 5.6 minutes and all 34
production journeys pass in 6.3 minutes. See PRODUCT_PRESENTATION.md for the
complete final evidence and reproduction commands.

The asset is original project work governed by the repository's distribution
policy. It adds no third-party content or new licence grant. Circuit source
attribution, geometry, vehicle dimensions and engineering outputs remain intact.
