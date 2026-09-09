# Current and reference ghost playback

The Ghost Car tool panel independently toggles the blue current vehicle and an
optional grey reference vehicle. Reference display is off initially. When it is
enabled, CURRENT and REF tags identify the schematic vehicles. Both retain the
existing 3× display scale; their bodies are original procedural geometry.

A reference can be drawn only when it is a native Lap with the same source-track
fingerprint as the current Lap. Different vehicles, line choices and sample grids
are supported. Snapshot vehicle parameters determine each body independently;
older native references fall back to a matching installed profile or the generic
schematic. Timing-only files have no positions and keep this control disabled.
They remain available for time, sector and corner comparison.

Both vehicles start at elapsed time zero. Every render frame reads the same
PlaybackClock and interpolates each lap at those elapsed seconds. No normalized
lap-time matching or second animation clock is introduced. The current lap sets
the playback duration: a faster reference holds its closing endpoint after it
finishes, and a slower reference may not finish before current-lap playback loops.
Pause, exact cursor entry, chart/corner seeking, restart and playback rate all use
the existing clock. Audio and chase camera continue to follow the current lap.
Native reference channel overlays instead compare the same source position on
current-lap axes. This intentional difference separates spatial separation at one
elapsed time from channel differences at one track position; see TELEMETRY_COMPARISON.md.

`ghostPose` clamps time to the selected lap and derives yaw/grade from a short
forward lookahead (at most 0.15 s, bounded for very short laps). The lookahead wraps
at the closed seam; a completed reference keeps its finish orientation until the
shared clock restarts. This is visual interpolation, not a transient dynamics
model. Positions, speed and lap timing remain the stored simulation output.

The existing import boundary validates file structure and declared source identity.
A matching fingerprint is not independent authentication of an imported path or
vehicle. Reference provenance remains visible in Lap Comparison; no official or
measured accuracy is inferred from a ghost being drawable.

Unit tests cover interpolation/orientation, independent elapsed-time progress,
finish holding, clock restart, rigid coordinate transforms and reference eligibility.
Browser journeys compare actual projected ghost-label positions after a reference
finishes while the current car advances, and exercise independent visibility and
timing-only replacement at desktop/mobile widths. Run
`node scripts/reference-ghost-qa.mjs` for controls, orbit/top/chase, finish and
unavailable-reference screenshots at 1600/1280/390 px plus error/overflow records.
