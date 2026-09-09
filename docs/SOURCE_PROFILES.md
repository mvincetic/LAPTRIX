# Original source elevation and grade

Expand **Track geometry** and choose **Elevation & grade** to open the source
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

Raw ascent and descent sum positive and negative elevation changes around the
whole closed loop. They are equal up to floating-point accumulation on a closed
source. They are sensitive to sample noise: there is no elevation smoothing,
thresholding, datum correction or claim of surveyed accuracy.

Click or drag a plot to select its containing outgoing source segment. A keyboard
slider supports individual segments and Home/End; displayed point numbers are
one-based, and the final segment returns to point one. Exact start distance,
endpoint elevations, chord length and conventional grade accompany the plots.
The plotted cursor marks the selected segment's start. Inspection leaves lap
playback, pending setup, simulation results and project contents unchanged. A new
source resets selection to its first segment. Closing the settings dialog preserves
the current selection; Close or Escape restores focus to its launcher.

Elevation uses its observed bounds, with ±0.5 m padding for a level source. Grade
uses symmetric bounds of at least ±1%, with an explicit zero guide. HTML axis
text keeps its font size at narrow widths; long elevation bounds use compact
scientific notation with full values in their titles and accessible scale label.

**Export source profile** downloads `laptrix-source-profile-v1` JSON. It includes
the complete original Track, its source fingerprint, units, limitations and all
derived segment values using algorithm `closed-source-chords-v1`. Indices in the
file are zero-based. Each row includes start/end cumulative distance, 3D length,
horizontal length, rise, endpoint elevations and grade percent. The existing
`laptrix-track-diagnostics-v1` contact report remains a separate artifact. Neither
report is a project/reference import format.

Five independent math tests cover analytic ramps, closure, start rotation, rigid
transforms, direction reversal, unequal interval lookup and invalid profiles. The
browser fixture has 400 m ramps rising/falling 100 m and level 300 m sides, giving
known ±25% grades and 100 m ascent/descent. Desktop and phone journeys exercise
inspection/export, then use the smooth catalog source to verify resampling
independence. GPX preview uses an original analytic elevation fixture.
Run `node --experimental-strip-types scripts/source-profile-qa.mjs` for desktop,
compact-desktop, phone and short-landscape captures. Evidence is written to ignored `artifacts/`.
