# LAPTRIX engineering operating manual

Before substantial work, read README.md, docs/PRODUCT.md, docs/ARCHITECTURE.md,
docs/ROADMAP.md, docs/DECISIONS.md and docs/DESIGN_SYSTEM.md.

The repository is the source of truth. Keep documentation aligned with code and
roadmap changes. Simulation data is authoritative: rendering, animation, analysis
and audio consume the same telemetry. Never create a parallel fake lap or clock.
Keep track geometry and vehicle behavior in validated data, not UI conditionals.
Do not copy proprietary motorsport assets or represent approximate data as official.

Test important math, data validation, interpolation and simulation behavior. Run
lint, typecheck, unit/API tests and production build before a stable milestone.
Visually inspect meaningful UI changes in a running browser at desktop and narrow
sizes; check controls, errors and synchronization. Document findings honestly.

Preserve useful architecture and user work. Refactor when justified and record
significant decisions in docs/DECISIONS.md. Create focused milestone commits.
Never force-push, rewrite history, merge to main or change repository settings
without explicit permission. Continue autonomously toward the documented product
and prioritize correctness and usability before expanding features.
