# Ghost names and vehicle anchors

When the native reference ghost is enabled, CURRENT and REF identify the visible
vehicles. Names use compact 56×20 CSS-pixel boxes and thin leaders connected to the
rendered car transforms. They avoid sector timing, corner/event markers, start/finish,
the legend and viewer controls. Label placement does not change vehicle positions,
orientation, comparison timing, playback or project contents.

`TelemetryGhost` still derives each pose from its own Lap through `ghostPose` and
the shared clock. `GhostLabels` projects the existing vehicle Group's world matrix
after that update. Its anchor is the same local point formerly used by the attached
HTML tag. Leader anchors are exposed separately from movable label rectangles so
the reference-finish regression continues to measure actual vehicle movement.

The pure `layoutGhostLabels` helper places at most two names independently. It
reuses the bounded free-space search used by corner callouts, with explicit name
dimensions and unchanged corner defaults. Current names take placement priority;
the reference then avoids the current name and both anchors. The search prioritizes
zero overlap and nearby positions, retaining deterministic ordering. Existing
controls receive a three-pixel margin. Names are omitted when their anchor is off
screen, the view is too small, no unobstructed candidate exists or the nearest
chosen label needs a leader longer than 120 pixels. This heuristic does not promise
a label for every camera/crowding condition; the vehicle and numerical telemetry
remain authoritative.

Leaders render below scene badges, with name boxes above the canvas. Both portals
use canvas-relative coordinates and explicit per-anchor visibility, including
tracks far from the world origin. Neither overlay intercepts pointer input.

Layout runs last in the existing demand frame's shared `addAfterEffect` pass,
after selected event controls and sector badges, with registration cleanup on
input changes/unmount. Upstream layout changes refresh its obstacles. This observes
the final HTML positions even when corner portals remount after the ghost overlay;
equal-priority frame subscriptions alone left stale corner positions after chase.
Static obstacle bounds are reused
while cars move; camera, viewport, result, selected corner, viewer tools and layer
changes invalidate that cache. Visible portal-node identity is checked before the
early return because corner controls can attach after the initial Fiber commit.
Root attachment requests a frame; there is no new timer, animation loop or React
state update per frame. The settled-viewer regressions enable reference labels and
still require zero new WebGL draws after playback, seeking and camera interaction.

The motivating GT-current/Formula-reference frame at 40.31 seconds had CURRENT
covering Sector 2's time at both desktop and phone widths. The retained before probe
measures 813.25 CSS-pixel squared overlap. Two browser regressions fail before this
fix and then check separate, contained names through corner selection, orbit/top
changes, seeks and real playback. They also preserve the complete exported project,
pending fuel and canonical cursor with no additional simulation request. Pure
tests cover coincident/distant anchors, edges, obstructed/offscreen views, a long
leader and unchanged input data. See VALIDATION.md for final gates and visual QA.
