# Roadmap

The initial sequence has been grouped into vertical slices so the dashboard always
consumes genuine solver output. See DECISIONS.md for the ordering rationale.

| Milestones | Current implementation |
| --- | --- |
| M0 Foundation | React/Vite + Python/FastAPI, reproducible installs, shared launcher, quality gates |
| M1 Track data | Validated local schema, original 720-sample circuit, SI units and derived frames |
| M2–M3 Procedural viewer | Indexed road mesh, synthetic terrain, interactive orbit/top views, layers |
| M4–M5 Racing line | Sparse bounded curvature approximation, convergence diagnostics, optional vehicle-aware lap-time refinement |
| M6–M8 Vehicle/speed/time | Synthetic Formula/GT profiles with provenance, periodic envelope, integrated lap time |
| M9–M10 Analysis/telemetry | Braking, turn-in, apex, throttle events; canonical closed-lap telemetry |
| M11–M13 Playback/dashboard | Ghost playback, seven synchronized plots, light engineering layout |
| M14–M15 Comparison | Corner inspection, sector reference deltas, explicit reference selection |
| M16 Audio | Original engine, harmonic, whine, wind and shift synthesis consumes playback telemetry |
| M17 Cameras | Orbit, top and telemetry chase implemented; broader cinematic modes deferred |
| M18 Model checks | Analytical circle and numerical invariants tested; real-world validation deferred |
| M19–M20 Stabilization | Browser regression, responsive QA, validated persistence, dependency audit, CI and documentation |

MVP+ already implemented: custom local track JSON import, local project save/restore,
and telemetry JSON/CSV export. They reuse existing contracts without new services.
The next solver milestone is also delivered: sparse curvature convergence through
the 2,000-point grid study, integrated braking/force checks, and opt-in 78-candidate
lap-time refinement with visible seed gains and exportable diagnostics.
Controlled source/5 m/3 m sampling, source-progress comparison across grids,
verified reference migration, and independent circle/power/rigid-transform
benchmarks are now implemented too. The source geometry remains unchanged.
The second vehicle milestone adds documented GT specification anchors, visible
assumptions, stricter drivetrain contracts and cross-vehicle references with
immutable result snapshots. A public 2D track dataset was evaluated; it does not
provide the independently documented elevation needed for a bundled 3D circuit.
Independent uphill/downhill work-balance and exported actuator-energy checks now
cover steep grades and both development profiles; see PHYSICS_BENCHMARKS.md.
Reference-file import now accepts native simulation exports and explicit external
timing data with units/provenance/source checks. Sector and corner comparisons
use matched physical intervals. Measured channel overlays and automatic logger
alignment remain separate future work; imported timing never fabricates channels.
A synchronized Time Delta view now retains both grids' breakpoints and supports
either horizontal axis, shared seeking, playback and reference changes.
Portable project files preserve names, selected setup, custom source and
references; the v1/v2 readers remain supported. Imports validate and recalculate
before activating state, and track-ID collisions preserve existing geometry.
A bounded aero study now compares five or six settings through the existing
solver, exposes progress and numerical eligibility, and applies only a selected
checked result. Stopping retains completed rows; references survive application.
Studies can now be exported with complete source inputs, every full result,
failed/unfinished states and timestamps. New laps identify the solver source and
numerical runtime. A bounded review of RACECAR, BETTY and Marzaglia is recorded in
CALIBRATION_DATA_EVALUATION.md; no suitable complete calibration/3D input was
established and no external dataset was copied.
The GT study subsequently exposed a coarse power-envelope interpolation error at
gear redlines. Exact per-gear evaluation now removes it, with breakpoint agreement
and independent integrated wheel-force checks across all five GT aero settings.
Track v2 now fixes timing gates to source positions across line/sampling changes.
Version 1 remains readable with its original distance semantics; portable imports
preserve that distinction and historical references compare at current gates.
The WebGL viewer now loads separately from the engineering workspace. Delayed or
failed downloads preserve simulation and telemetry; production-asset tests cover
the same recovery behavior as development modules.
Source geometry diagnostics now report projected crossing/touch/overlap pairs and
interpolated height gaps. The original-track diagram and report remain independent
of resampled lap geometry; complete counts survive a 100-pair detail cap.
Track imports and loaded-track selection now activate source/current/reference
together after successful calculation. Failures preserve complete exported project
contents; retries retain the intended target, and stale imports cannot add sources.
Ordinary runs and track/project imports now share explicit browser cancellation.
Cancel preserves completed data and pending setup edits, aborts active requests and
ignores late results. It does not claim to stop an already executing server worker.
The actions disclosure now supports predictable keyboard entry/exit and Escape,
with focus restoration after actions and no invisible backdrop tab stop. A bounded
default-screen audit checks accessible control names at desktop/mobile widths.
Viewer and telemetry tabs now share arrow/Home/End navigation, labelled panels and
visible focus. Camera/axis controls expose selected state; tab changes retain the
canvas, layer choices and playback position.
Cursor Data now offers exact seconds/metres entry and numerical channel values.
Inspect pauses and seeks the shared clock, invalid positions retain it, and draft
entry resets on axis/result changes. Reserved vertical dynamics stay explicit.
Native references now support an optional second ghost with independent visibility
and vehicle snapshots. Both use shared elapsed time; a completed reference holds
its finish pose. Timing-only files remain comparisons without invented positions.

## Next highest-value work

