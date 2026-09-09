# Roadmap

The initial sequence has been grouped into vertical slices so the dashboard always
consumes genuine solver output. See DECISIONS.md for the ordering rationale.

| Milestones | Current implementation |
| --- | --- |
| M0 Foundation | React/Vite + Python/FastAPI, reproducible installs, shared launcher, quality gates |
| M1 Track data | Validated local schema, original 720-sample circuit, SI units and derived frames |
| M2–M3 Procedural viewer | Indexed road mesh, synthetic terrain, interactive orbit/top views, layers |
| M4–M5 Racing line | Bounded minimum-curvature approximation, convergence diagnostics |
| M6–M8 Vehicle/speed/time | Synthetic configurable Formula car, periodic envelope, integrated lap time |
| M9–M10 Analysis/telemetry | Braking, turn-in, apex, throttle events; canonical closed-lap telemetry |
| M11–M13 Playback/dashboard | Ghost playback, seven synchronized plots, light engineering layout |
| M14–M15 Comparison | Corner inspection, sector reference deltas, explicit reference selection |
| M16 Audio | Original engine, harmonic, whine, wind and shift synthesis consumes playback telemetry |
| M17 Cameras | Orbit, top and telemetry chase implemented; broader cinematic modes deferred |
| M18 Model checks | Analytical circle and numerical invariants tested; real-world validation deferred |
| M19–M20 Stabilization | Browser regression, responsive QA, validated persistence, dependency audit, CI and documentation |

MVP+ already implemented: custom local track JSON import, local project save/restore,
and telemetry JSON/CSV export. They reuse existing contracts without new services.

## Next highest-value work

1. Improve the solver with resolution/convergence studies and a vehicle-aware
   lap-time refinement stage. Only claim greater accuracy after evidence.
2. Evaluate reusable surveyed track data and a second independently documented vehicle.
3. Add user telemetry import only after a reliable alignment/unit/provenance contract.

## Stabilization evidence

The local numerical suite contains 26 passing tests, including a start/finish
rotation regression and setup extremes. Twelve TypeScript tests cover geometry and
clock/data invariants. Six browser journeys cover the core workflow, reference
restore, imports, audio and the optional structured-tool contract. See VALIDATION.md
for the final record. The first remote CI run passed on the working branch.

The scoped MVP and selected MVP+ extensions are implemented. Numerical accuracy
beyond the stated development model remains a next phase. No release to main or
public application deployment is performed.

No external credentials, paid services or proprietary assets are needed for the
current local MVP. Push only the working branch; never merge into main automatically.
