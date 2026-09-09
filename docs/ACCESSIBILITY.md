# Keyboard and accessible-control review

The current pass checks the default workspace at 1600 and 390 px widths and the
Additional actions workflow. It is a bounded browser review, not a WCAG compliance
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

Remaining review includes viewer/telemetry tab arrow-key navigation and associated
panel relationships, selected-state exposure on compact toggle controls, broader
expanded/error states, contrast, zoom, screen readers and representative browsers.
The existing native aero dialog has keyboard dismissal and return-focus tests,
but a complete application accessibility audit remains future work.
