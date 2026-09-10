# Original source elevation, grade and curvature

Expand **Track geometry** and choose **Source profiles** to open the source
inspector in a viewport-bounded dialog. The same plots are available in an optional
GPX review disclosure before importing. Both show original
source geometry, including the closing segment. Changing spatial sampling for a
simulation does not replace these points or change the plotted profile.

Elevation connects each supplied y value with the next. Grade is constant along
each original chord and equals `100 × (next.y − y) / hypot(next.x − x, next.z − z)`.
Positive grade is uphill in the supplied point order. Horizontal position is
cumulative **3D chord length**, the same source-distance basis used by fixed v2
sector gates. The grade denominator is horizontal run; it differs from the
solver's `rise / 3D distance` slope used for gravity and track acceptance. The
inspector does not change that established physics contract.

Sampled vertical curvature estimates the signed circle through each source point
and its incoming/outgoing neighbours in the horizontal-distance/elevation plane.
Positive values indicate compression and negative values a crest. This is source
geometry, not the solved racing line, vehicle acceleration or suspension motion.
The helper normalizes the two chord vectors before taking their cross product,
then divides twice that result by their combined chord length. The closing
incoming chord contributes at point one; direction reversal retains curvature
signs even though it reverses the associated grades.

The screen uses **1/km** (raw inverse metres multiplied by 1,000) for readable
values. Its curve connects sampled point values, with a repeated point-one value
at the closing endpoint. These lines do not certify continuous curvature between
source points. No smoothing, noise removal, quality score or additional geometry
is introduced. See ELEVATION_SENSITIVITY.md: numerically eligible results and dense
solver interpolation cannot recover height details absent from the original source.

Raw ascent and descent sum positive and negative elevation changes around the
whole closed loop. They are equal up to floating-point accumulation on a closed
source. They are sensitive to sample noise: there is no elevation smoothing,
thresholding, datum correction or claim of surveyed accuracy.

Click or drag a plot to select its containing outgoing source segment. A keyboard
slider supports individual segments and Home/End; displayed point numbers are
one-based, and the final segment returns to point one. Exact start distance,
endpoint elevations, chord length and conventional grade accompany the plots.
The selected curvature belongs to the segment's **start point**, not its whole
outgoing chord. It is also included in the keyboard slider's accessible value.
The plotted cursor marks the selected segment's start. Inspection leaves lap
playback, pending setup, simulation results and project contents unchanged. A new
source resets selection to its first segment. Closing the settings dialog preserves
the current selection; Close or Escape restores focus to its launcher.
The dialog heading and Close control remain visible while its content scrolls.

Elevation uses its observed bounds, with ±0.5 m padding for a level source. Grade
uses symmetric bounds of at least ±1%, with an explicit zero guide. HTML axis
text keeps its font size at narrow widths; long elevation bounds use compact
scientific notation with full values in their titles and accessible scale label.
Curvature uses a symmetric observed domain with a minimum ±0.001 1/km display
range and a zero guide. Three significant digits and scientific notation preserve
small readouts; shared wider scale columns fit the labels and align all three
distance axes. This display
range neither modifies samples nor declares a source-quality threshold.

**Export source profile** downloads `laptrix-source-profile-v2` JSON. It includes
the complete original Track, its source fingerprint, units, limitations and all
derived values using algorithm `closed-source-chords-curvature-v1`. Indices in the
file are zero-based. Each row includes start/end cumulative distance, 3D length,
horizontal length, rise, endpoint elevations and grade percent. The additional
`profile.verticalCurvature` array retains one full-precision **1/m** value per
original source point, indexed like each segment's start. Prior v1 reports retain
their `closed-source-chords-v1` data and have no curvature channel; no missing values
are interpreted as zero. Neither version is consumed by project/reference import.
The existing `laptrix-track-diagnostics-v1` contact report remains a separate artifact.

Five independent math tests cover analytic ramps, closure, start rotation, rigid
transforms, direction reversal, unequal interval lookup and invalid profiles. The
browser fixture has 400 m ramps rising/falling 100 m and level 300 m sides, giving
known ±25% grades and 100 m ascent/descent. Desktop and phone journeys exercise
inspection/export, then use the smooth catalog source to verify resampling
independence. GPX preview uses an original analytic elevation fixture.
Six additional mathematical cases check signed inverse radius on unequal circular
arcs, level/constant-grade chords, closure, rotations, rigid transforms, reversal,
the alternating-height aliasing example and invalid inputs. A local cross-language
check of all 720 catalog points agrees with the backend source estimator within
6.41e-18 1/m. This is implementation consistency, not independent source validation.
Browser cases independently derive all 40 ramp-fixture curvature values, check the
new plot's selection, retained paths after resampling, versioned exports and GPX
preview. QA captures both plot and value states at each viewport size.
Run `node --experimental-strip-types scripts/source-profile-qa.mjs` for desktop,
compact-desktop, phone and short-landscape captures. Evidence is written to ignored `artifacts/`.
