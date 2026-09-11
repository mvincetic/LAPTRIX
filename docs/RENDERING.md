# Rendering when the scene changes

The premium grounding pass retains the same draw-call structure while subdividing
road cross-sections at three-metre gates and separating shoulders outside the
asphalt. Actual first-frame probes retain 67 Formula / 51 GT draws and submit
72,968–79,332 triangles across the two bundled circuits/vehicles. The extra static
geometry prevents coarse-surface intersections; memoization and zero settled
draw/RAF checks remain intact. See PRODUCT_PRESENTATION.md for matched before/after
counts and source/viewport verification. These are not hardware FPS measurements.

The viewer uses React Three Fiber's demand frame loop. Once a paused camera settles,
it stops submitting repeated WebGL draws. Playback, seeking, camera movement,
resizing and scene changes still request frames at the same geometry and resolution.
The renderer does not introduce its own simulation time.

`PlaybackFrames` subscribes to the existing `PlaybackClock` and invalidates the
scene after clock actions. While playback is active, its existing Fiber frame
callback requests another frame. Pausing or reaching a non-looping finish lets
that chain settle. The subscription is removed when the component unmounts.
The shared clock retains its interpolation and notification cadence. A non-looping
finish now always publishes its final stopped state, including when it falls inside the
normal 30 Hz notification interval. Previously the snapshot could stop at the finish
while subscribers retained the previous playing state. A deterministic frame test
reproduces that boundary and checks that subsequent idle frames stay silent.

Drei's installed OrbitControls implementation invalidates on camera changes,
including damping updates. Camera fitting/reset explicitly requests a frame after
applying its pose. Fiber also handles scene-property and canvas-size changes.
No polling timer, second clock, lower-resolution mode or renderer recreation is
introduced.

Road-shoulder width arrays now share the track-keyed memo already used for asphalt.
Previously, inline array creation defeated Ribbon's geometry memo on unrelated
renders. A desktop/phone WebGL probe measured three buffer deletions and three
uploads totalling 51,840 bytes after each pending-fuel edit, key toggle, viewer tab
and Top View change. The mesh dimensions and contents did not change. Existing
browser checks now count actual buffer allocation/deletion as well as draws and
frames, requiring unchanged buffers after pending edits and key toggles. A new
track still creates fresh width arrays and follows normal geometry disposal.

## Shared clock lifetime

`PlaybackClock` now schedules animation callbacks only while playing and owned by
an active `start()` registration. Pausing, configuring a new Lap, reaching a
non-looping finish or releasing the last owner cancels pending work. Multiple
registrations share one callback chain, and each cleanup is idempotent. The
application's existing effect still owns this same clock.

Play wakes the chain. The first resumed callback establishes a fresh timestamp;
time spent paused or unmounted is not added to playback. Nullable frame/timestamp
state also handles a valid zero request ID or zero timestamp. Subsequent callbacks
retain the existing 0.1-second delayed-frame cap and selected rate. Ordinary
notifications stay at approximately 30 Hz, and a non-looping finish always emits.
A listener that pauses or releases the clock during notification cannot leave a
new callback chain behind. Seek/rate/loop actions while paused still notify their
consumers and can wake the demand viewer without starting clock advancement.

The preceding implementation already stopped WebGL draws while paused but still
executed 32 animation callbacks in a measured half-second at both desktop and
phone widths. The strengthened browser checks fail before this change and require
zero callbacks as well as zero draws after settling. They retain reference names,
seeking, playback, camera changes, orbit/reset and non-looping completion. Seven
deterministic scheduling cases cover idle controls, long-pause resume, delayed
frames/rate, shared owners, new-Lap reset, finish/replay and notification-time pause.
The separate finish-notification regression remains unchanged.

## Graphics context restoration

`PlaybackFrames` also listens for the canvas's `webglcontextrestored` event and
requests a frame. Three.js restores its internal graphics resources first; the
requested render then repopulates the paused scene. The listener is removed with
the component. The canvas, camera, selected corner, project and playback position
remain intact, with no solve, reload or user interaction required after restoration.

