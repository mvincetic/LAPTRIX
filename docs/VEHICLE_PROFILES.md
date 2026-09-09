# User-supplied vehicle profiles

Use **Additional actions → Export vehicle JSON** for a complete editable template
of the selected profile. Change its parameters in a text editor, retain explicit
assumptions and provenance, then choose **Import vehicle JSON**. Files are plain
vehicle objects, limited to 256,000 bytes. The machine-readable JSON schema is
available at `GET /api/schema/vehicle`. Spreadsheet/CAD conversion is not included.

The profile is calculated on the current source track with the selected setup.
Only a successful calculation activates it; validation errors, failed requests,
cancellation and superseded imports retain the workspace and pending setup edits.
The existing reference remains literal. When absent, a centerline baseline must
also succeed before activation. Playback pauses during preparation.

Imported profiles are labelled **user-supplied · unverified**. Their `synthetic`
flag, description, source links and field claims are file declarations, not proof
of measurement or calibration. Validation checks structure and engineering input
bounds; it does not establish that arbitrary combinations are physically suitable
or converge. The point-mass and dry-condition limitations still apply.

## Input contract

All numbers are finite JSON numbers; numeric strings and unknown properties are
rejected, including in power-curve and source entries. Bounds are inclusive except
where `>` is shown. SI units are used except explicitly named kW, RPM and g.

| Field | Accepted range / shape |
| --- | --- |
| `id` | 1–64 lowercase letters, digits or hyphens |
| `name`, `description` | Required, 1–100 / 1–1,000 characters |
| `synthetic` | Required boolean, declared by the file |
| `bodyStyle` | `formula` or `coupe`; defaults to `formula`, schematic rendering only |
| `assumptions` | Required 1–32 strings, each 1–500 characters |
| `sources` | 0–16 entries; title 1–200 characters, HTTP(S) URL up to 2,083 characters, 1–32 field claims of 1–100 characters |
| `mass` | >100 to 4,000 kg, fuel-exclusive; selected fuel is added by the solver |
| `powerKw` | 1–2,000 kW, equal to the curve's peak within 0.000001 kW |
| `powerCurve` | 2–128 points; `rpm` >0 to 30,000, `powerKw` >0 to 2,000 |
| `dragArea`, `downforceArea` | 0.1–10 / 0–20 m² |
| `friction`, `maxBrakeG` | 0.3–3 dimensionless / 0.3–8 g |
| `gearRatios` | 1–12 strictly decreasing forward ratios, each 0.1–20 |
| `finalDrive` | 0.1–20 |
| `wheelRadius`, `wheelbase`, `width` | 0.15–0.6 / 1–5 / 0.8–3 m |
| `idleRpm`, `maxRpm` | 100–5,000 / 1,000–25,000 RPM; redline exceeds idle |

Power-curve RPM must strictly increase and cover idle through redline. Changing
peak power also requires changing the curve. Existing archived vehicle snapshots
retain their broader reader; historical reference imports do not apply these
editable profile bounds retroactively.

## Identity, calculations and persistence

Built-in catalog entries remain unchanged. An occupied ID with different validated
content receives a deterministic local suffix based on a SHA-256 content hash.
Metadata is included; the assigned ID is excluded. Further collisions use a numeric
suffix and repeated imports reuse identical loaded profiles. This is a collision
mechanism, not an authenticity signature. Native reference vehicle IDs and snapshots
remain unchanged when the selected profile is renamed.

`POST /api/simulate` accepts an optional bounded `vehicle` object. It takes precedence
over `vehicleId`, as inline tracks already do. Reruns, track baselines, portable
restoration and every aero candidate send the full imported profile. Cache keys
include complete track, vehicle and setup JSON. Import never writes the server
catalog or a local filesystem path; custom IDs alone are not registered with the
server. New laps and aero reports retain full vehicle snapshots.

Save explicitly persists the selected imported profile as `customVehicle` in the
existing device-local v1 record. Reload validates and resolves collisions through
the same preparation boundary as a portable project, then recalculates. A malformed
save falls back to defaults; a valid saved setup with a source-mismatched reference
retains its setup and creates a baseline. Other unsaved imported profiles are
session-local. Export a profile or project to retain it independently.

Portable version 3 adds `vehicleSource: "catalog" | "embedded"`. Embedded profiles
use the bounded input contract and restore on a fresh workspace. Catalog mode
retains installed-physics matching. Version 1 and 2 files keep their original
installed-profile rules and must omit `vehicleSource`. See PROJECT_FILES.md.
