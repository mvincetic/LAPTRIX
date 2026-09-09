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
