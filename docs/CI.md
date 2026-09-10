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
