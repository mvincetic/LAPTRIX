# Product

LAPTRIX is a browser-based racing engineering and lap-optimization workspace. A
user chooses a circuit, vehicle and setup, calculates a theoretical development
lap, then inspects the racing line, speed, braking, apexes, sectors and telemetry.
The experience should resemble compact professional engineering software.

The current product is local: one original synthetic elevation circuit, Formula
and GT development profiles and dry conditions. Users can compare a setup or vehicle against a
reference, inspect individual corners, play a telemetry-driven ghost, scrub the
lap, save settings on their device and export results. Track JSON import extends
the same generic pipeline rather than adding track-specific UI logic.

Success means all 16 MVP actions in the founding brief work end to end: launch,
track and vehicle selection, procedural interactive 3D, simulation, optimized
line, plausible speed, lap time, braking/apex/throttle inspection, sector/corner
analysis, ghost playback, synchronized seeking, all required charts, reference
dashboard design, documented local startup and important automated tests.

The theoretical result is an approximation. Minimum curvature does not establish
a globally fastest lap. Synthetic inputs and development physics must remain
visible in the interface and exported data. Precision in formatting is useful for
repeatable comparisons, not evidence of real-world accuracy.

Future work may add independently sourced circuits, additional vehicle generations,
validated tyre and transient dynamics, user telemetry comparison, setup sweeps,
more cameras and licensed audio. Prefer correctness and workflow quality over a
large catalog of weakly supported features.
