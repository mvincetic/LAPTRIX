export type TickBounds = Readonly<{ left: number; right: number }>;

/** Retain the right endpoint and fitting labels in source order, with a readable gap. */
export function visibleAxisTicks(
  bounds: readonly TickBounds[],
  width: number,
  gap = 6,
) {
  const visible = bounds.map(() => false);
  if (!(width > 0) || !bounds.length) return visible;
  const fits = ({ left, right }: TickBounds) =>
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    left >= -0.5 &&
    right >= left &&
    right <= width + 0.5;
  const last = bounds.length - 1;
  visible[last] = fits(bounds[last]);
  const end = visible[last] ? bounds[last].left - gap : width;
  let right = -gap;
  for (let i = 0; i < last; i++) {
    const tick = bounds[i];
    if (fits(tick) && tick.left >= right + gap && tick.right <= end) {
      visible[i] = true;
      right = tick.right;
    }
  }
  return visible;
}
