# Known limitations

- Geometry, vehicle and environmental responses are synthetic. The result is not
  an official lap prediction or calibration for a real Formula car.
- Minimum curvature is a small-offset approximation. Optional lap-time refinement
  searches 78 local candidates, not all trajectories or a global minimum.
- Grid density changes calculated lap time. The measured 720-to-1,440 point change
  is larger than the default refinement gain; milliseconds are numerical display
  resolution, not a statement of real-world prediction accuracy. See SOLVER_STUDY.md.
- Force-demand checks cover sampled discrete segments with a 1.5% tolerance, not
  continuous trajectory feasibility. Imported geometry may fail these checks;
  the UI flags the result and skips lap-time refinement when its seed fails.
- The point-mass model omits transient yaw, axle load transfer, tyre temperature/
  wear, suspension, braking lockup, slip, shift delays, hybrid energy and fuel burn.
- Banking is reserved but rejected; vertical G is a reserved zero field. Elevation
  affects gradient forces, not suspension compression or vertical road curvature.
- Detected corners use curvature prominence; gradual turns may be combined.
  Seam-adjacent event windows are clipped to the canonical lap interval.
- Track imports accept local JSON only. GPX/GeoJSON conversion, self-intersection
  validation, bridges and surveyed terrain are not implemented.
- Terrain and trees are contextual generated scenery. The ghost is intentionally
  enlarged three times for engineering visibility, not a physically scaled asset.
- Procedural audio is a synchronization foundation, not realistic engine sampling.
- Project saving is device-local browser storage. There are no accounts, cloud
  synchronization, access controls or production hosting configuration.
- The API cache is bounded and process-local. This is a trusted local development
  service, not a hardened multi-user compute system.
- Browser numerical/visual checks do not substitute for real-world model validation.
