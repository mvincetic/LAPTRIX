# Vehicle model

`data/vehicles/formula-development.json` defines an explicitly synthetic Formula
vehicle, not a specification for any real team or season. Current parameters:
790 kg dry mass, 610 kW peak power, 1.12 m² drag area, 3.6 m² downforce area,
1.55 base tyre friction, 4.8 g maximum commanded braking, eight gears, a 3.25 final
drive, 0.34 m wheel radius and 4,000–12,500 RPM operating range.
The configured 3.6 m wheelbase drives the approximate steering angle, keeping this
vehicle-specific dimension out of generic UI and solver constants.

`powerCurve` is an increasing RPM table in kW. At a candidate speed, the model
calculates engine RPM for each gear, interpolates available power, rejects
over-redline gears and selects the gear with the most power. Drivetrain efficiency
is 94%. Gear changes currently have no torque-interruption or lap-time penalty.
RPM is held at idle below the clutch engagement region; clutch dynamics are omitted.

Fuel is added to vehicle mass and is constant for the lap. Tyre compounds multiply
friction (soft 1.04, medium 1.00, hard 0.96). A green track multiplies grip by 0.92.
Temperature applies a shallow quadratic grip reduction around 28°C, intentionally
an illustrative setup response rather than a validated thermal tyre model.

Aero setup shifts downforce area by 5.5% and drag area by 4.5% per step. Brake bias
applies an approximate efficiency penalty away from 56% front; there is no axle-load
or lockup calculation. The UI does not claim those approximations model actual
front/rear balance. Air density is configurable in kg/m³.

Future models should replace these approximations behind the solver interface,
using documented, reusable data. Add tests for drivetrain constraints, setup
response and source provenance when adding a vehicle.
