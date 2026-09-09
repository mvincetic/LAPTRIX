import { useEffect } from "react";
import { z } from "zod";
import type { Lap } from "../../../packages/shared/schema";
import { interpolate, type PlaybackClock } from "../../../packages/telemetry";

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown | Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
/** Optional proposed browser API. Never required for ordinary browser operation. */
export function useLapTools(lap: Lap | null, clock: PlaybackClock) {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool || !lap) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "inspect_lap_at_distance",
            title: "Inspect lap at distance",
            description:
              "Pause playback and inspect the current simulated lap at a distance in metres. Updates the shared car and chart cursor.",
            inputSchema: {
              type: "object",
              properties: {
                distance: { type: "number", minimum: 0, maximum: lap.length },
              },
              required: ["distance"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            async execute(input: unknown) {
              const { distance } = z
                .object({
                  distance: z.number().finite().min(0).max(lap.length),
                })
                .strict()
                .parse(input);
              const sample = interpolate(lap.samples, distance, "distance");
              clock.play(false);
              clock.seek(sample.time);
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
              return {
                model: lap.model,
                lapTime: lap.lapTime,
                distance: sample.distance,
                time: sample.time,
                speedMps: sample.speed,
                rpm: sample.rpm,
                gear: sample.gear,
                throttle: sample.throttle,
                brake: sample.brake,
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {
        /* An unavailable optional registry must not interrupt the dashboard. */
      });
    } catch {
      /* Unsupported registry implementations leave the ordinary controls working. */
    }
    return () => controller.abort();
  }, [lap, clock]);
}
