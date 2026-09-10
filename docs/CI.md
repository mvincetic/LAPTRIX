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
