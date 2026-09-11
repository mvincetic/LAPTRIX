# Bundled typography and compact header recovery

The dashboard uses the locally bundled `Inter Variable` family from
`@fontsource-variable/inter`, with the existing system fallbacks. The wordmark
retains its separately bundled Barlow Condensed face. No remote font service is
requested and no new font bytes are added.

V7 CI exposed a loading-state wrap at 320 px on Linux. Shard 2
completed 77 journeys and failed only the new native-scrollbar header case. Its
artifact shows the loading actions dropping below the brand. Local Windows runs
had passed because the root CSS requested `Inter`, while the imported font's
actual family is `Inter Variable`: both systems rendered different fallbacks.
The failure reproduces locally with an Arial header (`header-font-before.log`,
before PNG and the downloaded CI artifact reviewed).

Root CSS now names the actual bundled family. At 360 px and below, the primary
header action uses ten-pixel horizontal padding, retaining room for the full
compact Loading/Cancel labels, the wordmark and the other actions even under
fallback metrics. Intrinsic branding and the tablet row reservation stay intact.
Accessible button names, native selector grouping and source identities do not
change.

The expanded header journey first verifies that the bundled family is selected
and actually loaded. It then tests bundled and Arial metrics at 320 and 700 px
through loading, ready and cancellation, with native scrollbars. Each case checks
actual text/action separation, a shared action row and aligned selectors below
it; an explicit cancelled request retains its previous result. It passes locally
in 12.8 seconds (`header-font-after.log`). Before/after captures were opened.

Because activating the intended family affects the whole dashboard, the follow-up
also repeats source-selection and viewer-panel visual sweeps, dashboard/annotation/
fullscreen browser journeys and the production suite. See CI.md for the remote
run and the final verification record below.

The final full gate passes 289 TypeScript / 152 Python tests (95.83 seconds),
lint, Ruff, both asset validators, typecheck and build (`font-final-check.log`).
An initial TypeScript check caught the test override handle's generic Node type;
cleanup now removes it through its parent, and the complete rerun passes.
Entry JavaScript remains 439.43 / 135.12 kB gzip, viewer JavaScript 991.27 /
266.71 kB, and CSS is 60.81 / 12.72 kB. No font, texture or geometry payload is added
by this typography correction.

Fifteen source-selection/playback states and 48 viewer-panel states pass with
native scrollbars (`font-selection-qa.json`, `font-layers-qa.json`). Desktop,
laptop, narrow-header and source-panel captures were opened and reviewed.
Source descriptions fit, selectors align, panel/camera controls stay clear,
and the original cursor and project state are retained. No runtime errors occur;
the existing renderer Clock deprecation remains unchanged.

All 25 broader browser journeys pass in four minutes (`font-browser.log`),
covering the main dashboard, fullscreen recovery, ghost/sector placement, precise
load inspection, keyboard tabs, viewer panels and both header font configurations.

All 30 final production journeys pass in 3.8 minutes (`font-production.log`),
including the bundled/fallback compact header. Eight complete dashboard reviews
cover both circuits at 1600, 1280, 390 and 320 px (`font-layout-qa.json`), with
separate narrow settings, analysis and telemetry captures. Values, tables and
controls remain readable. The narrow telemetry review identifies crowded distance
ticks as the next small presentation correction, recorded in ROADMAP.md.

Eight final viewport/element reviews retain visible native scrollbars and verify
actual header/grid bounds (`font-viewport-qa.json`, 24 PNGs). The rightmost panels
stay 10 px inside the usable desktop width and 8 px inside the phone width.
Desktop/laptop viewport captures were opened; these supersede full-page images
for assessing the right edge. There is no application horizontal clipping.
