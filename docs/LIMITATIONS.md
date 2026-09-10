# Known limitations

- Geometry, vehicle and environmental responses are synthetic. Selected GT
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
- Grid density changes calculated lap time. The measured 720-to-1,440 point change
  is larger than the default refinement gain; milliseconds are numerical display
  resolution, not a statement of real-world prediction accuracy. See SOLVER_STUDY.md.
- Force-demand checks cover sampled discrete segments with a 1.5% tolerance, not
  continuous trajectory feasibility. Imported geometry may fail these checks;
  the UI flags the result and skips lap-time refinement when its seed fails.
- Resampling cannot recover details absent from the source. It rejects cubic
  displacement above 0.50 m and can conservatively narrow abrupt width transitions.
  Long circuits may reach the 2,000-point budget before reaching the target spacing.
- The point-mass model omits transient yaw, axle load transfer, tyre temperature/
  wear, suspension, braking lockup, slip, shift delays, hybrid energy and fuel burn.
- Banking is reserved but rejected; vertical G is a reserved zero field. Slope
  affects normal weight, horizontal lateral speed, rolling loss and longitudinal
  gravity. Suspension compression and vertical-curvature loads remain unmodelled.
  Downforce is assumed road-normal; aerodynamic tyre rolling losses are omitted.
- Detected corners use curvature prominence; gradual turns may be combined.
  Seam-adjacent event windows are clipped to the canonical lap interval.
- Track imports accept local JSON and a reviewed GPX 1.1 geometry subset. GPX
  requires one segment with complete elevations, a bounded closure and points
  within 10 km of its origin. Widths, zero banking and equal sectors are assumptions;
  elevation datum, source accuracy and ground-scale corrections are unverified.
  There is no noise filtering, missing-data filling, multi-lap selection or GeoJSON
  conversion. Source-centerline diagnostics report projected contacts and height
  gaps, but do not validate road-width/surface intersections, bridge clearance or
  trajectory topology. Bridge structures and surveyed terrain are not implemented.
- Source elevation/grade profiles use unsmoothed original chords. Raw ascent and
  descent can be inflated by elevation noise; datum and survey accuracy remain
  unverified. Conventional grade uses rise/horizontal run, while the solver's
  established slope and acceptance bound use rise/3D distance. See SOURCE_PROFILES.md.
- Reference imports accept native simulation JSON or explicitly source-aligned
  timing JSON. GPS alignment and generic logger CSV conversion are not implemented.
  Imported timing origin is declared by its file and is not independently verified;
  sparse samples limit corner detail. Reference channels do not replace current
  simulation graphs or audio. Only matching native laps can supply the optional
  reference ghost; source identity declarations do not authenticate its trajectory.
  Historical signed-zero fingerprints need preserved original sign information
  for verified migration; lost signs are not inferred. See SOURCE_IDENTITY.md.
- Native channel overlays compare declared source positions on current-lap axes.
  They preserve available samples, not missing measured detail or independently
  verified alignment. Timing-only files remain ineligible for channel overlays.
- Plot zoom selects whole current sectors and retains full-lap scales and playback.
  It adds no measured detail; arbitrary windows and sector-only loops are not implemented.
- Reference ghosts share current-lap elapsed time and duration. Faster references
  hold the finish; slower ones may not finish before the current clock loops. This
  is visual telemetry interpolation and does not add transient vehicle dynamics.
- Terrain and trees are contextual generated scenery. The ghost is intentionally
  enlarged three times for engineering visibility, not a physically scaled asset.
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
