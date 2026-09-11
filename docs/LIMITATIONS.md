# Known limitations

- LAPTRIX Dev Track is synthetic. Red Bull Ring uses an approximate mapped GP
  reconstruction with smoothed2010 terrain; widths, banking and sectors are
  estimates. The maximum height-smoothing adjustment is6.084m. It is not a current
  race-surface survey; see [source limitations](../data/sources/red-bull-ring/README.md).
  Vehicle and environmental responses remain synthetic. Selected GT
  specification anchors do not calibrate estimated grip, mass, aero or power-curve
  shape. Neither profile is an official lap prediction for a real vehicle.
- Minimum curvature is a small-offset approximation. Optional lap-time refinement
  searches 78 local candidates, not all trajectories or a global minimum.
  An unsupported optimized slope or reversed source interval is rejected before
  its speed envelope; users can explicitly retry the valid centerline. These
  discrete checks do not certify continuous road containment. See LINE_GEOMETRY.md.
- Aero studies compare five or six fixed settings and rank only checked runs.
  They do not establish a globally optimal setup. Stop cancels the browser request
  and queued candidates; an already running synchronous server solve may finish.
- Grid density changes calculated lap time. The current Formula 5 m/3 m refined
  difference is about 0.041 s; it is not a rigorous error bound. Milliseconds are
  display resolution, not real-world prediction accuracy. See SOLVER_STUDY.md.
- Force-demand checks cover sampled discrete segments with a 1.5% tolerance, not
  continuous trajectory feasibility. Imported geometry may fail these checks;
  the UI flags the result and skips lap-time refinement when its seed fails.
- Resampling cannot recover details absent from the source. It rejects cubic
  displacement above 0.50 m and can conservatively narrow abrupt width transitions.
  Long circuits may reach the 2,000-point budget before reaching the target spacing.
- The point-mass model omits transient yaw, axle load transfer, tyre temperature/
  wear, suspension, braking lockup, slip, shift delays, hybrid energy and fuel burn.
- Banking is reserved but rejected. Quasi-steady vertical curvature affects tyre
  load, grip and rolling loss; downforce is assumed road-normal. The 2% contact
  reserve constrains a road-following point mass and does not model flight or
  suspension motion. Raw elevation noise can strongly affect curvature. Vertical G
  is road-normal acceleration excluding gravity, not world-Y acceleration or an
  accelerometer reading. Legacy results retain reserved zeros. See VERTICAL_LOAD.md.
  The original ELEVATION_SENSITIVITY.md study demonstrates large sampling-phase
  effects from a 10 cm synthetic wave despite passing force checks. The current
  point budget does not resolve every accepted elevation feature; denser solver
  interpolation and the displacement guard cannot certify source curvature.
- Detected corners use curvature prominence; gradual turns may be combined.
  New event windows cross the seam but retain bounded sampled thresholds. Continuous
  braking uses a search bound rather than a known onset. Historical unmarked
  references retain their clipped estimates. See CORNER_WINDOWS.md.
- Track imports accept local JSON and a reviewed GPX 1.1 geometry subset. GPX
  requires one segment with complete elevations, a bounded closure and points
  within 10 km of its origin. Widths, zero banking and equal sectors are assumptions;
  elevation datum, source accuracy and ground-scale corrections are unverified.
  There is no noise filtering, missing-data filling, multi-lap selection or GeoJSON
  conversion. Source-centerline diagnostics report projected contacts and height
  gaps, but do not validate road-width/surface intersections, bridge clearance or
  trajectory topology. Bridge structures and surveyed terrain are not implemented.
- Source elevation/grade/curvature profiles use unsmoothed original chords. Raw ascent and
  descent can be inflated by elevation noise; datum and survey accuracy remain
  unverified. Conventional grade uses rise/horizontal run, while the solver's
  established slope and acceptance bound use rise/3D distance. Sampled curvature
  cannot certify intermediate geometry or recover absent elevation details.
  See SOURCE_PROFILES.md.
- Reference imports accept native simulation JSON or explicitly source-aligned
  timing JSON or reviewed CSV with explicit time/progress columns and units. CSV
  does not select laps, align GPS, normalize raw distance or infer missing units.
  Imported timing origin is declared by its file/review and is not independently verified;
  sparse samples limit corner detail. Reference channels do not replace current
  simulation graphs or audio. Only matching native laps can supply the optional
  reference ghost; source identity declarations do not authenticate its trajectory.
  Historical signed-zero fingerprints need preserved original sign information
  for verified migration; lost signs are not inferred. See SOURCE_IDENTITY.md.
- Native channel overlays compare declared source positions on current-lap axes.
  They preserve available samples, not missing measured detail or independently
  verified alignment. Timing-only files remain ineligible for channel overlays.
- Plot zoom selects current sectors or increasing custom time windows and retains
  full-lap scales and playback. Custom windows require at least 0.001 s and cannot
  cross the start/finish seam. They add no measured detail. Explicit interval
  loops repeat canonical telemetry without adding a physical transition. Their
  transient intervals are not saved in projects. See PLAYBACK_LOOPS.md.
- Reference ghosts share current-lap elapsed time and duration. Faster references
  hold the finish; slower ones may not finish before the current clock loops. This
  is visual telemetry interpolation and does not add transient vehicle dynamics.
- Ghost-name placement is a bounded screen-space heuristic. Offscreen anchors,
  crowded views or a required leader over 120 px can omit a name; vehicle poses
  remain unchanged. See GHOST_LABELS.md.
- Comparison reports export the full lap on declared source alignment. Interpolated
  rows add no measured detail and are not accepted by project/reference importers.
  Original comparison inputs remain inside the report; pending setup and original
  source geometry belong to Export project. See COMPARISON_EXPORT.md.
- Terrain and trees are contextual generated scenery.
  Terrain cells are conservatively lowered below source roads and shoulders;
  sparse segments and crossings can leave exaggerated ground clearance. This
  does not establish surveyed ground, bridge structures or sight lines from every
  camera. See TERRAIN.md. Vehicles now use source metres with original approximate
  Formula/GT bodywork; the shape and soft contact shade are not measured assets or
  a suspension/contact model. Overview dots deliberately use a fixed pixel size.
- Procedural audio is a synchronization foundation, not realistic engine sampling.
- Project saving is device-local browser storage. There are no accounts, cloud
  synchronization, access controls or production hosting configuration.
- Portable v3 projects distinguish catalog and embedded vehicle data; v1/v2 retain
  installed-physics matching. Import recalculates and requires the local API;
  it does not promise numerical reproduction across future solver revisions.
- Vehicle JSON supports bounded parameters, not measured calibration or spreadsheet/
  CAD conversion. Sources and synthetic flags are unverified. Accepted bounds do not
  guarantee physical validity or convergence. Only the saved selected custom profile
  survives reload; export other session-local profiles or projects to retain them.
- The API cache is bounded and process-local. This is a trusted local development
  service, not a hardened multi-user compute system.
- Cancel closes active browser calculation requests and discards their results.
  An already executing synchronous server solve may still finish; no backend job
  cancellation or worker preemption is claimed.
- Browser numerical/visual checks do not substitute for real-world model validation.
- Fullscreen availability depends on the browser and embedding policy. Rejected or
  unavailable requests retain the viewer and offer local feedback; the application
  does not change browser permissions. See FULLSCREEN.md.
