# Keyboard and accessible-control review

The current pass checks the default workspace at 1600 and 390 px widths, the
Additional actions workflow and viewer/telemetry tabs. It is a bounded browser review, not a WCAG compliance
claim or a substitute for assistive-technology and user testing.

Additional actions is a disclosure containing native buttons. Its trigger exposes
`aria-expanded` and links to the visible labelled group with `aria-controls`.
Enter and Space toggle it. This follows the semantics in the
[W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/);
the list uses ordinary button Tab navigation rather than claiming ARIA menu roles.

Tab enters the first enabled action and visits the enabled buttons in document
order. The pointer-dismiss overlay is outside the tab order. Leaving the disclosure
closes it while retaining the new focus destination. Escape closes it and returns
focus to its trigger. Action activation and pointer dismissal also restore trigger
focus; a newly opened native modal then handles its own focus. Export and an empty
file-picker return are covered by browser regression tests.

The disclosure is bounded by its measured top edge and the viewport's lower
12 px gutter. Its action rows keep their original size and scroll internally.
At 780 × 390, the earlier menu extended to y518 and keyboard navigation scrolled
the page by 231 px, hiding the opener. It now ends at y378 and visiting every
action keeps the page at its original scroll position. Desktop and portrait
phone layouts keep their full menu height when it fits. The resize/wheel journey
also checks 390 × 300, contained overscroll, reopening and unchanged project,
pending settings and clock. Native focus and dismissal semantics stay the same.
`node scripts/actions-menu-qa.mjs` captures initial, final-action and reopened
states across five viewport sizes after the actual viewer loads.

The baseline audit found the invisible dismiss overlay received the first Tab,
Escape did nothing and focus stayed away from the trigger. The corrected audit
finds Compare aero settings first, a closed disclosure after Escape and trigger
focus restored at both widths. No visible unnamed buttons, textboxes, comboboxes,
sliders, spinbuttons, checkboxes or tabs were found on the sampled default screen.
Mobile Save has an explicit name even when its visible text is hidden; active
calculations expose Cancel calculation. See VALIDATION.md for regression evidence.

Run `node scripts/keyboard-audit.mjs` with local services running. It writes
`artifacts/keyboard-audit.json` and focused-action screenshots. `--baseline` writes
separate baseline artifacts when investigating another change. Open screenshots
to inspect the actual focus cue; the JSON report alone is not visual verification.

Viewer and telemetry tabs share a roving tab stop with automatic activation on
focus. Left/Right wrap, Home/End select the first/last tab, and Tab leaves the strip
for the next control or active panel. Up/Down retain ordinary page scrolling. Tabs
and panels have reciprocal labelled/controlled relationships, and inactive panels
are hidden. This follows the [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
The active panel has a visible focus cue; viewer tools precede canvas markers in
document order. In chase mode, focusing the Track View panel reveals its legend.
Camera and horizontal-axis buttons expose selected state with `aria-pressed`.
Changing a tab retains the 3D canvas, camera/layer choices, axis and shared clock.

`node scripts/tabs-qa.mjs` captures keyboard-focused layers, chase legend, delta
and sector panels at both widths and records runtime errors and page widths.
Browser regressions check arrow wrapping, first/last selection, panel focus and
relationships, layer interaction, camera/axis state and retained playback time.

Cursor Data provides native numeric entry with labelled units, bounds and keyboard
submission. Invalid entry keeps the clock unchanged; Escape discards draft text.
Focus captures the entry value before typing so playback cannot change a selection;
Escape restores the current value and holds it for continued editing.
Its description list exposes numerical channel values without a rapidly updating
live region. The existing slider's value text identifies both seconds and metres.
The focused panel itself scrolls on desktop, keeping its complete readout and note
reachable by keyboard; mobile content expands into the document.
Ghost visibility uses independent labelled native checkboxes. The reference option
is disabled with an explanation when positions are unavailable. Optional CURRENT
and REF labels expose vehicle names and do not intercept viewer pointer gestures.
Project naming is available through the actions disclosure at all screen widths.
Its labelled native dialog focuses/selects the current name, uses a separate draft
and supports Enter, Escape, Cancel and Close. Closing releases the modal before
restoring focus to Additional actions. Tests verify every dismissal path, current
workspace/cursor retention, name limits, blank names and save/reload.
Plot range is a labelled native select within each graph's tab panel. Explicit
Inspect start and Full lap controls separate seeking from zooming. Sector Analysis
focuses the graph tab after its source button is removed. Text identifies a cursor
outside the selected sector; the full-lap transport remains reachable on desktop
when additional controls increase content height.

Remaining review includes broader expanded/error states, contrast, zoom, screen
readers and representative browsers.
The existing native aero dialog has keyboard dismissal and return-focus tests,
but a complete application accessibility audit remains future work.
