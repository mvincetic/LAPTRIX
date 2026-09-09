# Development simulation model

`apps/simulation/solver.py` is original code. It produces a flying lap through a
closed circuit, not acceleration from a standing start.

## Racing line

Offsets are applied along the centerline's horizontal normal. Bounds retain vehicle
half-width plus 0.35 m clearance from each boundary. A sparse quadratic minimizes
the distance integral of squared spatial second derivatives plus a `1e-8` offset
regularizer integrated over distance. The periodic derivative uses both neighboring
segment lengths, including nonuniform spacing. An original feasible active-set
algorithm solves free-variable Newton steps with SciPy's sparse linear solver,
stops at bounds, and releases bounds with incorrect multipliers. Convergence uses
the projected-gradient residual below `1e-9`. The cap is five iterations per sample;
the bounded iterate is retained and flagged if the cap is reached. Centerline mode
bypasses optimization and rejects a car that cannot fit there with clearance.

This is a small-offset minimum-curvature approximation. It does **not** prove a
minimum-lap-time trajectory, and an objective improvement need not improve lap time
on every imported track or vehicle. The separate speed solver makes that observable.

## Optional lap-time refinement

`setup.solver = "lap-time"` starts from that curvature seed. Three sequential passes
(blend fractions 0.3, 0.15, 0.075) test a whole-lap blend and twelve periodic cosine
windows toward each safe boundary: 78 candidates. Window centers are spaced by
centerline distance, anchored at the lexicographically smallest x/z sample, so
moving the start/finish index does not arbitrarily reorder the search.

Each candidate retains the original centerline sample correspondence. Blending
toward the existing bounds preserves per-sample clearance. Collapsed/reversed
segments and gradients outside the supported range are rejected. The selected
vehicle and setup score each candidate using the full speed envelope and integrated
lap time. Only improvements above `1e-5` seconds with a converged envelope and force
demand ratio at most 1.015 are accepted. A failed seed check skips refinement;
otherwise the seed is retained if no candidate improves it.

The budget is fixed, deterministic and intentionally small. This is a local search,
not a minimum-time optimal-control solve or a convergence proof. `optimization`
convergence/residual/iterations describe the **curvature seed**; its objective
reduction describes the **final line**. Separate `refinement` diagnostics report
seed time, actual gain, candidate counts, accepted/rejected changes and status.

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
Backward propagation also verifies start-node braking capacity with a bounded
scalar solve; downstream grip alone can overestimate available deceleration.

Per-segment time is `2 * ds / (v_start + v_end)`, corresponding to constant segment
acceleration. The complete closing segment contributes to lap time. Throttle and
brake are normalized wheel-force requests; gears/RPM follow the drivetrain table.
Before actuator clipping, integrated wheel demand is checked against the combined
friction circle, available drive and braking. `numericalChecks` reports the largest
demand/capacity ratio, a 1.015 numerical tolerance and envelope convergence. This
checks the discrete model at samples, not continuous or transient feasibility.

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
See SOLVER_STUDY.md for grid sensitivity; interpolation adds no input accuracy.
