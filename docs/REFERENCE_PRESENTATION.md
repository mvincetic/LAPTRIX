# Current and reference vehicle presentation

The blue current vehicle remains opaque. A spatially compatible reference uses
the same category-correct geometry with gray paint and 28% material opacity.
It tests scene depth without writing an opaque surface over the current car;
the scene remains visible through it. The reference receives the
original environment lighting but neither casts nor receives the current car's
shadow. Its separate contact-shade plane and texture are omitted.

The appearance policy is applied to each vehicle's own standard materials when
that vehicle mounts or changes. Materials are not shared between current and
reference. Formula and GT geometry, metre scale, pose, wheel rotation, steering
and GT lamp intensity retain their original telemetry behavior. Each car reads
its own native lap at the shared clock time. No pose offset, second clock, extra
frame callback, opacity animation or additional texture is introduced.

This is a comparison ghost, with deliberately visible internal surfaces when
viewed alone. Standard transparent-material sorting applies; this is not optical
glass or a photorealistic vehicle. The blue current car remains the physical
subject. Existing current/reference names and gray/blue keys still identify both
laps, including when their positions coincide. Timing-only references continue
to have no spatial vehicle.

## Verification

The initial 24-image overlap study covers both circuits, both vehicle categories
and desktop/phone Chase views. Opaque reference bodywork visibly replaces blue
paint. The translucent candidate retains 98.6–100% of the blue pixels inside the
current-car projection, versus 53.6–87.2% for the opaque treatment. These initial
projection counts also include any racing line inside the box; the permanent
regression therefore isolates actual car paint using a car-free image.

`reference-appearance.spec.ts` captures the real browser compositor with neither
car, current only, overlap and reference only. A car-specific blue mask excludes
the existing racing line and requires over 90% retention through overlap. A
separate pixel difference requires the reference to remain visible on its own.
The same tests run against development and the built distribution, preserving the
full exported workspace, pending fuel edit, five-second cursor and solve count.

`scripts/reference-qa.mjs` uses native calculated laps for overlap and separation
of 8–18 metres, with independent interpolation of both positions. It captures
both circuits and vehicle categories at 1600, 1280 and 390 px in all four existing
cameras, checking material independence, resource identity, opacity/depth policy,
unchanged positions, workspace preservation and page bounds. No synthetic lap or
application inspection hook is added. GT lamp, label, playback, idle and graphics
restoration regressions cover the adjacent behavior.
