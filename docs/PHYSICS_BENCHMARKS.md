# Independent physics benchmarks

These tests evaluate equations and numerical consistency of the declared
point-mass model. They do not validate real vehicle performance.

`tests/python/test_physics_benchmarks.py` checks circular lateral limits against an
independently evaluated aerodynamic grip equation, nonuniform-source resampling,
power-limited speed against a scalar work balance and rigid-transform invariance.

`tests/python/test_gradient_energy.py` adds two independent checks:

- A roughly 16 km closed loop has equally long uphill/downhill arcs at 5%, 20%
  and 29% gradient. A constant-power test profile isolates road load from gear
  changes. Far from transitions, computed speed must be within 0.1% of a separately
  root-solved equation: `0.94 P = 0.5 rho CdA v³ + m g (0.015 cos(theta) + grade) v`.
  Here gradient is rise divided by 3D segment length, so it is the sine of slope.
  This fixture has zero downforce and zero vertical curvature away from the joins.
  Both signs pass, and full-loop force-demand/convergence checks also pass.
- For both development vehicles on the original elevation circuit, wheel work is
  reconstructed from exported throttle/brake, selected gear/RPM relationships and
  independent grip/power equations. Drive work minus brake work must equal sampled
  drag and rolling losses within 0.1% of drive work. Net gravity work is zero around
  the closed loop, as is the kinetic-energy change at its matching-speed endpoint.
  Both profiles pass. This checks delivered controls rather than simply summing
  the solver's required-force array; capacity clipping can create a small residual.
  Normal load now includes vertical curvature and downforce, and rolling loss uses
  that complete load. A separate turn-angle/opposite-chord construction derives
  vertical curvature for the work oracle, independently of the production cross
  product. The 0.1% work tolerance is unchanged.

Run `node scripts/python.mjs -m pytest tests/python/test_gradient_energy.py -q` for
the five grade/energy cases. The full suite also covers line bounds, analytical
quadratic solutions, setup response and both production drivetrains.

`tests/python/test_drivetrain_envelope.py` adds seven regression cases. The scalar
power evaluator agrees with the independent vector gear/RPM calculation over
4,001 evenly spaced speeds, every power-curve breakpoint and both sides of all
gear redlines for both vehicles. Five GT aero cases independently reconstruct
wheel-force demand from endpoint kinetic energy, drag, rolling loss and exported
grade; drive demand stays within exact available power to `1e-8` relative tolerance.
The rolling term includes full normal load, with vertical curvature independently
reconstructed from chord turning angles.
The broader combined-force tolerance remains 1.015. The formerly failing GT rows
now report maximum demand ratios within floating-point roundoff of 1.0.

## Slope components and descending braking

`tests/python/test_slope_forces.py` adds six original circular-ramp cases: horizontal
radius 80 m, 720 points, equal rising/falling halves, slope sine 0, 0.20 or 0.29,
and downforce area 0 or 1.5 m². Far from the elevation joins, steady speed is checked
against independently root-solved combined-force and 98% lateral-capacity bounds.
Horizontal velocity is road speed times slope cosine; sampled lateral acceleration
must equal its square divided by radius. Endpoint kinetic energy and exact 3D
distances reconstruct wheel demand at every node, independently of exported controls.
Following the vertical-load extension, this oracle includes exact signed curvature
at the two ramp joins and uses total normal load in rolling resistance. Its original
steady-speed and all-node force tolerances remain unchanged.

The previous model overestimated lateral acceleration by 9.1822% at slope sine 0.29.
It also clamped net downhill deceleration to zero and only checked start-node
braking when upstream speed was higher. The zero-downforce ramp converged while
reporting maximum demand ratio 1.148551. Correct slope components and signed
backward propagation bring that ratio to approximately 1.0; both steady half-lap
speeds agree within `1e-5` relative tolerance, and all-node combined demand within
`1e-5`. The two flat cases retain their analytical results. Four graded cases
failed before the correction and all six pass afterward.

A seventh adversarial case uses an accepted 42-point, 0.12 m-radius star. It is
numerical test geometry, not a usable road. Its original lateral cap was 0.776 m/s,
below the ordinary 1 m/s propagation floor. The braking bisection must not invert
its bracket and raise that cap to 1 m/s. The regression verifies bounded finite
telemetry while retaining an explicit failed force diagnostic for this operating
regime; it does not claim the floor makes the result feasible.
The current oracle independently calculates each node's cap with vertical curvature;
all remain below 1 m/s and none may be raised by the braking bisection.

[OpenStax's force decomposition](https://openstax.org/books/university-physics-volume-1/pages/5-6-common-forces)
supports the normal/longitudinal weight components; its
[friction model](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction)
supports scaling available friction with normal load. The road-normal aero
orientation, fixed rolling coefficient and friction-circle approximation are
explicit LAPTRIX model choices. No external code or track data was copied.

## Crest and compression load

Fourteen cases in `tests/python/test_vertical_load.py` independently check signed
vertical curvature, normal-load projection and contact-limited speed. Eight circular
arc cases cover unequal spacing, both signs and rigid transforms. Two straight-grade
cases give zero curvature. Three smooth closed waves compare with analytically
differentiated continuous geometry at 360/720/1,440 points, checking quadratic
geometric error reduction, independent friction demand and crest speed. A separate
straight-crest stadium checks the contact bound where lateral demand is zero.
Exact tolerances, telemetry semantics and equations are in VERTICAL_LOAD.md.

The updated slope/work/drivetrain oracles retain their former tolerances. Initial
failures using old static-load/weight-only rolling expectations are preserved in
`artifacts/vertical-load-existing-oracles.log`; corrected focused checks pass in
`artifacts/vertical-load-oracles-final.log`. The complete 130-test Python suite
passes in `artifacts/vertical-load-check-final.log`.

Remaining limits include constant friction, fixed aerodynamic coefficients,
unfiltered elevation noise and no transient suspension/tyre state or flight. These
are discrete point-mass checks. Agreement with the equations does not establish
that omitted effects are negligible on a real track.
