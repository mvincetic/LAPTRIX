# Source geometry diagnostics

Expand **Track geometry** in Simulation settings to inspect the selected source
track. The panel shows provenance, original sample count/length/elevation range,
projected segment contacts, a top-view diagram and the selected pair's height gap.
It uses original points even when a lap uses a resampled grid. It is a read-only
diagnostic: imports and solves retain their existing validation and behavior.

`packages/track-engine/diagnostics.ts` inspects the closed piecewise-linear source
centerline in the x/z plane, including the last-to-first segment. It checks every
unordered segment pair, rejecting disjoint axis-aligned bounding boxes before
intersection arithmetic. At the track contract's 2,000-point maximum this is
1,999,000 bounded pair checks. Results are memoized on source points in the UI,
not recomputed with playback or ordinary setup edits.

- **Crossing:** both intersection parameters are inside their segments.
- **Touch:** an intersection reaches an endpoint. Ordinary adjacent joins,
  including the closing join, are excluded.
- **Overlap:** parallel collinear segments share an interval. Adjacent reversals
  are included because they share more than their ordinary endpoint.

The linear geometric tolerance is 0.000001 m. A relative cross-product threshold
of 1e-12 selects the parallel calculation; collinearity is checked against the
linear tolerance. Neither number expresses survey accuracy. Source validation
precedes inspection; zero horizontal segment length is unsupported.

Counts represent **segment pairs, not unique places**. A crossing at a sampled
vertex can appear in multiple contact pairs. The whole scan completes, including
summary counts and the overall minimum height gap. At most 100 detailed pairs are
stored, shown and exported in source-index order; `omittedContacts` explicitly
reports additional pairs. The cap does not stop the scan or change total counts.

For each contact, source y is interpolated separately on both segments. For an
overlap, the signed height difference is linear over the shared interval; the
minimum absolute gap is zero when the signs cross, otherwise the lesser endpoint
gap. Maximum gap is the greater endpoint value. The UI shows metres to three
decimals, using `<0.001 m` below that display resolution. A positive gap can describe
vertically separated source paths, but does not establish bridge or vehicle
clearance. Road width, rendered ribbon intersections, surfaces and structures are
outside this diagnostic. No contacts does not certify a valid road or racing line.

**Export geometry report** downloads `laptrix-track-diagnostics-v1` JSON with the
complete original track, its source fingerprint, algorithm identifier, tolerance,
counts, bounded contact details and limitations. Exported segment indices are
zero-based; the UI displays them one-based. Segment n−1 joins the final point to
point zero. Each contact has `from` and `to` positions with separate segment
fractions and source heights; point contacts have identical interval endpoints.
This is an inspection artifact, not an additional project/reference import format.

Analytical tests cover planar/elevated crossings, rigid transforms, seam rotation,
endpoint pairs, collinear overlaps with an interior zero gap, adjacent reversals,
parallel lanes, the unchanged development circuit, the 2,000-point limit and a
4,949-pair stress case with explicitly capped details. The browser imports the
original synthetic `tests/fixtures/crossing-track.json`, checks its independently
known `8 cos(π/160)` metre height gap, resamples, exports and restores on mobile.
`node scripts/geometry-qa.mjs` captures the panel at desktop/mobile widths and
exports `artifacts/track-geometry-report.json`. The fixture is test data, not a
bundled surveyed track or a validated bridge model.
