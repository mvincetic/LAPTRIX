# Development simulation model

`apps/simulation/solver.py` is original code. It produces a flying lap through a
closed circuit, not acceleration from a standing start.

## Racing line

Offsets are applied along the centerline's horizontal normal. Bounds retain vehicle
half-width plus 0.35 m clearance from each boundary. SciPy L-BFGS-B minimizes a
spacing-weighted sum of squared second position differences and a tiny offset
regularizer. An analytic gradient makes a 720-variable solve practical. Centerline
mode bypasses optimization. A feasible best result is retained on iteration limits;
the result reports convergence, iteration count and objective reduction.

This is a small-offset minimum-curvature approximation. It does **not** prove a
minimum-lap-time trajectory, and an objective improvement need not improve lap time
on every imported track or vehicle. The separate speed solver makes that observable.

## Speed envelope

Horizontal Menger curvature gives a lateral speed cap from tyre friction plus
speed-dependent downforce. The model reserves 2% of lateral capacity for sustaining
speed against drag and gradient. The top speed is also bounded by top gear redline.

Closed-loop backward braking and forward acceleration sweeps propagate constraints
through the start/finish seam until the envelope converges or 80 sweeps finish.
Longitudinal grip uses the residual of a friction circle after lateral demand.
Acceleration is limited by interpolated power, 94% efficiency and grip; braking by
the configured maximum and grip. Drag, a 0.015 rolling coefficient and gravity along
the local gradient are included. The aerodynamic terms use the selected air density.

Per-segment time is `2 * ds / (v_start + v_end)`, corresponding to constant segment
acceleration. The complete closing segment contributes to lap time. Throttle and
brake are normalized wheel-force requests; gears/RPM follow the drivetrain table.

## Analysis

Corners are automatically detected as sufficiently prominent curvature peaks,
including peaks around the seam. Entry/exit thresholds delimit each event, and
braking/turn-in/throttle pickup indices reference canonical telemetry. Apex means
the curvature peak, not a surveyed kerb apex. Sector times interpolate at the
configured fractions and exactly sum to the lap time.

Tests check an analytical flat circle, combined grip, RPM/brake bounds, integration,
closed seam, bounds, objective improvement, setup response and API contracts.
These are numerical/model checks, **not real-world physics validation**. No CFD,
load transfer, tyre temperature state, banked-road dynamics, vertical dynamics,
energy recovery, fuel burn or shift-time loss is calculated.
