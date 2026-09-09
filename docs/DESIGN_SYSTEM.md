# Design system

The original user reference is preserved at `docs/reference/ui-reference.png`.
It guides hierarchy and proportions, not pixel-perfect reproduction. LAPTRIX uses
its own wordmark and synthetic circuit rather than APEX branding or Monza content.

- Background: `#f3f6f9`; white panel surfaces; borders `#e0e6ee`.
- Primary: `#0866ec`; dark text `#23344d`; muted annotations `#79869a`.
- Improvement: `#079e71`; braking / slower deltas: `#f3424e`.
- Inter Variable for interface text and tabular numeric readings; Barlow Condensed
  italic for the original wordmark. Fonts are self-hosted from Fontsource packages.
- Restrained 4–6 px corners, thin borders, nearly invisible panel shadows.
- Dense desktop layout: setup at left, dominant procedural scene and telemetry in
  the middle, lap results/comparison/insights at right. Setup data remains visible.
- A compact workspace breadcrumb and footer expose synthetic/development status.

Native controls are labelled and keyboard-operable. Tabs indicate active state,
layer controls are checkboxes, playback has labelled controls and a range slider.
Numerical deltas include signed values; color is not the only distinction. Context
such as SI units, pending setup changes and approximate physics is visible where
it affects interpretation. No decorative animation is added; reduced motion is
honored for the loading spinner.

Below 1100 px, the right column moves below the workspace. On narrow screens the
track/telemetry appear first, settings become two columns and analysis stacks.
Desktop visualization QA must include 1600, 1280 and 390 px widths and look for
horizontal overflow, clipped controls, unreadable labels and unframed geometry.

Lap-time refinement uses the existing solver selector, with a short explanation
only when selected. The result shows gain against the same-setup curvature seed
and the candidate count beside the lap result. This stays separate from the saved
reference delta. Key insights show accepted local changes, and failed numerical
checks appear as text warnings; a completed candidate budget is not labelled a
globally optimal setup.
On desktop, long settings and expanded advanced controls scroll within the settings
body; the pending-state indicator and model note remain visible below it.

Spatial sampling lives in Advanced settings. Its options distinguish the original
grid from target spacings, with a visible sample cap and accuracy caveat. Results
show the actual count and mean spacing. Reference comparisons align to source
track progress, so choosing a different grid does not discard a valid reference.

Vehicle details use an expandable section in the existing settings column. It
shows base/run mass, power, aero, grip, braking and drivetrain values followed by
assumptions and source links. The lap result and reference footer identify their
own vehicle, including during a failed change. Original formula/coupe meshes share
the same telemetry position and grade; both remain visibly schematic at 3× scale.

Reference import/export lives in Additional actions. The comparison footer exposes
imported source, declared origin and timing resolution, using wrapped text. Invalid
files retain the prior comparison and present an import-specific retry. Timing-only
references contribute comparison intervals without inserting invented graph traces.
Lap Graphs offers an initially unchecked native Reference traces
checkbox, a grey dashed swatch and a short source-position/current-axis explanation.
Available overlays share channel scales, use dashed grey curves and prefix their
numeric cursor readings with R. Timing-only/mismatched references disable the
control with text. The compact control row wraps on mobile; both gear plots step.
Horizontal ticks and sector labels use ordinary layout text so their font size
does not shrink with the SVG on narrow screens.

Time Delta is a separate telemetry tab. A zero baseline, signed seconds, red/green
trace and text legend distinguish slower/faster intervals. Both horizontal axes
and existing playback controls remain available. Numeric axis labels use ordinary
layout text so they remain legible on narrow screens. Provenance stays in the
comparison panel, and the trace footer identifies the active reference.

Project import uses Additional actions alongside reference/track imports. Each has
its own labelled file input and retry action. Loading pauses playback and disables
project-name editing with other configuration controls. The old workspace stays
visible during validation and calculation, and success identifies any locally
renamed track ID. The project name is preserved in new portable exports.

