# Loads & elevation graphs

In **Lap Graphs**, **Graph channels** selects the original **Overview** or
**Loads & elevation**. The new group contains seven synchronized rows:

| Channel | Display units | Cursor decimals |
| --- | --- | --- |
| Speed | km/h | 0 |
| Longitudinal G | G | 3 |
| Lateral G | G | 3 |
| Vertical G | G, road-normal acceleration excluding gravity | 3 |
| Normal tyre load | Multiples of total vehicle weight | 3 |
| Track gradient | %, rise / 3D outgoing segment length | 2 |
| Elevation | Local metres | 0 |

Vertical G is signed kinematic acceleration; tyre load combines gravity, vertical
curvature and downforce. The latter has a dashed **1× weight** guide, separately
identified from signed channels' zero guides. These are quasi-steady point-mass
outputs, not suspension travel, accelerometer measurements or calibrated tyre
forces. See [VERTICAL_LOAD](VERTICAL_LOAD.md) for the exact physical model.
Track gradient is the sine of slope angle, matching the existing telemetry field;
the original-source profile separately reports rise / horizontal-run grade.

## Scales and navigation

Both groups share the existing time/distance axis, sector range and playback clock.
Selecting a group preserves the cursor and play/pause state, and makes no API call.
Group choice survives tab changes in the mounted workspace. It is a view preference
and is not saved in project files. The default after page load remains Overview.

G ranges are symmetric about zero, rounded outward to whole G at peaks of 1 G or
more. Smaller load-group G ranges use tenths, with a minimum ±0.1 G. Gradient uses
whole percentage-point bounds with a minimum ±1%. Normal load starts at zero and
rounds its upper bound outward to quarters of weight, with a minimum 1.25×. The
other ranges retain Overview semantics. Display precision is not model accuracy.

The **Scale** column describes full-lap display bounds, separate from the current
and R readings. Eligible reference curves share each row's range. Sector inspection
clips the existing paths and retains those bounds; it does not resample either lap.
Guide text is omitted near bounds to prevent crowding; the line and its accessible
description remain. Pointer inspection, exact Cursor Data entry and playback keep
using the same authoritative current-lap time.

## Reference compatibility

Native reference curves compare the same source position through the union of both
source-progress grids, preserving reference events between current samples. Their
horizontal axes belong to the current lap; reference values remain interpolated on
the native reference's own time axis. See [TELEMETRY_COMPARISON](TELEMETRY_COMPARISON.md).

Vertical G and normal load require the reference's declared `verticalDynamics`
marker, in addition to finite channel values. Older references retain their five
available load-group curves. Missing curves are omitted and their cursor readings
show **R —**, with **Reference unavailable: Vertical G, Normal tyre load** above
the plot. Those missing values do not affect current channel scales. Timing-only
references keep the complete Reference traces control disabled with its reason.

A current lap without declared vertical dynamics falls back to Overview and
disables Loads & elevation, with explicit unavailable text. Reserved legacy zeros
are never relabelled as modelled acceleration. Shared validation still rejects
partial declared load arrays; the graph does not broaden the import contract.
Nonfinite display conversions cannot contribute to a curve or scale. Missing
samples break a path rather than creating zeros or bridging an unknown interval.

## Verification

Eight TypeScript cases check fractional signed scales, the weight guide, a
reference-only peak, per-channel legacy/finite eligibility, unit conversion,
independent time/distance path coordinates, gaps, extreme finite values and unchanged
inputs. Three browser journeys use real Formula/GT source and 5 m outputs, with
independently interpolated current/reference readings on both axes, exact-clock
playback checks, group/tab/range changes and unchanged complete project exports.
They also exercise partial legacy and timing-only reference replacement, plus
native disabled-option and keyboard behavior after a legacy-current response.

The legacy fixtures are deliberately shaped from real API output to exercise the
documented old contract; they are not claimed to be historical measurements.

Run `node scripts/load-graphs-qa.mjs` for Overview, current-only loads, native
time/distance overlays, a sector, partial legacy references and timing-only states
at 1600/1280/390 px. It writes panel/workspace images and a JSON record of trace
counts, cursor position, runtime errors and document widths under `artifacts/`.
The local review passes all 21 states with expected seven/five/zero reference curves,
unchanged cursor, no horizontal overflow and no runtime errors. Desktop, 1280 px
and phone panels/workspaces were opened to inspect labels, scales, guides and
transport placement; see VALIDATION.md for the exact local gate record.
