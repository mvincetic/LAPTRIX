# Design system

The original user reference is preserved at `docs/reference/ui-reference.png`.
It guides hierarchy and proportions, not pixel-perfect reproduction. LAPTRIX uses
its own wordmark and synthetic circuit rather than APEX branding or Monza content.
Terrain remains a muted generated context beneath the authoritative road. Sparse
source interpolation and conservative clearance must not cut visible gaps through
the racing line. Road, vehicle, camera and annotation scales remain unchanged;
surrounding ground and trees are not presented as surveyed scenery. See TERRAIN.md.

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
Paused scenes render when their content or camera changes and rest after settling.
The 50 px scene footer prioritizes current speed, gear and elapsed/full lap time,
with a text playback state and rate. Tabular numerals stay readable at phone widths;
the strip remains present in fullscreen. Chase instructions describe fixed follow
behavior, while orbit/top retain their interaction guidance.
The track key uses a compact labelled toggle above its four familiar symbols.
It starts collapsed in scenes below 480 px wide or 350 px high; an explicit choice persists
through display changes. The same panel and focus treatment remain, while hidden
contents leave room for projected markers. See TRACK_KEY.md.
Playback and orbit motion retain the same detail; this policy adds no visible mode
or user setting. See RENDERING.md.

Below 1100 px, the right column moves below the workspace. On narrow screens the
track/telemetry appear first, settings become two columns and analysis stacks.
Desktop visualization QA must include 1600, 1280 and 390 px widths and look for
horizontal overflow, clipped controls, unreadable labels and unframed geometry.
Overview framing includes source road edges and shoulders, with the same camera
directions and margin at every width. Large sources use expanded clipping planes;
small or tall sources have reachable zoom bounds. Reset restores the full fit
without changing playback. See CAMERA_FRAMING.md for the rendering contract.
The fullscreen control shows its actual pressed state and an Exit fullscreen name
after entry. Failed/unavailable requests use a compact dismissible message anchored
above the control; the normal workspace stays visible. In fullscreen, the scene can
shrink around its header and footer so short screens retain camera and exit access.
See FULLSCREEN.md.
Selected-corner event buttons retain readable CSS-pixel dimensions across zoom
levels. Red/amber/green leaders and dots connect Brake, Turn-in and Throttle labels
to their actual samples. A compact ordered group avoids mutual label overlap;
placement considers legends, captions and other scene labels. Accessible button
names include event distance. See CORNER_CALLOUTS.md for crowded-view limits.
Channel plots reserve a 36 px scale column beside the live readings. Neutral 9 px
HTML limits align with faint upper/lower row guides; signed ranges add a dashed
zero guide. A zero label appears only where it fits between the bounds. Large
limits use compact scientific notation with exact values in titles and accessible
group labels. The shared SVG height keeps text aligned at every breakpoint;
wrapped captions can grow the panel without squeezing the plot.

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
Plot range uses a compact native select inside the selected graph panel. A sector
selection exposes Inspect start, Full lap and a short playback/outside-cursor note.
Channel comparison controls share the same wrapping row where space permits.
Horizontal ticks show the selected interval; strokes and labels retain their
display size. Full-lap vertical scales stay consistent across sector changes.
Sector time ticks show tenths of a second.
Custom window opens an inline editor with labelled start/end seconds, Apply and
Cancel. Opening focuses the start input; applying or cancelling restores the
trigger, and Escape cancels. Inputs follow the neutral border/radius system and
stack into labelled rows on phones. Custom ticks add precision as the window
narrows; actual values remain in titles. Loop window shares the existing pressed
state and persistent interval strip. See CUSTOM_WINDOWS.md.
The desktop workspace grows with its
center content and keeps the status bar below the transport. Side columns retain
internal scrolling instead of determining the entire workspace's height.

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
The open disclosure uses its actual top edge and viewport height to retain a
12 px lower gutter. On short screens its contents scroll vertically; action rows
and focus outlines retain their size. Keyboard focus scrolls the list, and wheel
overscroll stays within it. Ordinary desktop/phone portrait menus retain their
full content height when it fits. Header resizing updates the available height.
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
Values include units and discrete fields. New laps show Vertical G in G and Normal
tyre load in × weight, each with three decimals. A note distinguishes acceleration
excluding gravity from total contact force and states the suspension limitation.
Legacy current laps keep Vertical dynamics / Not modelled; absent load data is not
displayed as zero. The grid retains four desktop/two phone columns.
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
GPX import uses a scrollable native review dialog bounded to the viewport. A north-up
line preview marks the start in dark blue and the closing segment in dashed orange.
Editable fields distinguish assumed half-widths from supplied geometry. A compact
summary shows retained points, closed length and elevation bounds; explicit text
describes the model-centerline, zero-banking and equal-sector assumptions. Invalid
input is shown inside the dialog, leaving the workspace available after cancellation.
Mobile fields and preview stack, and the footer remains reachable by modal scrolling.
Elevation & grade opens a bounded native dialog from Track geometry. GPX review
keeps the same inspector in an optional native disclosure within its existing dialog.
Two compact blue plots use fixed-size HTML scales/ticks, with a signed grade zero
guide and a dark selected-segment cursor. A named range input provides keyboard
access to the same source selection. Numerical fields identify endpoint elevations,
distance, length and grade; captions explain original samples and raw totals.
The compact **Source profiles** launcher and default GPX collapse keep the usual
review surfaces compact. Sampled vertical curvature adds a third blue plot, a
signed zero guide and shared 56 px label columns that align all three distance
axes while fitting its 1/km scale. The selected value
names its start-point basis. The native source dialog keeps its heading and Close
control visible during vertical scrolling; notes explain compression/crest signs
and the sensitivity to raw elevation noise. See SOURCE_PROFILES.md.
The viewer's compact north arrow rotates with the camera while N stays readable.
Hover text and its accessible name describe the projected screen direction; an
undefined projection hides the arrow and explains the viewing-axis case.
At phone widths, error messages occupy a full-width 12 px text row, with recovery
and dismissal controls below. Long geometry explanations remain readable without
squeezing the text beside buttons or introducing horizontal overflow.
Comparison signs and colors follow the precision actually displayed: three decimal
places for seconds, two for percentage change. Displayed zero and missing values
use neutral slate `#526379`; zero badges use a pale neutral background with no
directional icon. Resolvable gains remain green and losses red. A time-delta trace whose whole
range rounds to zero uses the same neutral stroke while retaining its original path.
Storage failures use the existing error banner with an explicit **Download project**
button. The message identifies device storage and preserves the warning after a
download; successful device Save clears it. The phone layout keeps the full error
text above its recovery and dismissal controls.
Audio-start failures use **Enable audio again** in that same banner. Successful
activation clears only an audio warning; normal transport mute/enable controls
remain the ongoing audio interaction.
Lap Graphs places a native **Graph channels** selector before Plot range. The
controls wrap into readable rows on phones. Loads & elevation retains seven fixed
plot rows and widens the label column to 120 px for full channel names and three-
decimal G/load readings. A compact note explains vertical acceleration, tyre load,
the dashed 1× weight guide and gradient units. Missing reference channels show
R — and a text explanation while available curves remain visible. Overview keeps
its original channel names and precision. See LOAD_GRAPHS.md.
Loads & elevation places a collapsed native **Current-lap extrema** disclosure
before the plots, explicitly marked Full lap. Expanded cards use four columns on
desktop and two on phones, with value/unit, time/distance and a named Inspect
action. Its helper states that inspection pauses and restores the full-lap view.
The existing graph rows and transport retain their layout below the disclosure.
Selected corners whose events cross start/finish add one muted explanatory line
inside the existing detail panel. Braking, turn-in, apex and throttle buttons keep
their canonical lap distances and shared seek behavior, including an apex at 0 m.
The note wraps within the phone panel; scene labels retain their established colors.
Plot range adds a **Loop sector** button with a pale blue pressed state and native
keyboard activation. A compact strip above transport names the active sector in
all telemetry tabs, provides **Full-lap loop**, and explains outside seeking. It
wraps across phone rows; expanded panels keep their existing vertical scrolling
and plot text sizes. Changing the plotted sector does not move this selection.
CURRENT/REF names use fixed 56×20 px boxes, their existing blue/grey colors and
thin leaders to vehicle anchors. Names avoid timing, event labels and controls;
leaders run below badges so they do not cross over timing text. The overlay does
not capture pointer input. Offscreen or crowded names are omitted when a nearby
clear placement is unavailable. See GHOST_LABELS.md.
Time Delta places **Export full-lap JSON** beside the faster/slower legend. Its
visible label states scope even in a sector plot. The readout/action row wraps on
phones while the existing chart height remains usable; the button has a specific
accessible comparison-export name and native keyboard activation. The current
delta, reference caption, graph axes and loop strip remain in their existing roles.
The adjacent **Export full-lap CSV** action uses the same compact style and its
own explicit accessible name. The action row wraps both controls at narrow widths;
tooltips distinguish complete JSON inputs from numeric CSV rows and blank channels.

Timing CSV uses a native modal with fixed heading/actions and a scrolling body.
Paired column/unit controls have explicit accessible names; the converted preview
shows first/final records, units, count and duration. Reference metadata and the
source-alignment checkbox follow the preview. The import button stays unavailable
for invalid data, pending conversion or missing alignment, and native required
inputs guard metadata. Changing columns or units replaces the previous preview
with a concise Preparing preview status; Cancel remains usable during processing.
Errors remain local with room for wrapped record details. Escape/Cancel return
focus to Additional actions; all modal content fits desktop, phone and short
landscape viewports with vertical scrolling where needed.
