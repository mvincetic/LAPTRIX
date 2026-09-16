# Load-extrema CI capture cost — 2026-09-16

The GT body-fitting revision `867fae9` passes seven jobs in
[run 35142086900](https://github.com/mvincetic/LAPTRIX/actions/runs/35142086900).
Quality includes 342 TypeScript and 178 Python tests (27.90 seconds), four
byte-identical Blender exports, 189 successful development cases and forty
production cases (19.2 minutes). Development shard 3 has one failure: the 1600 px
load-extrema journey exceeds its existing 60-second test deadline.

## Trace findings

The retained artifact `10465843753` shows all eight extrema inspections passing
across Time and Distance axes. Current values, precise cursor positions, pause
behavior, range reset and reference visibility pass. The final project export
also matches the original. A subsequent `locator('.telemetry-panel').screenshot()`
takes 11,615.339 ms. Disclosure collapse, unchanged trace path and overflow checks
then pass; the final browser evaluation finishes 60,221.506 ms after the test's
before-hooks start. Context setup itself takes about 5.3 seconds.

This is evidence of accumulated test/capture cost, without a failed application
assertion. It does not establish that every future slow run is harmless or that
the heavier GT carries no rendering cost. No test, expectation, playback or
global deadline is increased.

The unchanged `867fae9` application passes four local repetitions, twice at each
width: desktop 28.7/28.0 seconds and narrow 24.2/24.6 seconds. The CI deadline miss
does not reproduce on this Windows host. The first local diagnostic used port
5175 and was correctly rejected by the API's existing origin policy; that setup
failure is retained separately and excluded from the reproduction result. The
valid repeats use the already allowed port 5174 without changing that policy.

## Focused change

The behavioral E2E retains every assertion and removes only the unasserted
screenshot. The existing `scripts/load-graphs-qa.mjs` owns expanded-extrema visual
captures at 1600, 1280 and 390 px, alongside trace, range and reference states.
It measures stable panel bounds and clips a page capture without scrolling the
tall panel through the live 3D canvas. Failure screenshots/traces remain enabled
in the ordinary E2E configuration.

The follow-up passes the complete isolated quality gate: 342 TypeScript / 178
Python tests (47.51 seconds), lint/types, ten asset packages, context reproduction
and production build (954 ms). Four revised journey repetitions pass in 1.7
minutes: desktop 26.1/26.9 seconds and narrow 20.5/21.8 seconds. The separate visual
script passes 24 states at 1600, 1280 and 390 px, including expanded extrema,
with no overflow or runtime errors. Desktop and narrow extrema captures were
visually inspected. There is no application, asset, clock or timeout change.

The resulting working-branch revision must pass remote CI before the body-fitting
milestone is remotely accepted. Uncommitted vegetation work remains outside this
focused stabilization commit.

Evidence is retained locally as `artifacts/gt-body-ci-load-extrema.zip`, its
extracted trace, `gt-body-ci-trace-events.json` and the baseline/fix logs. The
isolated checkout serves the exact GT revision and shares only installed runtime
dependencies; it does not include the subsequent vegetation candidate.
