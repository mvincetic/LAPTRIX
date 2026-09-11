# Continuous integration

The [daylight run](https://github.com/mvincetic/LAPTRIX/actions/runs/34623193344)
at `077c17b` passes the full gate (309 TypeScript / 152 Python tests, Python in
40.61 seconds) and 168 of 170 development journeys. Two new shadow-resource
assertions fail; production is skipped. Both downloaded traces show that the
initial resource snapshot still has the zero-second car/anchor after the DOM
slider has changed to five seconds. The next frame moves the car and shadow
together and performs one expected shadow pass. The test now instruments before
seeking and waits for that actual map update before measuring camera-only reuse.
It also waits for rendered updates after showing the car and entering zero/source
boundaries. The same cache, count and alignment assertions remain intact.
Both corrected shadow journeys pass locally (31.0 and 29.1 seconds); typecheck
and targeted lint also pass. The follow-up changes test synchronization and CI
scheduling, with no application behavior change.

This run also takes 18.0 minutes on the first development shard, 13.7 minutes on
the second and 17.7 minutes on the third. Adding setup, the full gate and the
measured 6.3-minute local production suite to the first shard would exceed the
existing 25-minute job budget. Production now occupies its own fourth matrix job;
the three development shards and their 20-minute limits stay intact. The full
quality gate runs once on shard 1, production builds and tests once in its own
job, and all four jobs must pass. No test, assertion or deadline is removed or
relaxed. The previous complete green baseline remains the run below until this
follow-up receives a complete Linux result.

The [Dev Track asset and fullscreen follow-up run](https://github.com/mvincetic/LAPTRIX/actions/runs/34618439504)
passes through `ce1961f` (including asset commit `cb3cb11`): 306 TypeScript tests,
152 Python tests (40.55 seconds), all 166 development journeys (56 in 12.4 minutes,
55 in 8.7 minutes and 55 in 13.1 minutes) and all 32 production journeys in 5.1
minutes. All three Linux jobs succeed, including the corrected fullscreen wait,
optional GLB recovery and byte-for-byte asset export verification.

The [three-shard run](https://github.com/mvincetic/LAPTRIX/actions/runs/34616301449)
at `d22b1f6` completes without the former job-deadline cancellation, but shard 1
fails one phone fullscreen assertion (55 other journeys pass in 8.8 minutes).
The native fullscreen state is active while the immediate canvas measurement still
reads its previous 400 px height. The downloaded failure screenshot already shows
the correctly expanded canvas. The assertion now waits for both original size
requirements within the existing 15-second expectation budget. No application
behavior or dimension threshold changes. All seven fullscreen cases pass locally
in 48.5 seconds, including enter/exit rejection and browser-originated transitions;
lint also passes. The other two Linux shards succeed. Production was skipped on
this failed run, so its successor must verify the complete pipeline.

The [annotation follow-up run](https://github.com/mvincetic/LAPTRIX/actions/runs/34613408850)
at `4ac9bf3` passes the complete gate (300 TypeScript / 152 Python tests in 42.97
seconds) and all 163 development journeys: 83 in 18.5 minutes and 80 in 17.9 minutes.
The first job is cancelled roughly 25 minutes after starting, during its production
step, at the configured job deadline. No complete remote production verdict is
available; all 31 pass locally in 4.4 minutes. This run is not recorded as green.

The initial expansion to three development shards retained production on shard 1.
The daylight follow-up above separates production after measuring the larger
scene's longer browser run. File-level grouping, one browser worker per runner,
all test cases and failure artifacts remain intact. Local list-only discovery
verifies that the three development lists form the complete suite without duplicate
or missing cases.

The [original GT coupe run](https://github.com/mvincetic/LAPTRIX/actions/runs/34610148711)
passes through `a71f838`: 300 TypeScript tests, 152 Python tests (40.95 seconds),
all 161 development journeys (81 and 80, both in 17.2 minutes), all 31 production
journeys (5.0 minutes), three original asset validators and lint/type/build gates.
Both Linux jobs pass, including the independent current/reference brake lamps.

The [telemetry readability run](https://github.com/mvincetic/LAPTRIX/actions/runs/34606306794)
passes through `fad0434`: 296 TypeScript tests, 152 Python tests (40.81 seconds),
all 159 development journeys (81 in 17.5 minutes, 78 in 17.2 minutes) and all
31 production journeys (5.0 minutes). Both jobs pass, including tiny-window
reference painting and the native-scrollbar bundled/fallback header checks.

The [Formula and typography run](https://github.com/mvincetic/LAPTRIX/actions/runs/34602624202)
passes through `2c001a9` (including `8cc0142`): all lint/asset/type/build gates,
289 TypeScript tests, 152 Python tests (32.01 seconds), 158 development journeys
(80 in 13.3 minutes, 78 in 16.8 minutes) and all 30 production journeys
(3.7 minutes). Both Linux jobs are green, including bundled/fallback header checks.

The [V7 selection run](https://github.com/mvincetic/LAPTRIX/actions/runs/34599755461)
at `63a124f` exposed a Linux loading-header wrap: shard 2 passed 77 journeys and
failed the new 320 px native-scrollbar header check. Shard 1 passed the complete
quality gate (286 TypeScript / 152 Python tests in 43.21 seconds), 80 development
journeys in 17.2 minutes and 29 production journeys in 4.6 minutes; only that same
header check failed in production. Its screenshot and trace
were inspected, and Arial fallback metrics reproduced the failure locally.
The root CSS requested `Inter` although its bundled face is `Inter Variable`.
The follow-up selects the actual family and reserves more compact action space;
bundled/fallback loading/ready/cancellation checks now pass locally. The complete
local gate passes with 289 TypeScript / 152 Python tests, 25 broader browser
journeys, 71 final visual states and all 30 production journeys (3.8 minutes).
See TYPOGRAPHY.md for the cause and final evidence. The successful run above
verifies the correction and the separately committed V8 Formula presentation.

Premium-phase [V5 viewer layer clarity](https://github.com/mvincetic/LAPTRIX/actions/runs/34596929792)
passes through `e1cffac`: 286 TypeScript tests, 152 Python tests (42.77 seconds),
all 157 development journeys (80 in 17.2 minutes and 77 in 16.5 minutes), all
29 production journeys (4.5 minutes), asset validation, lint, typecheck and build.
The working branch continues through source selection and vehicle presentation.

Premium-phase [V4 grounded trackside context](https://github.com/mvincetic/LAPTRIX/actions/runs/34595680579)
passes through `c129424`: 286 TypeScript tests, 152 Python tests (42.88 seconds),
all 154 development journeys (78 in 16.6 minutes and 76 in 16.5 minutes), all
26 production journeys (4.1 minutes), asset validation, lint, typecheck and build.
The working branch continues through viewer-tool and track-selection clarity.

Premium-phase [V2 onboard cameras and scenery bounds](https://github.com/mvincetic/LAPTRIX/actions/runs/34591968942)
passes through `b2dfff5`: 280 TypeScript tests, 152 Python tests (42.95 seconds),
all 154 development journeys (78 in 15.2 minutes and 76 in 14.9 minutes), all
26 production journeys (3.7 minutes), lint, typecheck and build. The branch
continues directly into original trackside scale cues and asset validation.

Premium-phase [V3 pavement grounding](https://github.com/mvincetic/LAPTRIX/actions/runs/34588643267)
passes through `00c6681`: 275 TypeScript tests, 152 Python tests (43.30 seconds),
all 148 development journeys (74 in 14.7 minutes and 74 in 14.2 minutes), all
22 production journeys (3.1 minutes), lint, typecheck and build. Onboard camera
work continues on the same working branch.

Premium-phase [V1 playback entry](https://github.com/mvincetic/LAPTRIX/actions/runs/34584831004)
passes through `ea810bd`: 272 TypeScript tests, 152 Python tests (31.58 seconds),
all 148 development journeys (74 in 11.0 minutes and 74 in 14.9 minutes), all
22 production journeys (2.3 minutes), lint, typecheck and build. The branch
continues directly into terrain/pavement grounding after this stable milestone.

The completed [sector annotation run](https://github.com/mvincetic/LAPTRIX/actions/runs/34581701470)
passes through `c32f9af`: 272 TypeScript tests, 152 Python tests (40.88 seconds),
all 146 development journeys (74/72 across both shards) and 20 production journeys
(2.7 minutes), plus lint/type/build checks. This is the stable baseline for the
new premium product phase in ROADMAP.md.

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

The workflow initially used two independent GitHub runner jobs with Playwright
file-level sharding; the premium presentation continuation now uses three, as
described above. Each retains one local browser worker, the existing 20-minute
suite budget and 25-minute outer job budget. File-level grouping preserves tests'
local ordering; `fail-fast: false` lets every shard report its result. The complete
lint/type/unit/API/build gate and production viewer checks run once, on shard 1.
Every job must succeed for the workflow to pass. Failure artifacts include shard
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

The [viewer-transport run](https://github.com/mvincetic/LAPTRIX/actions/runs/34575210189)
passes through `a075264`: all **140 development journeys** (70 in 13.6 minutes and
70 in 13.1 minutes), 267 TypeScript tests, 152 Python tests (43.09 seconds), all
quality gates and 14 production journeys (2.1 minutes). All three new fullscreen
transport cases pass on both development and built assets.

The portrait continuation adds two car-pixel/fullscreen journeys on both servers,
covering Formula and GT at 390/320 px with retained footer controls and paused
telemetry. The suite now discovers 142 development and 16 production journeys.

The [portrait-viewer run](https://github.com/mvincetic/LAPTRIX/actions/runs/34578910505)
passes through `828292f`: all **142 development journeys** (72 in 13.7 minutes and
70 in 10.5 minutes), 268 TypeScript tests, 152 Python tests (40.66 seconds), all
quality gates and 16 production journeys (2.2 minutes). Portrait car clearance,
compact footer containment and unchanged shared telemetry pass remotely.
