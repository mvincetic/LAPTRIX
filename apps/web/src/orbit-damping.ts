/** Preserve the established 0.12 decay at 60 Hz across slower display frames. */
export function orbitDampingFactor(deltaSeconds: number) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0.12;
  return 1 - Math.pow(1 - 0.12, deltaSeconds * 60);
}
