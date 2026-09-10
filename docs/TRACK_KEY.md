# Track key disclosure

Track View offers a native **Track key** button with an expanded state and an
associated legend region. Enter or Space toggles the four existing symbols.
Roomy scenes start expanded; scenes below 480 CSS pixels wide or 350 high start
collapsed. The predicate uses the actual scene's ResizeObserver, including native
fullscreen.
An explicit choice then persists for that mounted viewer through tabs, camera
changes, resizing and fullscreen. It is transient display state, not project data.

The compact default addresses an observed obstruction: in 780×390 fullscreen Top
View, the old legend covered all 484 CSS pixels² of corner 1 and intercepted its
center click. The ordinary 390×844 view did not reproduce that obstruction before
the change. Visual QA then found that the added heading extended the phone legend
over corner 1; the compact default now also covers narrow scenes. The key can still
overlap world-projected markers when deliberately expanded; this change does not
promise general collision avoidance for every camera/import.

Corner badge and event anchors retain their canonical positions. Expanded state
invalidates the existing bounded event/ghost label layouts so they can account for
the new obstacle size. The same demand renderer and playback clock remain; no
animation scheduler, simulation request or source-data modification is introduced.

`tests/e2e/track-key.spec.ts` covers native keyboard toggles, automatic short-scene
collapse, explicit choice retention and a real pointer click on corner 1. Existing
ghost-name and idle-render journeys also toggle the key. The command
`node scripts/track-key-qa.mjs` captures normal/fullscreen and expanded/collapsed views
at 1600×1000, 1280×900, 390×844 and 780×390 and records label geometry, Canvas
identity, cursor, project equality, requests and runtime errors.