A local probe of the preceding implementation counted 7,276 visible blue pixels
before loss and zero after restoration, while the cursor remained at 20 seconds.
The captured image showed retained HTML labels over a blank canvas. Two browser
journeys now repeat loss/restoration twice at desktop/phone widths and require
rendered line pixels before any action can wake the viewer. They retain the same
canvas, exact cursor, compass, corner labels, pending fuel and complete project;
playback must still work afterwards. Both also run against production assets.

Tests use the [Khronos context-loss extension](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/)
and await the actual lost/restored events. This validates application recovery
when the browser restores its context; it cannot force recovery from a permanent
graphics-device failure.

## Frame ordering and HTML labels

OrbitControls updates at priority -1. Telemetry ghosts and CameraRig update their
poses at -0.5, before HTML projection at priority 0.
Negative priorities order updates without taking over Fiber's automatic rendering.
This matters for a paused seek: the next rendered frame must position labels from
the new camera and ghost poses, rather than depend on another continuous frame.

Corner callouts explicitly invalidate when their HTML root attaches or their event,
layout or viewport inputs change. Their DOM content is mounted through a separate
HTML portal, so it can become ready after the Fiber tree's initial commit. Existing
placement caching and native exact-seek buttons remain intact.
Ghost names and sector badges likewise invalidate when their portals attach.
One shared `addAfterEffect` subscription places event controls first, sector
badges next and ghost names last, after all pose/HTML updates. Upstream layout
changes refresh downstream obstacles in the same pass; subscription cleanup
releases each registration and removes the shared callback after the last unmount.
This keeps remounted portals from updating after dependent label placement.
The layout reuses static obstacle bounds during playback
and notices late visible portal nodes before returning from its cache. The two
settled-viewer journeys now enable both ghost names throughout zero-draw, seek,
playback, orbit/reset and non-looping-finish checks. See GHOST_LABELS.md and
SECTOR_LABELS.md.

## Evidence and limits

The initial resource probe repeatedly switched Formula/GT vehicles three times.
Restoring the same vehicle restored its live WebGL buffer and vertex-array counts;
programs, textures and contexts stayed bounded in that session. Heap observations
include development tooling and warm-up and do not establish long-term memory bounds.
The probe also exposed repeated draws while paused. Its ignored local script and
before/after reports remain under `artifacts/render-lifetime-probe*`.

Two browser regressions instrument actual WebGL draw methods before the app loads.
They check a settled interval with no draws, then confirm that seeking, ongoing
playback, camera changes, orbit dragging and reset produce new draws and settle
again. Playback and errors/viewport checks use the real application. They impose no
hardware-dependent minimum frame rate. The initial desktop regression failed on
the preceding continuously rendered implementation; both pass after the change.
Existing ghost, north-direction and corner-event journeys cover numerical and
projection behavior. See VALIDATION.md for complete gates and visual review.
The corner fixture now checks visibility, containment and separation in one polled
DOM measurement. Previously hidden zero-size rectangles could satisfy separation
before a remounted portal became ready, then fail a subsequent bounding-box read.
The following extrema CI run exposed that race; no assertion deadline was raised.

The camera-framing pixel check now reads a compositor screenshot with HTML overlays
temporarily hidden. The browser may discard WebGL's default drawing buffer after
presenting a frame; reading it during a settled pause returned zero despite a
correctly visible circuit. The check retains its racing-line pixel threshold and
WebGL error assertion, without enabling drawing-buffer preservation in the app.

This reduces idle renderer work; it is not a measured battery-life or frame-rate
guarantee. Playback and interactive camera movement still render continuously while
needed. The shared playback scheduler now also sleeps while paused. These checks
measure animation callbacks and WebGL draws, not all browser processes or audio DSP.

The approach follows the upstream [Fiber performance guide](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx)
and was checked against the installed OrbitControls source.
