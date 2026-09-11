# Product

LAPTRIX is a browser-based racing engineering and lap-optimization workspace. A
user chooses a circuit, vehicle and setup, calculates a theoretical development
lap, then inspects the racing line, speed, braking, apexes, sectors and telemetry.
The experience should resemble compact professional engineering software.

The current technical scope is sufficient for this MVP. The next milestone
sequence prioritizes presentation: visual polish, camera behavior, speed
perception, track grounding, clearer playback/UI and higher-quality vehicles.
The original circuit remains available as LAPTRIX Dev Track; Red Bull Ring
is available alongside it as the first real showcase using documented reusable
data. ROADMAP.md defines the implementation, verification and source requirements.

The current product is local: the original development circuit, an approximate
Red Bull Ring GP reconstruction, Formula
and GT development profiles and dry conditions. Users can compare a setup or vehicle against a
reference, inspect individual corners, play a telemetry-driven ghost, scrub the
lap, save settings on their device and export results. Track JSON import extends
the same generic pipeline rather than adding track-specific UI logic.
References can also come from a LAPTRIX export or explicitly aligned external
timing JSON or reviewed CSV column mappings. CSV supports explicit milliseconds
and percent conversion, requires source-alignment/provenance declarations and
previews converted records before applying. File review runs in the background and
can be cancelled or replaced while processing. Imported timing keeps its declared provenance and does not invent
missing measured channels or replace the simulation's playback.
Portable project files restore names, selected setup, custom source geometry and
references on a fresh workspace. The app validates the bundle and recalculates
before activation, preserving the previous workspace on any file or API failure.
Red Bull Ring source credits remain beside the viewer and in exported track/lap
metadata. Attributed CSV exports use a labelled ZIP containing the unchanged table
and source notices. The circuit uses mapped geometry and smoothed2010 terrain;
widths, sectors, vehicles and surroundings remain estimates. See the
[source record](../data/sources/red-bull-ring/README.md).
An aero study compares five or six settings through the selected solver while
keeping other inputs fixed. Only checked runs can be applied, and the existing
reference remains available. See AERO_COMPARISON.md for its bounded scope.
Complete study reports preserve source inputs, all candidate outputs and failures,
with solver implementation/runtime provenance on new laps.
The bundled track uses fixed sector gates across racing lines and sampling grids.
Older v1 track files retain their distance-based sectors and are labelled as such;
historical references compare at the current lap's physical source intervals.
The workspace remains usable while the 3D module downloads. If it fails, users can
continue working, save locally, and reload to recover the viewer.
The paused viewer stops drawing once camera motion settles and wakes for playback,
inspection or scene changes. Scene detail and the shared playback timing remain
unchanged. See RENDERING.md.
The track footer shows the current lap's speed, gear, elapsed/full time, playback
rate and ready/playing/paused/complete state, including in fullscreen. These values
follow the same clock as the car, graphs and audio; reference data does not replace
them. Source units and geometry details remain in track inspection.
The chase camera follows the calculated racing line at a physical distance with
a fixed field of view. Original Formula and GT meshes use vehicle dimensions in
metres, including rotating wheels and front steering from telemetry. Small dots
keep cars visible in overview. Bodywork, contact shading and scenery are visual
approximations; they do not change vehicle parameters or simulation results.
If the browser restores a lost graphics context, the paused circuit redraws
automatically while retaining the workspace and playback position.
Overview cameras now fit accepted source extents at responsive canvas proportions,
including large imported circuits. Source-scaled clipping and reachable zoom bounds
preserve road visibility on reset without altering a result or the shared clock.
The north arrow follows actual orbit and chase orientation, with an accessible
screen-direction label. Reset clears residual drag motion before restoring the fit.
Selected-corner event labels now stay separate at overview scale, with leader lines
back to their actual telemetry positions. Their buttons pause and seek the same
clock; existing numerical event controls remain available. See CORNER_CALLOUTS.md.
Corner windows now cross start/finish without clipping their braking distances or
duration. Canonical event controls and source-aligned reference timing handle both
sides of the origin; historical reference estimates stay literal. See CORNER_WINDOWS.md.
Source geometry inspection identifies projected segment contacts and their height
gaps, with an original-track diagram and exportable report. It helps review imports
without implying surveyed road accuracy or validated bridge clearance.
Source profiles inspect original elevation, conventional grade, raw ascent/descent
and sampled vertical curvature, including during GPX review. Keyboard/pointer
selection identifies exact source segments and curvature at their start points.
Complete exports retain SI values; inspection leaves simulation geometry, pending
setup and playback untouched.
See SOURCE_PROFILES.md for units, selection and source-noise limits.
Explicit sector loops now repeat selected telemetry through the existing clock.
Plot selection remains independent; a pressed control and persistent strip identify
the loop. Outside inspection restores full-lap looping, while new results clear
the interval. Current/reference data and pending setup survive. See PLAYBACK_LOOPS.md.
Track imports and selection retain the current source, lap and reference until
both new calculations succeed. Failed imports preserve the workspace and expose
an import retry; failed selection retries the intended track with its new baseline.
The primary action becomes Cancel during calculations and track/project imports.
Cancellation preserves the completed workspace and edited setup, pauses playback,
and permits a new run or import. Already executing server work may still finish.
Additional actions supports native keyboard navigation, Escape dismissal and
predictable focus after exports or file selection. Short viewports scroll the
actions within the disclosure so the opener and workspace remain in place.
Viewer and telemetry tabs support arrow-key selection and direct panel access.
Camera and axis choices expose their selected state, while tab changes retain
the existing 3D canvas, layer settings and playback position.
Cursor Data adds exact time/distance entry and numerical channel inspection.
Inspect pauses playback at the entered position; invalid or unsent entries leave
the clock unchanged. It reports the development model's channels and explicitly
identifies road-normal vertical acceleration and total tyre load separately. Old
current telemetry retains its explicit unmodelled state; see VERTICAL_LOAD.md.
Lap Graphs now offers Overview and Loads & elevation channel groups. The latter
adds whole-lap vertical acceleration, normal tyre load and gradient alongside speed
and longitudinal/lateral G. Both groups retain the same cursor, axes and sector
range. Older references keep available channels with explicit missing load data;
legacy current laps retain Overview. See LOAD_GRAPHS.md for units and availability.
Its optional Current-lap extrema disclosure identifies full-lap minimum/maximum
load and vertical G. Inspect restores the full range and pauses at the exact
sample, retaining pending setup, reference and complete project data. Values remain
current-lap observations even with reference overlays. See LOAD_EXTREMA.md.
An optional grey native-reference ghost compares vehicles on the same elapsed-time
clock. Visibility is independent of the blue current ghost, and each uses its own
vehicle snapshot. Timing-only files retain analytical comparison without a drawn
vehicle. Current-lap playback determines the duration and a finished reference waits
at the line; see GHOST_PLAYBACK.md.
CURRENT/REF names now avoid timing badges and controls while leaders retain each
car's actual position. Crowded or offscreen names may be omitted; numerical data
and vehicle poses retain their existing behavior. See GHOST_LABELS.md.
Time Delta now exports the full source-aligned comparison as JSON, with both
completed inputs, explicit units and every knot from either sampling grid. Native
channels retain independent distances/times; timing-only references contribute
only timing. A flat CSV export uses the same rows with explicit canonical units
and empty unavailable-channel cells; the JSON remains the metadata/input archive.
Export preserves the current inspection, loop, project and pending
setup. See COMPARISON_EXPORT.md.
The paused workspace now also stops the playback clock's animation requests once
the viewer settles. Play resumes from the inspected time, and paused seeking or
camera changes still redraw immediately. This reduces idle browser work without
adding another clock or changing simulation output.
Fullscreen entry and exit now reflect the browser's actual state, recover rejected
requests through the same control and keep camera/exit actions visible on short
landscape screens. The existing scene, selection and playback are preserved.
The track key starts collapsed in narrow or short scenes, exposing more of the
circuit. Its keyboard toggle retains explicit display choices across resizing,
fullscreen and viewer tabs. See TRACK_KEY.md for the compact thresholds and scope.
Synthetic surroundings now interpolate full source segments and stay below the
road and shoulders, preserving visible racing lines on sparse/sloped imports.
The contextual ground can be conservatively excavated; the original road and
calculated lap remain unchanged. See TERRAIN.md.
Vehicle JSON import/export supports bounded user-supplied parameters through the
same solver. Imports activate after successful calculation, retain references and
declared sources/assumptions, and resolve occupied IDs without replacing built-in
profiles. Imported inputs are visibly unverified. Save and portable v3 projects
preserve the selected embedded profile; older files retain their original rules.
Project naming is available from Additional actions at all widths. A native dialog
keeps drafts separate until Rename; cancellation restores focus without changing
the workspace. Naming makes no simulation request and retains pending setup edits,
references and playback. Saved and exported names follow the existing contract.
Optional native-reference curves now compare all seven graph channels at matched
source positions, preserving both grids' events and current-lap axes. Dashed curves
and R readouts share channel units and ranges with the current lap. Timing-only
references remain analytical timing data without invented telemetry channels.
Sector-focused plotting shares one range across Lap Graphs and Time Delta. Range
selection preserves the cursor; explicit inspection pauses at the sector start.
Full lap restores the complete view, while outside-cursor text makes full-lap
playback explicit. A new completed calculation resets the view range.
Custom windows narrow either graph to explicit start/end times inside the lap.
Applying the window preserves playback and reference data; Inspect start and Loop
window use the shared clock explicitly. Both axes show the same lap positions.
Each channel row exposes its display bounds alongside the live values. Current and
reference curves share those bounds; signed channels include a zero guide. Bounds
retain their units and remain fixed when inspecting a sector.
GPX circuit import reviews one continuous source before calculation. The dialog
shows a projected centerline, closure and supplied elevation bounds, with editable
width assumptions. Both new laps must succeed before replacing the active track
and reference. Converted geometry and declared assumptions survive local Save and
portable projects; source accuracy remains unverified. See GPX_IMPORT.md.

