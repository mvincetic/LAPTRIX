# Calibration and 3D source evaluation — 2026-09-09

This is a bounded suitability review of primary project documentation. No dataset
files or external code were copied into LAPTRIX, no accounts were created and no
authors were contacted. The findings do not calibrate the development vehicles.

| Source inspected | Relevant evidence | LAPTRIX assessment |
| --- | --- | --- |
| [RACECAR, official repository](https://github.com/linklab-uva/RACECAR_DATA) | Autonomous Indy vehicle logs in ROS2/nuScenes; RTK GNSS, IMU and fused odometry; Indianapolis and Las Vegas scenarios; declared CC BY-NC 4.0. Its topic list describes sensor and localization channels, not a complete calibrated tyre/power model. | Useful localization research. Banked ovals exceed the current zero-banking model, and a position trace alone does not supply road boundaries or vehicle-force calibration. Keep separate from the bundled general-purpose dataset. |
| [BETTY, official project](https://pitt-mit-iac.github.io/betty-dataset/) and its [data/code destination](https://pitt-mit-iac.github.io/betty-dataset/coming_soon.html) | Describes multi-sensor racing logs and HD maps across six environments. At inspection, both Data and Code lead to a coming-soon page. | Promising research lead; accessible downloadable inputs and their data terms were not established. The webpage-template license is not evidence of the dataset's license. |
| [Marzaglia, ISARLab](https://isar.unipg.it/marzaglia/) | Three Formula 3 laps with stereo images, 250 Hz IMU and RTK position ground truth. The page explicitly excludes rotation from the GPS ground truth and notes strong vibration noise. | A visual-odometry benchmark. The inspected page does not establish complete vehicle controls, physical parameters, road-width/banking data or redistribution terms. Do not infer these from a driven path. |

The assessment column is LAPTRIX's inference from the documentation, not an
assertion made by the dataset authors. Public visibility does not establish
measurement quality, source completeness or suitability for a different model.

The earlier [TUM racetrack-database review](DATA_SOURCES.md) remains applicable:
its documented coordinates/widths are useful 2D inputs but do not provide a
verified elevation surface. No surveyed circuit has been substituted into the app.

A useful next calibration input needs units, timestamps and sensor frames;
vehicle configuration and mass; controls or a documented coastdown/steady-state
experiment; source geometry and start/finish alignment; and a holdout run not used
for fitting. A useful 3D track needs a datum, direction, surface elevation,
boundaries and uncertainty. Banking must be represented and independently tested
before banked tracks can support physics claims.

Work can continue without these external inputs: retain explicit provenance,
export complete studies, improve source-aligned comparisons, and extend analytical
benchmarks. Avoid fitting synthetic vehicle values to unexplained lap-time targets.
