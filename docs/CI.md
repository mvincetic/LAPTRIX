# Continuous integration

The working branch runs lint, strict typecheck, numerical/API tests, production
build, development browser journeys and production viewer journeys through
`.github/workflows/ci.yml`. Browser installation uses the package-locked Playwright
version and its Chromium build; no branded Chrome channel is configured.

On 2026-09-09, both attempts of the [GPX milestone workflow](https://github.com/mvincetic/LAPTRIX/actions/runs/34385050997)
passed `npm run check`, then failed while updating APT indexes before installing
browser dependencies. The preconfigured Google Chrome source returned a package
index whose hash disagreed with its signed release metadata. No application test
had failed; the browser suite had not started.

The job now renames the specific `google-chrome.list` or `google-chrome.sources`
file, when present, to an ignored extension on its ephemeral Ubuntu runner. Ubuntu
repositories and normal signature/hash verification remain active. Playwright
still installs its system dependencies and downloads the expected Chromium binary.
No developer-machine package sources or repository settings are changed. If a
branded Chrome test channel is introduced, revisit this deliberate source choice.

The [runner image's Chrome installer](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-google-chrome.sh)
documents the traditional source filename and also removes that source while
building the image. [Playwright's browser documentation](https://playwright.dev/docs/browsers)
describes its version-specific browser binaries and separate system dependencies.
The mitigation is original workflow code, not copied external implementation.

That fix passed its complete [remote run](https://github.com/mvincetic/LAPTRIX/actions/runs/34386776078).
The following 59-journey source-profile run reached the original 15-minute job
limit while still running browser tests. Its buffered output provided no complete
browser verdict. The job now allows 25 minutes, with a 20-minute global development
browser budget and explicit list reporting for per-test progress. Individual test
and assertion limits are unchanged. A global suite timeout can now report failure
and leave time for artifact upload before the outer job deadline.
The [first run with that budget and reporting](https://github.com/mvincetic/LAPTRIX/actions/runs/34389383617)
passed the complete source-profile milestone, including development and production
browser checks.
The subsequent [source-scaled camera run](https://github.com/mvincetic/LAPTRIX/actions/runs/34440831541)
also passed all remote gates through `90631c9`.
The [camera-derived north/reset run](https://github.com/mvincetic/LAPTRIX/actions/runs/34442541217)
passed through `19fc232`, including all 62 development browser journeys.

## 2026-09-10 — Split the complete browser suite across isolated runners

The [load-graphs run](https://github.com/mvincetic/LAPTRIX/actions/runs/34475687433)
passed lint/type/unit/API/build checks, then reached the 20-minute development
budget with 69 browser journeys passed, one timed out and 17 not run. Its phone
graph trace reaches every functional assertion but exceeds the 60-second case
budget during a workflow that also captures two successful screenshots. Those
images already belong to the separate three-width visual QA script.

The graph journey now retains its numerical, playback, compatibility and complete
project assertions while leaving successful captures to that script. Failure
screenshots/traces remain enabled. Individual test/assertion deadlines are unchanged.

The workflow uses two independent GitHub runner jobs with Playwright `--shard=1/2`
and `--shard=2/2`. Each retains one local browser worker, the existing 20-minute
suite budget and 25-minute outer job budget. File-level grouping preserves tests'
local ordering; `fail-fast: false` lets both report their result. The complete
lint/type/unit/API/build gate and production viewer checks run once, on shard 1.
Both jobs must succeed for the workflow to pass. Failure artifacts include shard
numbers so parallel jobs retain separate evidence without naming collisions.

This follows [Playwright's documented file-level sharding](https://playwright.dev/docs/test-sharding).
No tests are excluded, retries added, timeouts raised or repository settings changed.
Local test discovery verifies that both shard lists form the exact complete suite.

The [first complete sharded run](https://github.com/mvincetic/LAPTRIX/actions/runs/34478677019)
passed through `83c65ad`: 45 development journeys in 11.5 minutes on shard 1 and
42 in 10.0 minutes on shard 2, covering all 87 at that revision. Shard 1 also passed
148 TypeScript tests, 136 Python tests, lint/type/build checks and both production
viewer journeys (14.6 seconds). The formerly slow graph journeys passed in
22.9/19.5 seconds at desktop/phone widths. These are observations from that run,
not per-run time guarantees.

The following [extrema run](https://github.com/mvincetic/LAPTRIX/actions/runs/34479735229)
passed both extrema journeys and 88 of 89 development journeys overall. Shard 1
failed an existing corner-label check when returning from chase: three newly
mounted hidden rectangles passed its separation predicate, before a bounding-box
read returned null. The rendering continuation strengthens that fixture to require
all three visible rectangles, containment and separation in one polled measurement.
Individual deadlines are retained.

The [demand-rendering run](https://github.com/mvincetic/LAPTRIX/actions/runs/34482854813)
passes through `1e1944c`: all 91 development journeys (47 in 9.4 minutes and 44 in
6.9 minutes), 153 TypeScript tests, 136 Python tests, lint/type/build checks and
both production journeys (12.3 seconds). The strengthened corner fixture passes.

The [graphics-restoration run](https://github.com/mvincetic/LAPTRIX/actions/runs/34484003527)
passes through `69df25f`: all 93 development journeys (47 in 9.4 minutes and 46 in
6.8 minutes), the same complete quality gate and all four production loading/
restoration journeys (27.1 seconds). Both new restoration cases pass remotely.

The [source-curvature run](https://github.com/mvincetic/LAPTRIX/actions/runs/34487326466)
passes through `6f6261c`: all 93 development journeys (47 in 7.4 minutes and 46 in
5.1 minutes), 159 TypeScript tests, 136 Python tests, lint/type/build checks and
all four production journeys (22.9 seconds). The expanded source/GPX checks pass.

The [closed-corner run](https://github.com/mvincetic/LAPTRIX/actions/runs/34490067249)
passes through `e3e25ef`: all 95 development journeys (49 in 9.7 minutes and 46
in 7.2 minutes), 161 TypeScript tests, 146 Python tests, lint/type/build and all
four production journeys (27.0 seconds). Both new seam journeys pass remotely.

The [sector-loop run](https://github.com/mvincetic/LAPTRIX/actions/runs/34492384734)
passes through `64b11af`: all 97 development journeys (49 in 9.5 minutes and 48
in 6.3 minutes), 169 TypeScript tests, 146 Python tests, lint/type/build and all
four production journeys (26.2 seconds). Both real-time sector-loop cases pass.

The [ghost-name run](https://github.com/mvincetic/LAPTRIX/actions/runs/34495944339)
passes 98 of 99 development journeys: shard 1 passes 51 in 10.0 minutes, the
179-TypeScript/146-Python quality gate and four production journeys (26.9 seconds).
Shard 2 passes 47 and fails the desktop sector-loop fixture after observing one
wrap rather than two inside its 22.825-second wall-time budget. Both ghost-name,
reference-finish, demand-rendering and graphics-restoration pairs pass.

The sector-loop fixture now uses the real seek control to approach the sector end
before each of two observed playback crossings. It preserves all interval, clock,
project, keyboard and reset assertions while removing the assumption that the
software renderer completes full sectors at a particular wall-clock rate. The
clock's existing delayed-frame cap remains unchanged, and deterministic tests
retain whole/multiple-cycle coverage. Default assertion/test limits are retained;
no retries, exclusions or renderer changes are introduced.
Both revised journeys pass locally in 18.9 seconds and, in a separate ignored
fixture using Chromium's six-times CPU throttle, in 49.0 seconds (22.2/25.1 seconds).
All normal application, assertion and test deadlines remain unchanged. Evidence is
`artifacts/sector-loop-boundary-browser.log` and `sector-loop-slow-browser.log`.

The [comparison-export run](https://github.com/mvincetic/LAPTRIX/actions/runs/34498132296)
passes through `e35ae54`: all 101 development journeys (51 in 9.7 minutes and 50
in 8.0 minutes), 187 TypeScript tests, 146 Python tests, lint/type/build and all
four production journeys (27.2 seconds). Both revised sector-loop journeys pass,
along with ghost placement and the new native/timing comparison exports.

The [sleeping-clock run](https://github.com/mvincetic/LAPTRIX/actions/runs/34501143584)
passes through `1a37057`: all 101 development journeys (51 in 11.1 minutes and
50 in 8.2 minutes), 194 TypeScript tests, 146 Python tests (39.58 seconds), all
quality gates and four production journeys (31.7 seconds). Both zero-idle-frame
checks pass alongside the sector loops and graphics-restoration cases.

The [audio-ordering run](https://github.com/mvincetic/LAPTRIX/actions/runs/34501927841)
passes through `7ecbc68`: all 105 development journeys (53 in 7.7 minutes and
52 in 8.7 minutes), 197 TypeScript tests, 146 Python tests (29.56 seconds), all
quality gates and four production journeys (23.9 seconds). The four new delayed
activation cases and existing startup-retry/unrelated-error cases all pass.

The [custom-window run](https://github.com/mvincetic/LAPTRIX/actions/runs/34504379221)
passes through `1a8c64d`: all 107 development journeys (55 in 10.3 minutes and
52 in 8.6 minutes), 203 TypeScript tests, 146 Python tests (42.52 seconds), all
quality gates and four production journeys (29.5 seconds). Both custom-window
journeys include the exact-boundary visibility regression and pass.
