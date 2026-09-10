# Selected-corner event callouts

Selecting a corner exposes Brake, Turn-in and Throttle event controls in the scene
and the existing numerical analysis panel. The scene buttons pause and seek the
single playback clock to the selected Lap's exact event sample. They neither run
the solver nor change the project, reference or pending setup.

The original scene labels used offsets in world metres. Their screen separation
shrunk with camera distance and they could obscure one another, especially on
the GT 5 m refined line. The replacement uses 76×24 CSS-pixel buttons with 6 px
vertical gaps. Thin colored leader lines connect each button to its own projected
sample, lifted 3 m above the road for display. Sample coordinates, timing and
detected event indices remain authoritative and unchanged.

## Placement and cameras

`corner-callouts.ts` groups visible events in their existing order. It considers
positions around their projected bounds and occupied UI rectangles. It searches
free vertical intervals at up to 64 horizontal positions and retains the nearest
free position in each column, with four simple offsets as fallback candidates.
The group stays inside an 8 px viewport margin; covered area takes priority over
leader distance. This keeps event buttons mutually separate even when two events occupy
the same source sample. Labels can be grouped away from the corner when a compact
viewport leaves little nearby space; the leader dots identify their actual points.

The layout considers visible legends, viewer tools, compass, captions/camera
controls, sector labels, corner numbers and the start marker. This bounded placement
heuristic does not guarantee avoidance of every other item in an arbitrarily crowded
view or prevent every leader-line crossing. It always preserves the event anchors.
Offscreen/non-finite projected events are omitted instead of moved to a false road
position. If the canvas cannot fit readable controls, the scene group is omitted;
the numerical analysis controls remain available. Chase retains its existing
suppression of selected-corner scene labels.

`CornerCallouts` projects the selected samples in the existing Three.js frame loop.
It writes only overlay transforms and SVG line/dot coordinates after camera,
projection, viewport, selected data or relevant viewer-layer/tab changes. Stable
frames reuse the placement; no second clock or React update at playback frequency
is introduced. The component stays in the deferred viewer module. Buttons remain
native keyboard controls, with accessible event names and distances.

## Verification

Eight independent layout cases cover coincident events at four viewport corners,
an occupied half-screen, preserved input/order, offscreen/non-finite anchors and
insufficient display space, plus a free rectangle requiring displacement on both
axes. Browser regression first reproduced the previous
overlap using a real GT 5 m refined lap. Desktop/phone journeys check separate,
contained buttons and exact event seeking, then camera movement, reset, chase and
layer changes while preserving the complete project and pending fuel with no new
simulation requests. The wider camera, cursor, dashboard and viewer-loading gates
are recorded in VALIDATION.md.
