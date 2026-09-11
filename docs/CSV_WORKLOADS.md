# Local CSV workload measurements

`node scripts/csv-workload-profile.mjs` measures the actual browser helper modules
on original synthetic inputs. It records three repeats of eight workloads at
normal CPU and Chromium's synthetic six-times CPU slowdown. Fixture construction
is outside each timer; browser frames separate repetitions. `File.text()` reads
an in-memory File, so its time excludes disk access. These are local observations,
not a real-device benchmark or latency guarantee. Heap usage and peak memory were
not measured.

Import fixtures pass the existing timing-reference contract. Export fixtures are
original analytical function inputs used for timing/profile math, not native
files accepted through the project importer or measured vehicle recordings. They
retain closed circular sample positions and monotonic time/source progress. The
fixed synthetic timestamp and generator make output sizes reproducible.

## Import cost before background processing

The complete baseline contains these parse-only ranges, in milliseconds:

| Original input | Bytes | Records / columns | Normal CPU | Synthetic 6× CPU |
| --- | ---: | ---: | ---: | ---: |
| Ordinary timing | 18,902 | 721 / 2 | 0.3–4.1 | 1.7–2.5 |
| Maximum record count | 769,722 | 20,000 / 2 | 9.1–28.0 | 68.8–76.7 |
| Quoted multiline notes | 4,849,738 | 20,000 / 3 | 161.7–194.3 | 571.5–679.1 |
| Maximum columns | 4,950,766 | 20,000 / 64 | 66.5–82.6 | 456.6–465.9 |
| Long fields | 4,901,949 | 50 / 3 | 246.8–369.6 | 631.9–703.2 |

At 20,000 records, conversion separately costs about 59–77 ms and canonical
validation 53–63 ms under slowdown. The long-field fixture has 98,000-character
fields, within the existing 100,000-character bound. The first draft of the
64-column generator exceeded 5 MB and was correctly rejected by the harness;
the final generator uses shorter notes and fits all import limits. Its initial
log is retained, rather than counted as an accepted workload.

These synchronous functions executed on the UI thread in the baseline importer.
The measured larger accepted files motivated the dedicated CSV review worker;
the pure parser and conversion contract retain their existing limits and results.

## Actual dialog with background review

`node scripts/csv-review-profile.mjs` measures file selection through appearance of
the actual converted preview, using a MutationObserver timestamp rather than the
test runner's polling completion. Original fixtures are written before measurement
and passed as file paths, avoiding a base64 upload in the measured UI handler.
These variants use LF endings and a shorter note header, so byte counts differ
slightly from the helper baseline. Each is accepted under the same contract.

| Input / bytes | Normal preview latency | Normal maximum frame gap | 6× preview latency | 6× maximum frame gap |
| --- | ---: | ---: | ---: | ---: |
| 721 records / 18,181 | 58.1–85.5 ms | 22.1–25.7 ms | 590.5–879.2 ms | 172.4–281.8 ms |
| 20,000 with notes / 4,829,736 | 485.7–562.3 ms | 39.0–60.2 ms | 791.5–1,007.1 ms | 191.1–251.5 ms |
| 50 long fields / 4,901,897 | 597.5–701.9 ms | 25.7–53.2 ms | 687.8–1,367.3 ms | 206.2–302.2 ms |

Three repetitions per input/rate preserve pending fuel 21 and cursor 20, with zero
simulation requests and runtime errors. An instrumented UI File reader rejects
these fixture names, verifying that review reads occur in the worker. Every review
delivers loaded/prepared replies, and animation callbacks continue during the
operation. Normal large-file reviews record 30–44 callbacks through the first frame
after the preview; none records a PerformanceObserver long task. The slowed run
records four long tasks of 51–61 ms and substantially larger frame gaps. These
metrics differ: callback spacing includes scheduling delays, not just task duration.

Latency includes worker startup, file read, parsing, conversion, message copying
and preview rendering. It is not directly comparable with the baseline parse-only
timer. CPU throttling is applied to the page's CDP target; a uniform multiplier
across worker and browser scheduling is not established. No performance threshold
or real-device guarantee follows from these local development-build observations.
Canonical schema validation and source fingerprinting on Apply are outside this
review measurement and remain on the main thread. The worker removes parsing from
that thread; it does not eliminate all interface work or pauses under slowdown.

Evidence is `artifacts/csv-review-profile.{json,log}`. The first probe included
test-runner polling delay in elapsed time; its complete records are retained as
`csv-review-profile-initial.{json,log}`, not used for the table above.

## Comparison serialization allocation change

The original serializer made 18 short pair arrays and a flattened array per row.
It now appends both values directly to one row array and preallocates output lines.
Canonical headers, numeric precision, CRLF, empty unavailable channels and row order
remain the same. No interpolation or report-generation behavior changed.

| CSV rows | CSV bytes | Normal before | Normal after | 6× before | 6× after |
| --- | ---: | ---: | ---: | ---: | ---: |
| 721 native | 197,449 | 3.2–4.3 ms | 2.3–2.6 ms | 28.8–35.6 ms | 14.6–22.8 ms |
| 4,000 native | 1,080,688 | 19.4–22.2 ms | 10.5–12.4 ms | 171.4–202.3 ms | 71.1–78.8 ms |
| 21,999 timing comparison | 4,237,844 | 105.5–111.6 ms | 42.5–53.1 ms | 957.9–981.8 ms | 328.8–334.2 ms |

The largest report's JSON is 17,553,876 bytes. Its report construction still costs
415–441 ms and JSON serialization 394–417 ms in the follow-up slowed run. The CSV
optimization therefore reduces a measured part of the work; large exports still
benefit from background generation. Other stage timings vary between runs, and
the synthetic slowdown is not a uniform multiplier for allocation or collection.

Each profile verifies CSV row count and exact progress/current/reference/delta
values against the generated report. The existing 13 comparison tests retain
canonical units, independent values, blank channels, precision and maximum grids.
Full baseline/follow-up records are `artifacts/csv-workload-profile-before.json`
and `csv-workload-profile-after.json`, with matching logs. The script's latest
result is `csv-workload-profile.json`; rerunning it replaces that latest result.
