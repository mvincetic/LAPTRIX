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

## Slope components and descending braking

`tests/python/test_slope_forces.py` adds six original circular-ramp cases: horizontal
radius 80 m, 720 points, equal rising/falling halves, slope sine 0, 0.20 or 0.29,
and downforce area 0 or 1.5 m². Far from the elevation joins, steady speed is checked
against independently root-solved combined-force and 98% lateral-capacity bounds.
Horizontal velocity is road speed times slope cosine; sampled lateral acceleration
must equal its square divided by radius. Endpoint kinetic energy and exact 3D
distances reconstruct wheel demand at every node, independently of exported controls.

The previous model overestimated lateral acceleration by 9.1822% at slope sine 0.29.
It also clamped net downhill deceleration to zero and only checked start-node
braking when upstream speed was higher. The zero-downforce ramp converged while
reporting maximum demand ratio 1.148551. Correct slope components and signed
backward propagation bring that ratio to approximately 1.0; both steady half-lap
speeds agree within `1e-5` relative tolerance, and all-node combined demand within
`1e-5`. The two flat cases retain their analytical results. Four graded cases
failed before the correction and all six pass afterward.

A seventh adversarial case uses an accepted 42-point, 0.12 m-radius star. It is
numerical test geometry, not a usable road. Its initial lateral cap is 0.776 m/s,
below the ordinary 1 m/s propagation floor. The braking bisection must not invert
its bracket and raise that cap to 1 m/s. The regression verifies bounded finite
telemetry while retaining an explicit failed force diagnostic for this operating
regime; it does not claim the floor makes the result feasible.

[OpenStax's force decomposition](https://openstax.org/books/university-physics-volume-1/pages/5-6-common-forces)
supports the normal/longitudinal weight components; its
[friction model](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction)
supports scaling available friction with normal load. The road-normal aero
orientation, weight-only rolling loss and friction-circle approximation are
explicit LAPTRIX model choices. No external code or track data was copied.

Remaining limits include omitted aerodynamic tyre rolling losses, no
vertical-curvature load, constant friction, fixed aerodynamic coefficients and
no transient suspension/tyre state. The ramp joins are not a test of crest or
compression dynamics. Agreement with these equations does not establish that
omitted effects are negligible on a real track.