Aero comparison uses a native modal with fixed-context summary, progress and a
compact four-column result table. Radio selection, signed deltas and explicit
Passed/Excluded/Failed states supplement color. Starting and fastest checked rows
are labelled. Apply is deliberate and unavailable while running or without an
eligible result. The footer remains reachable on short screens; narrow layouts
retain all columns. Escape closes the study and returns focus to Additional actions.
After completion or Stop, a compact Export study JSON action appears below the
result notes. It remains available for wholly failed or unfinished studies, since
those states are part of the evidence. Technical source fingerprints stay in the
exported artifact; the comparison table retains its readable engineering values.
The lap result states Fixed sector gates or Legacy distance sectors. This explains
the difference between track-format versions without changing sector table controls.
All sector values, labels and plot boundaries consume the returned gate distances.
The deferred viewer preserves its panel with a restrained spinner and status text.
If loading fails, the rest of the workspace stays available. The error state names
the failed view and provides an explicit Reload page action with a reminder to
Save first; it does not present an ineffective import retry. No loading overlay
blocks settings or telemetry.
Track geometry uses another expandable settings section. A restrained count badge
signals projected segment contacts; a small top-view source diagram highlights
the selected pair. The gap is explicitly a source height difference in metres.
The report action and scope note remain reachable inside the settings scroll area
and span both settings columns on mobile. No green clearance or safety badge is
inferred from a positive height gap.
During track selection/import, controls show the pending calculation while the
last complete source and analysis remain visible. Import errors explicitly state
that the workspace was kept and offer Import track again; ordinary run errors
identify the attempted track. Retry carries the failed track target internally.
The existing primary button changes to Cancel with a pending spinner during active
calculations, retaining its compact footprint on mobile. Its accessible name is
Cancel calculation. Before catalog loading finishes, Connecting remains disabled.
Cancellation returns the Run Simulation action and shows a brief notice that work
was kept and server work may finish. Pending setup edits remain visibly unapplied.
Notifications use their content width capped at 90% of the viewport; icons and the
dismiss button retain their size so longer mobile notices wrap across a usable
text area rather than a narrow column.
Additional actions preserves native Tab order through its enabled controls. The
pointer backdrop has no keyboard stop, Escape returns to the opener, and leaving
the disclosure closes it without stealing focus. A visible focus outline identifies
the current action. The opener remains the return point after an action completes.
Viewer/telemetry strips use one keyboard tab stop with Left/Right and Home/End
selection. Tab reaches the next control or active panel, whose focus outline sits
inside its border. Inactive panels are hidden; the canvas stays mounted. The chase
legend reappears when its panel receives keyboard focus. Camera and axis controls
keep their compact selected styling and also expose pressed state semantically.
Cursor Data uses a compact entry row, current time/distance summary and numerical
channel grid. The selected horizontal axis determines the input's labelled units.
Inspect pauses and seeks; Escape restores the cursor value. The grid has four
columns in the desktop panel and two on mobile, where the document can grow.
The desktop tab panel is its own keyboard-scrollable container.
Values include units, discrete fields and an explicit Not modelled vertical channel.
Ghost Car offers independent current/reference checkboxes and names the native
reference. Blue CURRENT and grey REF labels identify the two schematic vehicles
when reference playback is enabled. The panel explains shared elapsed time, current
lap duration and finish holding. Timing-only data gets a disabled reference control
with an explicit no-positions explanation. Both bodies retain the 3× display scale.
Vehicle import and template export use the existing Additional actions disclosure.
Imported profiles show a user-supplied/unverified label in their data panel and
status bar; links identify declared anchors. Errors retain the workspace and offer
Import vehicle again. Collision notices explain local renaming.
Long unbroken profile text wraps in the data panel, lap labels, reference footer,
ghost tools and aero context. Accepted metadata must remain readable without
horizontal scrolling inside those panels.
Rename project is available in Additional actions even where the desktop project
field is hidden. Its native modal uses the existing light-panel and blue-action
styling, focuses/selects the current name, and bounds its width/height to the viewport.
Rename applies the draft; Escape, Cancel and Close discard it. All return focus to
Additional actions. The helper explains the 80-character limit and explicit Save.
