# Known limitations

- Geometry, vehicle and environmental responses are synthetic. Selected GT
  specification anchors do not calibrate estimated grip, mass, aero or power-curve
  shape. Neither profile is an official lap prediction for a real vehicle.
- Minimum curvature is a small-offset approximation. Optional lap-time refinement
  searches 78 local candidates, not all trajectories or a global minimum.
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
- Banking is reserved but rejected; vertical G is a reserved zero field. Elevation
  affects gradient forces, not suspension compression or vertical road curvature.
- Detected corners use curvature prominence; gradual turns may be combined.
  Seam-adjacent event windows are clipped to the canonical lap interval.
- Track imports accept local JSON only. Source-centerline diagnostics report
  projected contacts and height gaps, but do not validate road-width/surface
  intersections, bridge clearance or trajectory topology. GPX/GeoJSON conversion,
  bridge structures and surveyed terrain are not implemented.
- Reference imports accept native simulation JSON or explicitly source-aligned
  timing JSON. GPS alignment and generic logger CSV conversion are not implemented.
  Imported timing origin is declared by its file and is not independently verified;
  sparse samples limit corner detail. Reference channels do not replace simulation
  graphs, ghost playback or audio.
- Terrain and trees are contextual generated scenery. The ghost is intentionally
  enlarged three times for engineering visibility, not a physically scaled asset.
- Procedural audio is a synchronization foundation, not realistic engine sampling.
- Project saving is device-local browser storage. There are no accounts, cloud
  synchronization, access controls or production hosting configuration.
- Portable projects support v1/v2 JSON bundles and matching installed vehicle
  physics. Import recalculates with the current solver and requires the local API;
  it does not promise numerical reproduction across future solver revisions.
- The API cache is bounded and process-local. This is a trusted local development
  service, not a hardened multi-user compute system.
- Cancel closes active browser calculation requests and discards their results.
  An already executing synchronous server solve may still finish; no backend job
  cancellation or worker preemption is claimed.
- Browser numerical/visual checks do not substitute for real-world model validation.
