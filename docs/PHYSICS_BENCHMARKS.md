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
  root-solved equation: `0.94 P = 0.5 rho CdA v³ + m g (0.015 + grade) v`.
  Here gradient is rise divided by 3D segment length, so it is the sine of slope.
  Both signs pass, and full-loop force-demand/convergence checks also pass.
- For both development vehicles on the original elevation circuit, wheel work is
  reconstructed from exported throttle/brake, selected gear/RPM relationships and
  independent grip/power equations. Drive work minus brake work must equal sampled
  drag and rolling losses within 0.1% of drive work. Net gravity work is zero around
  the closed loop, as is the kinetic-energy change at its matching-speed endpoint.
  Both profiles pass. This checks delivered controls rather than simply summing
  the solver's required-force array; capacity clipping can create a small residual.

Run `node scripts/python.mjs -m pytest tests/python/test_gradient_energy.py -q` for
the five grade/energy cases. The full suite also covers line bounds, analytical
quadratic solutions, setup response and both production drivetrains.

`tests/python/test_drivetrain_envelope.py` adds seven regression cases. The scalar
power evaluator agrees with the independent vector gear/RPM calculation over
4,001 evenly spaced speeds, every power-curve breakpoint and both sides of all
gear redlines for both vehicles. Five GT aero cases independently reconstruct
wheel-force demand from endpoint kinetic energy, drag, rolling loss and exported
grade; drive demand stays within exact available power to `1e-8` relative tolerance.
The broader combined-force tolerance remains 1.015. The formerly failing GT rows
now report maximum demand ratios within floating-point roundoff of 1.0.

Remaining limits include fixed rolling resistance without slope-normal correction,
no vertical-curvature load, constant friction, fixed aerodynamic coefficients and
no transient suspension/tyre state. The grade equation intentionally tests that
declared approximation. Agreement with it is not evidence that these omitted
effects are negligible on a real track.
