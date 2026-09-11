# Product presentation milestones

The September 11 user direction makes visual/product presentation the primary
sequence. The current solver is sufficient for the MVP. ROADMAP.md preserves
the sequence through source attribution, camera/speed, grounding/vehicles and UI.

## LAPTRIX Dev Track and playback clarity — 2026-09-11

The former Ardennes Development Circuit is now LAPTRIX Dev Track. Only its name
and the generator's name changed: every other JSON field is identical to the
preceding commit. The ID/file remain `ardennes-development`; source fingerprint is
`sha256:a2e611b0d0a69621ff5c04d0003f15e3a92f49fb78ee623a8cda1a60f9d5f689`.
An old-name project resolves to the installed source without adding a duplicate.
Historical reference artifacts retain their recorded labels and results.

A 50 px footer shows current-lap speed in km/h, gear, elapsed/full time, playback
rate and ready/playing/paused/complete state. It consumes the existing canonical
Lap and PlaybackClock in an isolated subscriber. No additional clock, animation
scheduler, synthetic motion or scene geometry rebuild is introduced. Numerical
updates are not live announcements. Chase guidance describes actual follow
behavior; orbit/top retain drag and zoom instructions.

The complete quality gate passes: ESLint, Ruff, strict TypeScript, 257 TypeScript
tests, 146 Python tests (43.13 seconds) and production build. Entry JavaScript is
427.70 kB / 129.27 kB gzip; deferred viewer is 967.32 / 259.35 kB. Evidence:
`artifacts/presentation-playback-check.log`.

Fourteen existing browser regressions pass in the first run, covering framing,
fullscreen, keyboard and settled-render/buffer behavior. The two new journeys
initially read the range input's browser-quantized `.value` rather than React's
exact value attribute. Correcting the test oracle preserves the application code;
both final journeys pass in 11.1 seconds. They independently interpolate exported
telemetry at a gear boundary, inspect live/pause/rate/loop/finish/restart, compare
elapsed time to the transport, and retain the complete project, pending fuel21 and
reference with zero simulation requests. Evidence:
`presentation-playback-browser.log` and `presentation-playback-browser-final.log`.
All eight production browser journeys pass on the final build in 36.7 seconds
(`artifacts/presentation-playback-production.log`). Final changed-script lint and
strict typecheck also pass.

`node scripts/presentation-playback-qa.mjs` captures overview, top, chase and chase
fullscreen at 1600×1000, 1280×900, 390×844 and 780×390. All 16 states retain footer
values inside the strip, no horizontal overflow and no runtime errors. Desktop
overview, phone chase and short fullscreen scene screenshots were opened and
reviewed. Evidence: `artifacts/presentation-playback-qa.json`, corresponding log,
and `presentation-playback[-scene]-*.png`. The earlier four-size overview/top/chase
baseline is retained as `product-before-*`; the first capture needed an explicit
corner-overlay mount wait, which was a capture-timing issue, not a rendering defect.

These checks establish playback clarity and compatibility. The vehicle is still a
schematic enlarged mesh and the follow camera/context need the next milestones.
The development track remains available when the real showcase is added.
