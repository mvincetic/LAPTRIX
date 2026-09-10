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
Before its speed envelope, an optimized seed must pass the same finite-coordinate,
forward-progress and slope checks used for refinement candidates. Unsupported
geometry returns an actionable API error; centerline mode remains available for
the validated source. See LINE_GEOMETRY.md for thresholds and failure behavior.

## Optional lap-time refinement

`setup.solver = "lap-time"` starts from that curvature seed. Three sequential passes
(blend fractions 0.3, 0.15, 0.075) test a whole-lap blend and twelve periodic cosine
windows toward each safe boundary: 78 candidates. Window centers are spaced by
centerline distance, anchored at the point farthest from the arc-weighted horizontal
centroid. This preserves the candidate order when translating/rotating the map or
moving the start/finish index; a rigid-transform benchmark checks the result.

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
speed-dependent downforce. For slope angle `theta`, road speed `v` projects to
horizontal speed `v cos(theta)`, so lateral acceleration is
`v² cos²(theta) curvature`. Gravity-supported normal load is `m g cos(theta)`;
the aerodynamic downforce term is assumed to act normal to the road. The initial
cap reserves 2% of lateral capacity, with the full longitudinal force balance
enforced by the sweeps below. Top speed is also bounded by top gear redline.

Closed-loop backward braking and forward acceleration sweeps propagate constraints
through the start/finish seam until the envelope converges or 80 sweeps finish.
Longitudinal grip uses the residual of a friction circle after lateral demand.
Acceleration is limited by interpolated power, 94% efficiency and grip; braking by
the configured maximum and grip. Drag, a 0.015 rolling coefficient and gravity along
the local gradient are included. Rolling loss applies to gravity-supported normal
load only (`0.015 m g cos(theta)`); aerodynamic tyre rolling losses are omitted.
Longitudinal gravity remains `m g sin(theta)`, with the outgoing source/solved chord
defining `sin(theta) = rise / 3D length`. The aerodynamic terms use selected air density.
Power is evaluated separately on each gear's piecewise-linear RPM curve before
taking the maximum valid value. `drivetrain.py` precomputes interval slopes for
scalar sweep evaluation. It preserves the discontinuity when a gear exceeds
redline and the intersections between gear curves; it does not interpolate a
coarse, uniformly sampled maximum-power envelope. Exported gear/RPM selection uses
the equivalent vector calculation, with breakpoint and redline-side tests checking
agreement. Both paths retain the same idle clamp and redline rules.
Backward propagation also verifies start-node braking capacity with a bounded
scalar solve; downstream grip alone can overestimate available deceleration.
Net deceleration may be negative on a steep descent: full braking need not prevent
acceleration. Backward propagation retains that sign, and the start-node check
applies even when upstream speed is below downstream speed. Its 24-step bisection
starts at the existing 1 m/s propagation floor, or at the candidate when its
lateral cap is already lower. Its bracket can never increase that cap. The floor
can leave such very-low-speed inputs infeasible; the force diagnostic still fails
in that case. Convergence alone is not an eligibility guarantee.

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
the curvature peak, not a surveyed kerb apex. Track v2 sector fractions map to fixed
source-centerline positions through the same alignment used for references. Their
solved distances define sample sector IDs, interpolated splits and chart markers.
Track v1 keeps legacy racing-line-distance fractions. Both modes exactly partition
the lap, and explicit source intervals accompany new results. See TRACK_FORMAT.md.

Tests check an analytical flat circle, combined grip, RPM/brake bounds, integration,
closed seam, bounds, objective improvement, setup response and API contracts.
These are numerical/model checks, **not real-world physics validation**. No CFD,
load transfer, tyre temperature state, banked-road dynamics, vertical dynamics,
energy recovery, fuel burn or shift-time loss is calculated.
See SOLVER_STUDY.md for grid sensitivity; interpolation adds no input accuracy.
Source and optional uniform grids are prepared before the line solve; see
SAMPLING.md. Analytical benchmarks include circular aero/grip limits, nonuniform
circle resampling and power-limited terminal speed from an independent work balance.
PHYSICS_BENCHMARKS.md records uphill/downhill steady-speed equations and closed-lap
wheel-work checks reconstructed from exported controls for both vehicles.
It also documents independent circular-ramp checks for slope-normal load, projected
lateral acceleration and descending braking. Corner lateral G and sampled lateral G
reuse the same signed acceleration used by the speed envelope. Steering remains the
existing schematic plan-view bicycle estimate, not solved steering dynamics.
