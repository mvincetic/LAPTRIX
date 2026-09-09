# Reviewed GPX circuit import

Use **Additional actions → Import track GPX** and choose a local file. The review
shows the projected centerline, its first point, closing segment, retained point
count, closed length and supplied elevation bounds. Edit the track name, source
description and assumed left/right half-widths, then choose **Import and simulate**.
Cancel, Close and Escape discard unsubmitted edits and restore focus to the actions
button. Reading and reviewing a file makes no simulation request or clock change.

The path becomes the model centerline. A recorded driving line is not automatically
the road centerline, and GPX supplies neither usable road widths nor banking here.
Half-widths default to 6 m per side and must be 2–40 m. Banking is zero. The first
point defines the start, with three equal source-distance sectors. The converted
track is labelled **user-supplied / unverified**, including when its source is an
original synthetic fixture. The source description should explain that distinction.

## Accepted geometry subset

- GPX 1.1 with its standard namespace, one direct track and one continuous segment;
  route elements, multiple tracks and multiple segments are rejected.
- 40–2,000 retained points, each with finite WGS84 latitude/longitude and one
  elevation in metres. Missing elevation is rejected. GPX decimal values cannot
  be blank, nonfinite, hexadecimal or exponential notation.
- Latitude is −90 through 90 degrees; longitude is −180 inclusive to 180 exclusive.
  All points must lie within a 10 km surface chord of the first point.
- A repeated closing endpoint within 0.1 mm in converted 3D coordinates is removed
  and reported. Its existing final segment still follows the usual track bounds.
  Otherwise a new endpoint join must be at most 30 m and twice the median interior
  spacing; its distance is shown for review. Open paths beyond this limit are rejected.
- The converted source must meet the existing [track contract](TRACK_FORMAT.md):
  spacing, local frames, coordinate/elevation bounds, gradient and total length.
  Interior duplicate points, unsupported gradients and degenerate frames are rejected.
- Files are bounded to 1.5 MB. Document types and malformed XML are rejected.

This is a bounded geometry reader, not a complete GPX XSD validator. It reads
namespace-qualified direct children, ignoring unrelated metadata and extension
channels. Timing, logger channels and route/segment selection are not inferred.
It does not smooth GPS noise, fill elevations, thin excessive samples or identify
individual laps in a recording. Prepare one suitable circuit before importing.

## Coordinate conversion and provenance

The converter maps WGS84 latitude/longitude onto the reference ellipsoid at zero
ellipsoidal height, forms Earth-centered Cartesian differences from the first
point, and projects them into its local east/north basis. LAPTRIX stores x=east,
z=−north and y=the original supplied elevation. The 10 km bound uses the complete
Cartesian chord, preventing distant or antipodal points from aliasing into a small
horizontal projection. Supplied elevations are preserved independently; tangent
plane curvature is not introduced as road elevation.
Numeric signed zeros are canonicalized to `0`, matching JSON transport so local
source fingerprints remain identical to API results, saved files and references.

Horizontal distances use this local ellipsoid-surface approximation. No ground-
scale, geoid, vertical-datum, epoch or surveying correction is applied. Displayed
precision is not measured accuracy. Generated provenance records the approximate
origin, user source description, width/banking/sector assumptions and closure
handling. The normalized source coordinates remain the simulation authority.

The implementation follows the [GPX 1.1 schema documentation](https://www.topografix.com/gpx/1/1/)
for coordinate conventions and core structure. The ellipsoid uses NGA's defining
WGS84 semi-major axis 6,378,137 m and inverse flattening 298.257223563.
[NGA WGS84 parameters](https://earth-info.nga.mil/GandG/wgs84/gravitymod/egm2008/index.html)
documents these constants. Forward conversion and the local basis follow the
[ESA ellipsoidal-to-Cartesian equations](https://gssc.esa.int/navipedia/index.php/Ellipsoidal_and_Cartesian_Coordinates_Conversion)
and [ESA ECEF-to-ENU equations](https://gssc.esa.int/navipedia/index.php/Transformations_between_ECEF_and_ENU_coordinates).
These primary sources were reviewed on 2026-09-09; no external code or track asset
was copied, and no new runtime dependency is required.

## Activation, persistence and failure

Applying the review uses the selected vehicle/setup and the existing simulation
endpoint. The current track, lap and reference remain active until both the new
lap and its centerline reference succeed. The imported ID is generated once for
the draft and never replaces an occupied catalog ID. Failed calculations keep the
workspace and offer **Review GPX again** with the submitted geometry and options.
Cancel calculation aborts both browser requests and rejects late results; an
already executing server worker may finish.

Save and portable projects retain the converted custom track and its provenance
through the existing contract. The raw XML, original geographic point records and
unconsumed GPX metadata are not embedded. Keep the original GPX file separately.

## Verification

Independent equatorial geometry and meridional-radius checks exercise the local
conversion, along with southern-hemisphere rotation, antimeridian continuity,
unchanged elevations, signed-zero fingerprint round trips, finite bounds and
antipodal rejection. Browser tests use an
original analytic GPX fixture and real `DOMParser`, API calculations and project
exports. They cover invalid inputs, assumptions, inert markup-like names, review
cancellation, either failed solve, retry, calculation cancellation, local Save and
portable restoration at desktop and phone widths.
Both restoration journeys also re-import a native reference against the active
southern-hemisphere source, before JSON Save can normalize its in-memory values.
Run `node --experimental-strip-types scripts/gpx-qa.mjs` for review/error/preview
captures at 1600, 1280, 390 and 780 px, plus complete desktop/phone workspaces.
The explicit Node 22.17 flag reads the original TypeScript fixture; it adds no
browser dependency. QA records dialog bounds, errors, document widths and exactly
two simulation requests after application, with none during review.
