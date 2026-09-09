import { z } from "zod";

const finite = z.number().finite();
export const pointSchema = z
  .object({
    x: finite,
    y: finite,
    z: finite,
    widthLeft: finite.min(2).max(40),
    widthRight: finite.min(2).max(40),
    banking: finite.min(-0.3).max(0.3).default(0),
  })
  .strict();
export const trackSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
    name: z.string().min(1).max(100),
    country: z.string().max(100),
    provenance: z.string().max(500),
    synthetic: z.boolean(),
    closed: z.literal(true),
    sectorFractions: z.array(finite.positive().max(1)).min(2).max(6),
    points: z.array(pointSchema).min(40).max(2000),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (
      t.sectorFractions.at(-1) !== 1 ||
      t.sectorFractions.some((s, i) => i > 0 && s <= t.sectorFractions[i - 1])
    )
      ctx.addIssue({
        code: "custom",
        message: "Sector fractions must increase to exactly 1",
      });
    let length = 0;
    t.points.forEach((p, i) => {
      const q = t.points[(i + 1) % t.points.length];
      const prev = t.points[(i + t.points.length - 1) % t.points.length];
      const ds = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      length += ds;
      if (
        ds < 0.1 ||
        ds > 150 ||
        Math.hypot(q.x - prev.x, q.z - prev.z) < 0.1 ||
        Math.abs(p.y - q.y) / ds > 0.3 ||
        Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 100000 ||
        p.banking !== 0
      )
        ctx.addIssue({
          code: "custom",
          message: `Invalid sample ${i}: check spacing, horizontal frame, gradient, local coordinates and zero banking`,
        });
    });
    if (length > 30000)
      ctx.addIssue({ code: "custom", message: "Track exceeds 30 km" });
  });