Success means all 16 MVP actions in the founding brief work end to end: launch,
track and vehicle selection, procedural interactive 3D, simulation, optimized
line, plausible speed, lap time, braking/apex/throttle inspection, sector/corner
analysis, ghost playback, synchronized seeking, all required charts, reference
dashboard design, documented local startup and important automated tests.

The theoretical result is an approximation. Minimum curvature does not establish
a globally fastest lap. Synthetic inputs and development physics must remain
visible in the interface and exported data. Precision in formatting is useful for
repeatable comparisons, not evidence of real-world accuracy.
Slope forces now consistently affect normal grip, rolling loss and lateral speed,
including braking while accelerating downhill. Numerical checks continue to flag
infeasible results separately from convergence. Quasi-steady crest/compression load
now affects grip, rolling loss and an independent contact-speed bound. Suspension
motion, axle load transfer and flight remain outside the development model.
An optimized line that exceeds the supported slope or reverses a source interval
now produces a recoverable explanation before calculation. Users can select
Centerline mode and retry; failed imports and runs preserve their completed work.
Valid zero-valued source fields now retain reference identity through API transport,
Save and portable projects. Historical references migrate only with verifiable
source identity; source geometry and recorded timing remain unchanged.
Reference-file reads and hashes now respect the latest import, explicit reference
choice or workspace calculation. Late superseded results and errors cannot replace
that choice; active failures still preserve the existing reference and offer retry.
Comparison signs and colors now match displayed precision. Values shown as zero
are neutral; resolvable gains/losses stay distinct, and full-precision timing and
exports remain available. Percentage change uses its own displayed precision.
If device-local Save fails, Download project offers the complete portable workspace
without recalculation or changing the previous save. A later successful Save clears
that warning; unrelated failures retain their own recovery actions.
Audio-start failures similarly offer Enable audio again. The retry preserves the
workspace and playback, and delayed success retains a newer unrelated error.
Overlapping audio starts respect the latest action: an older completion cannot
undo mute or replace a newer successful activation with an obsolete warning.
An offline analytic elevation study now records complete inputs and results for
30 source-phase/grid cases. It demonstrates how small missing elevation waves can
alter the road-following model despite passing numerical checks. This strengthens
the documented source limits without inferring survey quality or changing supplied
geometry. See ELEVATION_SENSITIVITY.md.

Future work may add independently sourced circuits, additional vehicle generations,
validated tyre and transient dynamics, measured channel comparison, broader setup studies,
more cameras and licensed audio. Prefer correctness and workflow quality over a
large catalog of weakly supported features.
