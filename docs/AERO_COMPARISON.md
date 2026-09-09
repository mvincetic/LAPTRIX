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

Stop or close aborts the browser's current fetch and prevents queued candidates
from starting. A synchronous solve already executing on the server may finish;
this is not server-side job cancellation. Completed checked rows remain usable
after Stop. Run again starts a fresh study. Closing also restores keyboard focus
to Additional actions, and the native modal keeps the background workspace inert.

Aero is the existing dimensionless development control coupling drag and
downforce, not a measured wing angle. All other model limitations still apply.
The comparison does not write data to an external service, alter vehicle
parameters, or introduce a second solver or playback clock.
