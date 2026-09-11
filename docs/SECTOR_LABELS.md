# Readable sector timing on the track

The close-Orbit follow-up exposed an overfull Ghost Car panel at 320 px with a
selected Red Bull Ring corner. Replacing its redundant implementation note with
blue/grey dots alongside the controls restores all three sector badges in that
state. The existing placement and omission rules remain unchanged. The production
journey covers that combination, and the visual sweep saves failed measurements
and a screenshot before throwing. See PRODUCT_PRESENTATION.md for before/after.

Sector badges retain the current Lap's three-decimal times and connect to the
midpoint of their own distance interval on the calculated racing line. Thin grey
leaders show those anchors. The badges move in screen pixels to avoid corner
circles, start/finish, selected event controls, the track key, open tools, captions
and camera controls. The data, sector boundaries, playback cursor and project
are unchanged. Narrow labels now use 8 px sector headings instead of 6 px.

The previous fixed world offsets let corner circles cover timing digits, notably
on the Red Bull Ring phone overview. `sector-labels.ts` reuses the existing bounded
free-space search with each badge's measured dimensions. Source order is stable;
later badges avoid earlier ones and every interval anchor. Obstacles have a 3 px
margin. Offscreen anchors, an occupied viewport or a required leader over 160 px
omit the map badge; all times remain in Lap Analysis. The routine does not claim
to solve every packing problem or prevent every crossing between leader lines.

`SectorLabels` measures actual text boxes, projects canonical samples just above
the road and updates only DOM transforms and SVG leaders. Omitted badges retain
invisible measurable dimensions through a narrowly scoped CSS rule; the normal
global hidden-element rule otherwise makes their dimensions zero. Node identity,
camera/projection matrices, viewport, dimensions and viewer inputs guard its cache.

All movable annotations use one cleaned-up Fiber after-frame subscription through
`annotation-layout.ts`. The order is selected event controls, sector badges, then
ghost names. The larger interactive event group gets space first; badges and
names accommodate it. An upstream layout change invalidates downstream placement
in that same pass. This handles portals remounting in a different order after
chase or layer changes without stale rectangles or mutually competing layouts.
Registration is released on input changes and unmount; the last removal releases
the shared subscription. There is no extra animation loop, timer, clock, simulation
request or React state update per frame. Stable paused frames retain their caches.

Four pure geometry cases cover coincident/differently sized badges, corner/key/
caption obstacles, viewport corners, exact anchors, unchanged inputs, deterministic
placement and omitted invalid/blocked/distant labels. Four browser journeys cover
both circuits at 1600 and 320 px through top/orbit, selected events, key and sector
toggles and chase returns. They check actual rectangles, exact exported times,
unchanged complete projects, pending fuel, the paused cursor and zero new solves.
The existing callout, ghost-name and settled-rendering journeys cover the shared
layout integration. These four new journeys also run against production assets.

`node scripts/sector-labels-qa.mjs` captures both tracks with GT/current and Formula/
reference ghosts at 1600, 1280, 390 and 320 px. It checks five annotation states per
viewport, with overlap/containment, visible/omitted badge counts, displayed
text and runtime errors recorded alongside screenshots in ignored `artifacts/`.
`QA_TRACK`, `QA_WIDTH` and `PRESENTATION_QA_PREFIX` can narrow a review or preserve
separate evidence. Open tools may leave less room; unobstructed views require all
three badges. The numerical analysis remains available when an overlay is omitted.
