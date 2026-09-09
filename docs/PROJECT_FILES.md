# Portable projects

Use **Additional actions → Export project**, then **Import project JSON** in a
fresh workspace. Files stay on the device. The portable bundle contains project
name, original track, selected vehicle parameters, setup, the latest completed lap
and the selected reference. New exports use `version: 3` with `vehicleSource` set
to `catalog` or `embedded`. The reader also accepts prior v1/v2 exports, using
"Imported workspace" when the name was absent. Device-local Save retains its
separate v1 format and adds the selected `customVehicle` when applicable.
The name can be edited directly in the desktop header or through **Additional
actions → Rename project** at every width. The dialog preserves draft cancellation,
the 80-character limit and intentionally blank names; use Save explicitly to persist it.

Imports are limited to 10 MB. The complete bundle, track geometry, archived lap
identity and reference alignment are validated before activation. The selected
vehicle in catalog mode must match an installed profile's ID and physics;
descriptive metadata may differ. This is also the unchanged rule for v1/v2 files,
which must omit `vehicleSource`. Version 3 embedded mode validates the strict bounded
vehicle contract before archival defaults or field stripping. Its metadata and
physics restore without an installed match. See VEHICLE_PROFILES.md for bounds.

The current result is freshly calculated with the imported setup and selected
profile. The archived lap is checked but does not replace canonical solver output;
future solver revisions may therefore yield a different result. Imported reference
timings remain literal. When no reference exists, a centerline baseline is computed
with the imported setup. Pending setup/profile choices in an export are applied by
that new solve. Import requires the local simulation service to be available.

No project name, track, setup, reference or current lap is replaced until the new
solve and any required baseline succeed. A failed file check or API request keeps
the prior workspace, with an import-specific retry. Playback pauses while loading.
Imports are not automatically saved to browser storage; use Save explicitly.

An existing track ID with the same physical fingerprint and track-format version
reuses that loaded track. If the ID points to different geometry or sector
semantics, the imported track receives a local ID
derived from its fingerprint. Its reference ID is updated while physical alignment
remains unchanged. Existing catalog tracks and the file on disk are not modified.
Repeated imports reuse the same renamed source, and names remain within the ID
length limit. Custom geometry uses the established custom-track simulation path.
Embedded vehicles use a full-content hash that includes metadata and excludes the
assigned ID. Different content under an occupied ID is renamed locally; identical
repeat imports reuse it. Native-reference vehicle IDs and snapshots remain literal.
Neither source nor vehicle is registered until all required solves succeed.
Track v1 preserves distance-based sectors; v2 uses fixed source gates. Track and
project version numbers are independent. Identical geometry across track versions
still supports reference correspondence, but does not justify replacing a file's
sector interpretation during project restoration.

Tests exercise current/legacy bundles, blank names, version/model failures,
source/vehicle-ID collisions, strict embedded inputs, local saves, reference identity
and repeat imports. Browser tests export
a named GT setup with a custom elevation circuit and Formula reference, open it
on a fresh page, save/reload, and verify failure/retry without losing prior work.