export type Track = z.infer<typeof trackSchema>;
export type Point = { x: number; y: number; z: number };
export const setupSchema = z.object({
  tire: z.enum(["soft", "medium", "hard"]),
  fuel: finite.min(0).max(110),
  aero: finite.min(-5).max(5),
  brakeBias: finite.min(50).max(70),
  temperature: finite.min(5).max(45),
  trackState: z.enum(["optimum", "green"]),
  solver: z.enum(["optimized", "centerline", "lap-time"]),
  airDensity: finite.min(0.9).max(1.4),
  sampling: z.enum(["source", "5m", "3m"]).default("source"),
});
export type Setup = z.infer<typeof setupSchema>;
export const defaultSetup: Setup = {
  tire: "soft",
  fuel: 15,
  aero: 0,
  brakeBias: 56,
  temperature: 26,
  trackState: "optimum",
  solver: "optimized",
  airDensity: 1.225,
  sampling: "source",
};
export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  synthetic: z.boolean(),
  mass: finite.positive(),
  powerKw: finite.positive(),
  powerCurve: z.array(
    z.object({ rpm: finite.positive(), powerKw: finite.positive() }),
  ),
  dragArea: finite.positive(),
  downforceArea: finite.nonnegative(),
  friction: finite.positive(),
  maxBrakeG: finite.positive(),
  gearRatios: z.array(finite.positive()),
  finalDrive: finite.positive(),
  wheelRadius: finite.positive(),
  wheelbase: finite.positive(),
  idleRpm: finite.positive(),
  maxRpm: finite.positive(),
  width: finite.positive(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;
export const sampleSchema = z.object({
  distance: finite.nonnegative(),
  time: finite.nonnegative(),
  x: finite,
  y: finite,
  z: finite,
  speed: finite.positive(),
  rpm: finite.nonnegative(),
  gear: finite.int().positive(),
  throttle: finite.min(0).max(1),
  brake: finite.min(0).max(1),
  steering: finite,
  longitudinalG: finite,
  lateralG: finite,
  verticalG: finite,
  trackGradient: finite,
  cornerId: finite.int().nonnegative(),
  sectorId: finite.int().positive(),
  offset: finite,
});
export type Sample = z.infer<typeof sampleSchema>;
export const lapSchema = z
  .object({
    schemaVersion: z.literal(1),
    trackId: z.string(),
    vehicleId: z.string(),
    setup: setupSchema,
    model: z.string(),
    lapTime: finite.positive(),
    length: finite.positive(),
    maxSpeed: finite.positive(),
    averageSpeed: finite.positive(),
    elevationRange: finite.nonnegative(),
    computationMs: finite.nonnegative(),
    warnings: z.array(z.string()),
    optimization: z.object({
      method: z.string(),
      converged: z.boolean(),
      iterations: finite.int(),
      curvatureObjectiveReduction: finite.optional(),
      projectedGradient: finite.nonnegative().optional(),
      refinement: z
        .object({
          seedLapTime: finite.positive(),
          gainSeconds: finite.nonnegative(),
          evaluations: finite.int().nonnegative(),
          evaluationBudget: finite.int().positive(),
          acceptedSteps: finite.int().nonnegative(),
          rejectedCandidates: finite.int().nonnegative(),
          status: z.enum(["completed", "seed-infeasible"]),
        })
        .optional(),
    }),
    numericalChecks: z
      .object({
        speedConverged: z.boolean(),
        maxDemandRatio: finite.nonnegative(),
        demandTolerance: finite.min(1),
      })
      .optional(),
    sampling: z
      .object({
        mode: z.enum(["source", "5m", "3m"]),
        sourcePointCount: finite.int().min(40).max(2000),
        pointCount: finite.int().min(40).max(2000),
        targetSpacing: finite.positive().nullable(),
        meanSpacing: finite.positive(),
        maxSpacing: finite.positive(),
        capped: z.boolean(),
        maxSourceDeviation: finite.nonnegative(),
        points: z.array(pointSchema).min(40).max(2000),
      })
      .optional(),
    alignment: z
      .object({
        trackFingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/),
        progress: z.array(finite.min(0).max(1)).min(41),
      })
      .optional(),
    samples: z.array(sampleSchema).min(41),
    sectors: z.array(
      z.object({
        id: finite.int(),
        time: finite.positive(),
        split: finite.positive(),
        startDistance: finite.nonnegative(),
        endDistance: finite.positive(),
      }),
    ),
    corners: z.array(
      z.object({
        id: finite.int(),
        direction: z.enum(["L", "R"]),
        apexIndex: finite.int(),
        entryIndex: finite.int(),
        exitIndex: finite.int(),
        brakingIndex: finite.int(),
        turnInIndex: finite.int(),
        throttleIndex: finite.int(),
        distance: finite,
        entrySpeed: finite,
        minSpeed: finite,
        exitSpeed: finite,
        lateralG: finite,
        brakingDistance: finite,
        time: finite,
      }),
    ),
  })
  .superRefine((lap, ctx) => {
    if (lap.alignment) {
      const p = lap.alignment.progress;
      if (
        p.length !== lap.samples.length ||
        p[0] !== 0 ||
        p.at(-1) !== 1 ||
        p.some((v, i) => i > 0 && v <= p[i - 1])
      )
        ctx.addIssue({
          code: "custom",
          message: "Track alignment must span the complete lap in order",
        });
    }
    if (
      lap.sampling &&
      (lap.sampling.pointCount !== lap.samples.length - 1 ||
        lap.sampling.points.length !== lap.sampling.pointCount ||
        !lap.alignment ||
        lap.sampling.mode !== lap.setup.sampling)
    )
      ctx.addIssue({
        code: "custom",
        message: "Sampling geometry must match the solved lap",
      });
    const refinement = lap.optimization.refinement;
    if (
      refinement &&
      (Math.abs(refinement.seedLapTime - lap.lapTime - refinement.gainSeconds) >
        1e-5 ||
        refinement.evaluations > refinement.evaluationBudget ||
        refinement.acceptedSteps + refinement.rejectedCandidates >
          refinement.evaluations ||
        (refinement.status === "completed" &&
          refinement.evaluations !== refinement.evaluationBudget) ||
        (refinement.status === "seed-infeasible" &&
          (refinement.evaluations !== 0 || refinement.gainSeconds !== 0)))
    )
      ctx.addIssue({
        code: "custom",
        message: "Lap-time refinement diagnostics are inconsistent",
      });
    const first = lap.samples[0],
      last = lap.samples.at(-1)!;
    if (
      first.time !== 0 ||
      first.distance !== 0 ||
      Math.abs(last.time - lap.lapTime) > 1e-5 ||
      Math.abs(last.distance - lap.length) > 1e-5 ||
      Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z) > 1e-5
    )
      ctx.addIssue({
        code: "custom",
        message: "Lap telemetry must include the complete closed interval",
      });
    if (
      lap.samples.some(
        (s, i) =>
          i > 0 &&
          (s.time <= lap.samples[i - 1].time ||
            s.distance <= lap.samples[i - 1].distance),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Telemetry time and distance must strictly increase",
      });
    if (
      lap.sectors.length < 2 ||
      Math.abs(lap.sectors.reduce((sum, s) => sum + s.time, 0) - lap.lapTime) >
        1e-5
    )
      ctx.addIssue({
        code: "custom",
        message: "Sector times must partition the complete lap",
      });
    for (const corner of lap.corners) {
      const indices = [
        corner.brakingIndex,
        corner.entryIndex,
        corner.turnInIndex,
        corner.apexIndex,
        corner.throttleIndex,
        corner.exitIndex,
      ];
      if (
        indices.some((i) => i < 0 || i >= lap.samples.length) ||
        corner.entryIndex > corner.apexIndex ||
        corner.apexIndex > corner.exitIndex
      )
        ctx.addIssue({
          code: "custom",
          message: "Corner event index is outside the lap",
        });
    }
  });
export type Lap = z.infer<typeof lapSchema>;
export type Corner = Lap["corners"][number];
export const catalogSchema = z.object({
  tracks: z.array(trackSchema).min(1),
  vehicles: z.array(vehicleSchema).min(1),
});
export type Catalog = z.infer<typeof catalogSchema>;
