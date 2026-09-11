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
Friction uses total road-normal tyre load from gravity, vertical curvature and
assumed road-normal downforce. Rolling resistance applies its fixed 0.015
coefficient to that same load. An independent crest speed cap retains 2% of
gravity-supported contact load; suspension and flight remain omitted. See
VERTICAL_LOAD.md for equations and synthetic analytical benchmarks.

## GT Development 01

`data/vehicles/gt-development.json` is a second synthetic profile. Selected anchors
come from Porsche's [EU 911 GT3 RS technical sheet, August 2022](https://newsroom.porsche.com/dam/jcr:1d390f77-93c3-49c0-89c7-634f5f02b26a/S22_3515_en.pdf):
386 kW at 8,500 RPM, 465 Nm at 6,300 RPM, 9,000 RPM redline, seven ratios
[3.75, 2.38, 1.72, 1.34, 1.11, 0.96, 0.84], final drive 4.27, drag area
0.862 m², width 1.900 m and wheelbase 2.457 m. The torque anchor converts to
306.777 kW using power = torque × angular velocity.

The remaining model choices are independent estimates: 1,400 kg fuel-exclusive
base mass, 2.2 m² fixed downforce area, 1.35 base friction, 2.1 g commanded braking
cap, 0.36 m loaded wheel radius, 1,000 RPM idle and the remaining power points.
The published 1,450 kg DIN unladen mass is **not** a dry/base mass measurement and
was not silently used as one. No claim is made that these estimates reproduce the
real vehicle. Active aero, load transfer and shift interruption remain absent.

The UI exposes each profile's parameters, assumptions and source anchors. The
original coupe mesh uses the profile's width/wheelbase/wheel radius at metre scale;
its generic shape is visual context, not manufacturer CAD. Body
style never branches the physics solver. Audio remains shared procedural synthesis.

## Contracts and comparison

Forward gear ratios must be positive and strictly decreasing; this is necessary
for the last-ratio redline speed bound. Power-curve RPM strictly increases and
covers idle through redline. `powerKw` must equal the curve's maximum. Python and
TypeScript validate these invariants, and provenance links accept HTTP(S) only.

Each new result carries the exact vehicle data used for its solve. Changing the
selected profile retains the current reference on the same source circuit. The
comparison identifies its reference vehicle and solver; saving/exporting retains
both snapshots. A failed run keeps the old result and marks pending setup/profile
changes. Older references remain readable and use a catalog-name/ID fallback.

Tests cover both drivetrains at gear boundaries, torque-to-power conversion, GT
force-demand checks, line bounds and refinement accounting. Real browser journeys
cover cross-vehicle save/reload/export and failure/retry. These establish numerical
and workflow consistency, not calibration against measured vehicle telemetry.

## User-supplied profiles

Plain vehicle JSON can be exported as a template and imported through the same
solver. Editable bounds and required assumptions are documented in VEHICLE_PROFILES.md.
Profile declarations remain unverified; accepted combinations are not guaranteed
to converge or describe a physical vehicle. Built-in inputs and historical snapshots
remain unchanged. Reruns, baselines and aero studies carry the complete inline
profile, which is also retained by local/project saves.
