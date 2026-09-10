# Controlled spatial sampling and alignment

The source track stays unchanged in the catalog, import and saved project. A run
can use `setup.sampling = "source"` (the default), `"5m"`, or `"3m"`. The latter
two build a periodic cubic XYZ curve parameterized by source chord distance, then
invert a densely measured arc-length table to place approximately uniform samples.
Chord lengths are naturally slightly shorter than arc intervals in tight turns.

There are 40–2,000 solver points. If a requested spacing exceeds the point budget,
the result explicitly reports `capped` and actual mean/max spacing. This prevents
claiming 3 m spacing on a circuit where the budget only permits 6 m. The source
itself still obeys the existing track-schema size and geometry limits.

Interpolation may add shape unsupported by sparse input. The resampler checks
the dense curve against the piecewise-linear source at matching parameters and
rejects displacements above 0.50 m. The ordinary track validator checks the new
grid too. These failures return a recoverable API error: users can choose original
samples or supply better source geometry. No original points are overwritten.

Widths use conservative local minima across each new node's two neighboring
source-parameter intervals. A narrow source feature therefore cannot disappear
between resampled nodes. This can narrow the approximation near abrupt width
changes; it does not invent extra usable road width.

`sampling` includes the selected mode, source/grid counts, requested and actual
spacing, cap status, maximum interpolation displacement and effective track points.
The renderer uses those effective points so the road and solver share boundaries.
Exports retain both the original project track and the actual simulation grid.

`alignment.progress` maps every telemetry sample, including the closing endpoint,
to source-track progress from zero to one. `alignment.trackFingerprint` hashes the
physical source fields and sector fractions, excluding descriptive metadata. The
browser and Python use the same prefix and little-endian float64 byte layout and
SHA-256; exact zeros use positive-zero bytes so JSON transport preserves identity.
Other values remain exact and the source object is unchanged. Tests check their
shared dataset fingerprint; see SOURCE_IDENTITY.md for the full byte contract and
verified compatibility with older signed-zero hashes.

Corner comparison interpolates reference time at the current corner's source entry
and exit progress. It no longer assumes equal sample counts or raw racing-line
distances. Saved references must match the source fingerprint. Legacy references
without alignment can be migrated only after verifying their positions against
source points and their recorded lateral offsets. Unrelated geometry with a reused
ID is rejected.

Track v2 interprets sector fractions at fixed source-centerline positions, then
maps them through alignment to each solved line. Track v1 retains fractions of
each solved racing-line distance. New laps record actual source gate intervals
and their basis. Reference sectors interpolate at the current lap's source gates,
including when the reference came from an older format. Source fingerprints remain
compatible across versions with the same geometry and fractions; project reuse
also checks track version to preserve semantics. These are not surveyed timing
gates. Sampling and consistency do not establish real-world physics accuracy.