1. Make displayed zero comparison deltas neutral at their shown precision. A lap
   compared with its own export currently shows red `+0.000` and green `-0.000`
   sector differences from interpolation roundoff. Preserve full-precision data
   while keeping displayed signs, colors and labels consistent.
2. Revisit measured calibration and reusable 3D data when complete inputs are
   available; add transient dynamics only with independent benchmarks and sources.

Bounded vehicle JSON import/export is implemented through the existing solver and
cache. Activation is transactional; metadata, references, built-ins and pending edits
survive failures/cancellation. Local saves and portable v3 retain embedded profiles,
resolve collisions and preserve v1/v2 installed-profile rules. Declared parameters
and sources remain visibly unverified; see VEHICLE_PROFILES.md.
Project naming now works at every width through a native dialog with separate
drafts, explicit application and reliable return focus. It preserves simulation,
pending setup and playback, and uses the existing Save/export name contract.
Native-reference channel overlays now preserve both sampling grids and source
correspondence on current-lap axes. Optional dashed curves share channel scales
and R cursor readings; timing-only imports cannot acquire channels. Horizontal
tick and sector text retain their font size on narrow screens.
Sector-focused inspection now shares one range across channel and time-delta
plots, retaining canonical paths, scales and playback. Explicit actions inspect
the first gate or reset the full view. Outside cursors are labelled; successful
new results reset the selection. Desktop content sizing keeps playback reachable.
Channel scale limits and signed zero guides now expose the full-lap display domains
for current/native curves. Shared row geometry keeps labels aligned at desktop and
mobile widths, including sector windows and wrapped captions.
Reviewed GPX 1.1 import now converts one bounded circuit with complete elevations.
Users inspect its start, closure, dimensions and width assumptions before the
existing transactional pair solve. Failed runs retain the reviewed draft for retry;
local Save and portable projects preserve converted geometry and provenance.
Source elevation and conventional grade now use original closed chords, with raw
totals, exact segment inspection and complete profile exports. Settings open a
bounded dialog that preserves selection on closure; GPX review embeds the same
plots. Inspection preserves playback and project state, including after resampling.
See SOURCE_PROFILES.md for source-noise and slope-definition limits.
Camera fitting now includes source road edges and uses reachable zoom limits and
source-scaled clipping planes. A valid large source remains rendered on mobile;
independent projection and framebuffer checks cover fit/reset/resizing without
changing simulation or playback. See CAMERA_FRAMING.md.
The north arrow now projects track north through the actual camera, including
manual orbit and shared-clock chase. Reset drains residual orbit damping before
applying its fit. Direction labels are accessible, and camera actions retain the
complete workspace. See CAMERA_FRAMING.md for projection and reset evidence.
Slope-normal weight, projected horizontal speed and signed downhill braking now
use consistent quasi-steady equations. Six independent circular-ramp cases protect
the correction alongside updated uphill/downhill and actuator-work checks. An
adversarial sub-1 m/s case protects the braking bracket from increasing a lateral
cap and retains its failed force diagnostic. Flat analytic cases remain stable;
the current production sampling study reports the
changed graded laps and unchanged source identity. See PHYSICS_BENCHMARKS.md.
Initial optimized seeds and refinement candidates now share geometry-domain
checks. Unsupported slopes and reversed intervals fail before the speed envelope
with Centerline recovery advice. Actual API/browser tests preserve the complete
workspace on failure and recover the valid source; phone errors use a full text
row above their actions. See LINE_GEOMETRY.md.
Source fingerprints now encode exact zero consistently in Python and TypeScript,
retaining every other numeric bit and existing positive-zero hashes. Verified
legacy migration preserves timing/telemetry and avoids false project collisions;
missing sign information is not guessed. See SOURCE_IDENTITY.md.
Reference imports now check their own ordering and the workspace calculation
generation through file reads, hashes and errors. New imports, explicit reference
selection and calculations supersede older work without stale data or feedback.
Current failures retain retry, playback and completed reference data. Seven browser
cases cover delayed reads/hashes and newer choices; see REFERENCE_IMPORT.md.

## Stabilization evidence

The local numerical/API suite contains 116 passing tests, including coupled quadratic
oracles, grid convergence, refinement accounting, start/finish rotation and setup
extremes and analytical work/grip benchmarks. The 101 TypeScript tests cover
geometry, source contacts, alignment, project/reference validation, comparison
eligibility, native channel plots/scales, sector viewport mapping, vehicle contracts,
ghost poses, local geographic conversion, source elevation/grade, camera projection,
north direction, verified signed-zero migration and clock/data invariants.
Seventy-one browser journeys cover the
core workflow, refinement, resampling, cross-vehicle reference restore, imports,
audio, aero comparison application/failure/cancellation, viewer downloads, geometry
reports, failed/superseded track activation, calculation cancellation, keyboard actions/tabs,
precise cursor inspection, reference ghosts, embedded vehicle profiles, project naming,
native channel overlays, sector graph inspection, reviewed GPX import, source
profile inspection/export, large-track camera visibility, orbit/reset/chase north,
unsupported optimized-line recovery, signed-zero reference/project round trips,
ordering of delayed reference reads/hashes including asynchronous read rejection, and the
optional structured-tool contract. Two viewer journeys also run against production
assets. See VALIDATION.md
for the final record. The first remote CI run passed on the working branch.

The scoped MVP and selected MVP+ extensions are implemented. Numerical accuracy
beyond the stated development model remains a next phase. No release to main or
public application deployment is performed.

No external credentials, paid services or proprietary assets are needed for the
current local MVP. Push only the working branch; never merge into main automatically.
