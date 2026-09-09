# Bounded aero comparison

Open **Additional actions → Compare aero settings**. The study runs the selected
starting aero value followed by -5, -2, 0, +2 and +5, removing duplicates. There
are five or six candidates, including any nonstandard starting value. Track,
vehicle, fuel, tyres, conditions, sampling and solver mode stay fixed. The current
selected setup is used, including pending changes that have not been simulated.

Each row comes from the ordinary simulation API. Requests run sequentially; the
dialog reports progress, lap time, signed delta against a newly calculated run
at the starting setting, and numerical eligibility. Eligibility requires line
and speed convergence plus maximum force demand within the solver's reported
tolerance. Missing diagnostics and failed checks exclude a result from selection.
An excluded or failed starting run leaves deltas unavailable. Failed requests
remain inspectable while the rest of the bounded queue continues.

The fastest eligible result is selected after completion or stopping. It is best
only among the checked candidates, not proof of a global optimum. Users may
select another checked run. **Apply selected result** installs that exact setup
and Lap output, resets the shared playback clock, and retains the reference.
The ordinary Save and project export actions then preserve the applied setup.
Closing the dialog leaves the workspace unchanged and discards the study.

After completion or Stop, **Export study JSON** downloads a
`laptrix-aero-study-v1` record. It contains the project name, original source track
and fingerprint, full vehicle snapshot, starting setup, candidate order, selected
and fastest checked aero values, and every completed Lap including all telemetry,
sampling points, numerical checks, warnings and solver provenance. Failed rows
retain their error; unfinished rows are explicitly `not-run` with no result.
Unavailable baseline deltas are null. Selection does not imply application.

The report records UTC request-start, finish and export timestamps. These describe
the study workflow: an API cache hit can reuse a previously calculated Lap. The
report is an archival artifact, not a project-import format. A completed candidate's
`result` object is a normal native Lap that can be imported as a reference against
its matching source. Reports may be several megabytes on fine sampling grids.

New Lap outputs include `solverProvenance`: a SHA-256 fingerprint of the listed
Python solver/model/sampling sources plus Python, NumPy, SciPy, OS and architecture
identifiers. The fingerprint sorts file names and normalizes CRLF to LF, so a
Windows checkout and Linux checkout identify identical text consistently. It is
captured at process import time, and server restarts load changed source. Older
Laps without provenance remain readable and have unknown implementation identity.
This record aids comparison; it does not guarantee bit-identical results across
different native numerical libraries or hardware.

Stop or close aborts the browser's current fetch and prevents queued candidates
from starting. A synchronous solve already executing on the server may finish;
this is not server-side job cancellation. Completed checked rows remain usable
after Stop. Run again starts a fresh study. Closing also restores keyboard focus
to Additional actions, and the native modal keeps the background workspace inert.

Aero is the existing dimensionless development control coupling drag and
downforce, not a measured wing angle. All other model limitations still apply.
The comparison does not write data to an external service, alter vehicle
parameters, or introduce a second solver or playback clock.
