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

## Red Bull Ring GP showcase — 2026-09-11

Both circuits now coexist in the catalog. Red Bull Ring uses pinned OSM GP ways
and a licensed Steiermark terrain crop; complete licenses, source hashes, flight
epoch, geometry transformation and assumptions are in
[the source record](../data/sources/red-bull-ring/README.md). The original Dev Track
JSON is unchanged in this milestone. The new source fingerprint is
`sha256:6269176570597be6d70057566a045d193bdbc18f3e59db8cad141c33798c4118`.

The reconstruction has 720 points, a 4311.389 m 3D source length and 63.272 m of
elevation. It uses the clockwise GP route without motorcycle/pit branches, starts
at the mapped finish vertex and retains estimated 12 m width and sector thirds.
An initial 10 m height-filter sigma left a 27.1% grade near a short DGM dip; the
final 30 m spatial sigma smooths that feature while preserving the broad hills.
Its maximum 6.084 m height adjustment and 2010 data epoch remain explicit.
This is approximate terrain reconstruction, not a current road-surface survey.

Optional bounded attribution is carried in the track and new native/timing lap
metadata. It appears beside the viewer, in track inspection, in JSON exports and
in credited CSV ZIPs. The archives keep the numerical CSV intact and add text/JSON
source notices. fflate 0.8.3 is now a pinned direct dependency (previously transitive);
ZIP entries use STORE to avoid compression of the numerical tables. Source identity
excludes presentation metadata. New solver-source identity is
`sha256:5c41ae28ce7434eabb9a4d457c66233f29cd1e4d1ea6f8ab2043dddd69025e8f`
because the contract/output carries attribution; no equations changed.

The final full gate passes lint, Ruff, strict typecheck, **259 TypeScript tests and
152 Python tests (46.44 seconds)** plus build. New Python cases cover pinned bytes,
the closed GP chain, direction, both catalog sources, metadata/URLs and Formula/GT
solves. New TypeScript cases cover geometry identity and attributed portable
restoration. The offline importer reproduces both generated files exactly with
`--check`. Evidence: `artifacts/red-bull-ring-check-final.log`,
`red-bull-ring-python.log`, `red-bull-ring-reconstruction.log` and
`red-bull-ring-reproduce.log`. Entry JavaScript is 438.92 / 134.97 kB gzip;
deferred viewer is 967.84 / 259.53 kB.

Ten existing browser regressions pass, including project recovery, transactional
track activation, source isolation, comparison export and scene playback.
The first new browser run caught a Windows catalog decoding defect: implicit
system encoding garbled UTF-8 credits. Explicit UTF-8 catalog reads fix both track
and vehicle loading, with a Unicode regression assertion. A subsequent phone
fixture attempted the hidden desktop project-name field; it now uses the existing
Rename project dialog. All three final showcase journeys pass in 35.6 seconds.
They verify both tracks remain available, source/reference alignment, local save,
reload, portable restore and native/timing/CSV notices. Python's independent ZIP
reader verifies CRCs; every telemetry value and comparison timing row is retained.
Evidence: `red-bull-ring-browser.log`, `red-bull-ring-browser-final.log` and
`red-bull-ring-browser-release.log`. All **11 production journeys pass in 1.1
minutes**, including those three built-app showcase cases
(`artifacts/red-bull-ring-production.log`). Final changed-script lint/typecheck pass.

Visual QA uses `node scripts/presentation-playback-qa.mjs --showcase`: overview,
top, chase and chase fullscreen at 1600×1000, 1280×900, 390×844 and 780×390. All
16 states retain the readout and source credits within their viewer, with zero
horizontal overflow or runtime errors. Desktop overview, phone top and short
fullscreen screenshots were opened and reviewed. The GP plan is recognizable;
seven detected corner groups are explicitly labelled as detected rather than the
official ten turns. Evidence: `artifacts/red-bull-ring-qa.json`, corresponding log
and `red-bull-ring[-scene]-*.png`.

Camera distance, the schematic enlarged vehicle, ground materials and scene
context remain the next presentation targets. No calibration claim follows from
successful solves or the similarity of the reconstructed elevation range.
