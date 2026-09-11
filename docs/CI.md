# Continuous integration

The working branch runs lint, strict typecheck, numerical/API tests, production
build, development browser journeys and production viewer/CSV-worker journeys through
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

The [fullscreen run](https://github.com/mvincetic/LAPTRIX/actions/runs/34506301466)
passes through `64507c3`: all 114 development journeys (58 in 10.0 minutes and
56 in 9.9 minutes), 203 TypeScript tests, 146 Python tests (42.53 seconds), all
quality gates and four production journeys (28.9 seconds). All seven fullscreen
recovery, native-transition and short-viewport cases pass.

The [compact-key run](https://github.com/mvincetic/LAPTRIX/actions/runs/34508648908)
passes through `45c1d81`: all 117 development journeys (60 in 10.6 minutes and
57 in 9.7 minutes), 203 TypeScript tests, 146 Python tests (42.56 seconds), all
quality gates and four production journeys (29.1 seconds). All three compact-key
journeys and the expanded label/idle checks pass.

The [stable-shoulder run](https://github.com/mvincetic/LAPTRIX/actions/runs/34509690703)
passes through `04f73fe`: all 117 development journeys (60 in 10.0 minutes and
57 in 9.7 minutes), 203 TypeScript tests, 146 Python tests (40.35 seconds), all
quality gates and four production journeys (27.7 seconds). Both updated actual
buffer-retention and zero-idle-render checks pass remotely.

The [terrain-clearance run](https://github.com/mvincetic/LAPTRIX/actions/runs/34511922940)
passes through `7f50e91`: all 119 development journeys (60 in 10.4 minutes and
59 in 10.2 minutes), 211 TypeScript tests, 146 Python tests (40.37 seconds), all
quality gates and four production journeys (28.3 seconds). Both sparse/sloped
road-visibility checks pass alongside the existing rendering regressions.

The [reviewed-CSV run](https://github.com/mvincetic/LAPTRIX/actions/runs/34515158371)
passes through `7bf1be6`: all 126 development journeys (64 in 11.8 minutes and
62 in 10.5 minutes), 246 TypeScript tests, 146 Python tests (42.61 seconds), all
quality gates and four production journeys (29.4 seconds). All seven CSV mapping,
ordering, cancellation, persistence and live-playback cases pass remotely.

The [bounded-actions run](https://github.com/mvincetic/LAPTRIX/actions/runs/34516267889)
passes through `a5cad17`: all 128 development journeys (64 in 7.8 minutes and
64 in 11.1 minutes), 246 TypeScript tests, 146 Python tests (24.36 seconds), all
quality gates and four production journeys (21.0 seconds). Short-menu keyboard,
resize and contained-wheel checks pass alongside CSV and native modal workflows.

The [comparison-CSV run](https://github.com/mvincetic/LAPTRIX/actions/runs/34517411762)
passes through `a2236c6`: all 128 development journeys (64 in 11.4 minutes and
64 in 11.0 minutes), 251 TypeScript tests, 146 Python tests (42.10 seconds), all
quality gates and four production journeys (28.5 seconds). Native and timing-only
CSV downloads agree with complete JSON report rows remotely.

The [CSV-allocation run](https://github.com/mvincetic/LAPTRIX/actions/runs/34518373384)
passes through `2a3fd26`: all 128 development journeys (64 in 11.3 minutes and
64 in 8.8 minutes), 251 TypeScript tests, 146 Python tests (42.62 seconds), all
quality gates and four production journeys (28.9 seconds).

Production coverage now additionally includes the four CSV-worker journeys:
near-limit review/import, delayed conversion/cancellation, module failure/retry,
and cancellation while the worker is actively occupied.
They exercise the built worker URL in addition to the development module.

The [CSV-worker run](https://github.com/mvincetic/LAPTRIX/actions/runs/34566631109)
passes through `de1766f`: all 132 development journeys (66 in 8.7 minutes and
66 in 11.6 minutes), 256 TypeScript tests, 146 Python tests (31.07 seconds), all
quality gates and eight production journeys (46.6 seconds). Both jobs completed
successfully before the product presentation implementation began.

The [Dev Track/playback run](https://github.com/mvincetic/LAPTRIX/actions/runs/34568349309)
passes through `15a8c34`: all134 development journeys (68 in11.8 minutes and
66 in9.0 minutes),257 TypeScript tests,146 Python tests (40.36 seconds), all quality
gates and eight production journeys (58.4 seconds).

The [first showcase run](https://github.com/mvincetic/LAPTRIX/actions/runs/34570230893)
passes the quality gate (259 TypeScript, 152 Python in 40.73 seconds), 70 development
journeys on shard 1 and all 11 production journeys (1.5 minutes). Shard 2 passes 63
and fails four existing fixtures: source-profile comparisons omitted the catalog's
new null attribution field, and failed-project imports expected only one installed
track. The repair captures the loaded source and complete option values/labels
before each operation, then verifies exact preservation. No application contract,
source geometry or assertion deadline is relaxed.

The [camera/vehicle run](https://github.com/mvincetic/LAPTRIX/actions/runs/34572868896)
passes through `77d633e`: all **137 development journeys** (70 in 12.5 minutes and
67 in 11.7 minutes), 263 TypeScript tests, 152 Python tests (40.89 seconds), all
quality gates and 11 production journeys (1.5 minutes). All four repaired catalog
cases and the updated chase, reference, reduced-motion and idle checks pass remotely.

The [grounding run](https://github.com/mvincetic/LAPTRIX/actions/runs/34573992998)
passes through `5f41b60`: all 137 development journeys (70 in 10.4 minutes and
67 in 12.5 minutes), 267 TypeScript tests, 152 Python tests (31.94 seconds), all
quality gates and 11 production journeys (1.3 minutes). Both terrain-visibility
and settled-render/buffer cases pass with the added road and landscape detail.

Production coverage now also includes three native fullscreen viewer-transport
journeys at desktop, phone and short landscape, bringing that suite to 14 cases.
