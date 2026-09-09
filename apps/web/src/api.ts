import {
  catalogSchema,
  lapSchema,
  type Setup,
  type Track,
  type Vehicle,
} from "../../../packages/shared/schema";
async function request(url: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(60000)])
        : AbortSignal.timeout(60000),
    });
  } catch {
    if (init?.signal?.aborted) throw init.signal.reason;
    throw new Error(
      "The simulation service could not be reached. Start the project with npm run dev, then retry.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      typeof body?.detail === "string"
        ? body.detail
        : body?.detail?.map((d: { msg: string }) => d.msg).join("; ");
    throw new Error(
      message ||
        `Simulation service returned ${response.status}. Please retry.`,
    );
  }
  return response.json();
}
export async function getCatalog() {
  return catalogSchema.parse(await request("/api/catalog"));
}
export async function runSimulation(
  track: Track,
  vehicleId: string,
  setup: Setup,
  custom = false,
  signal?: AbortSignal,
  vehicle?: Vehicle,
) {
  return lapSchema.parse(
    await request("/api/simulate", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: track.id,
        vehicleId,
        setup,
        ...(custom ? { track } : {}),
        ...(vehicle ? { vehicle } : {}),
      }),
    }),
  );
}
