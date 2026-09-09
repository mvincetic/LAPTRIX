import type { Corner, Lap, Sample } from "../shared/schema";

function interpolateValues(axis: number[], values: number[], at: number) {
  if (!Number.isFinite(at)) throw new Error("Alignment cursor must be finite");
  if (at <= axis[0]) return values[0];
  if (at >= axis.at(-1)!) return values.at(-1)!;
  let lo = 0,
    hi = axis.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (axis[mid] <= at) lo = mid;
    else hi = mid;
  }
  return (
    values[lo] +
    ((values[hi] - values[lo]) * (at - axis[lo])) / (axis[hi] - axis[lo])
  );
}

export function cornerDelta(
  current: Lap,
  reference: Lap | null,
  corner: Corner,
) {
  if (
    !current.alignment ||
    !reference?.alignment ||
    current.alignment.trackFingerprint !== reference.alignment.trackFingerprint
  )
    return null;
  const time = reference.samples.map((s) => s.time);
  const entry = interpolateValues(
    reference.alignment.progress,
    time,
    current.alignment.progress[corner.entryIndex],
  );
  const exit = interpolateValues(
    reference.alignment.progress,
    time,
    current.alignment.progress[corner.exitIndex],
  );
  return corner.time - (exit - entry);
}

export function interpolate(
  samples: Sample[],
  value: number,
  axis: "time" | "distance" = "time",
): Sample {
  if (!samples.length) throw new Error("Telemetry is empty");
  if (!Number.isFinite(value)) throw new Error("Cursor must be finite");
  if (value <= samples[0][axis]) return { ...samples[0] };
  if (value >= samples[samples.length - 1][axis])
    return { ...samples[samples.length - 1] };
  let lo = 0,
    hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid][axis] <= value) lo = mid;
    else hi = mid;
  }
  const a = samples[lo],
    b = samples[hi],
    f = (value - a[axis]) / (b[axis] - a[axis]);
  const result = { ...a };
  for (const key of Object.keys(a) as (keyof Sample)[]) {
    if (!["gear", "cornerId", "sectorId"].includes(key))
      result[key] = a[key] + (b[key] - a[key]) * f;
  }
  return result;
}
export function lapDeltaAt(current: Lap, reference: Lap, distance: number) {
  if (
    current.alignment &&
    reference.alignment &&
    current.alignment.trackFingerprint === reference.alignment.trackFingerprint
  ) {
    const progress = interpolateValues(
      current.samples.map((s) => s.distance),
      current.alignment.progress,
      distance,
    );
    return (
      interpolate(current.samples, distance, "distance").time -
      interpolateValues(
        reference.alignment.progress,
        reference.samples.map((s) => s.time),
        progress,
      )
    );
  }
  // Match normalized progress rather than raw racing-line length for comparable laps.
  const fraction = Math.max(0, Math.min(1, distance / current.length));
  return (
    interpolate(current.samples, fraction * current.length, "distance").time -
    interpolate(reference.samples, fraction * reference.length, "distance").time
  );
}
export function formatTime(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, "0")}`;
}
export function signed(value: number, digits = 3) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export class PlaybackClock {
  private snapshot = {
    time: 0,
    playing: false,
    rate: 1,
    duration: 1,
    loop: true,
  };
  private listeners = new Set<() => void>();
  private frame = 0;
  private last = 0;
  private emitted = 0;
  getSnapshot = () => this.snapshot;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private emit() {
    for (const fn of this.listeners) fn();
  }
  configure(duration: number) {
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("Lap duration must be positive and finite");
    this.snapshot = { ...this.snapshot, duration, time: 0, playing: false };
    this.emit();
  }
  seek(time: number) {
    if (!Number.isFinite(time)) throw new Error("Seek time must be finite");
    this.snapshot = {
      ...this.snapshot,
      time: Math.max(0, Math.min(this.snapshot.duration, time)),
    };
    this.emit();
  }
  play(playing: boolean) {
    this.snapshot = {
      ...this.snapshot,
      playing,
      time:
        playing && this.snapshot.time >= this.snapshot.duration
          ? 0
          : this.snapshot.time,
    };
    this.emit();
  }
  rate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0 || rate > 16)
      throw new Error("Playback rate must be above 0 and at most 16");
    this.snapshot = { ...this.snapshot, rate };
    this.emit();
  }
  loop(loop: boolean) {
    this.snapshot = { ...this.snapshot, loop };
    this.emit();
  }
  advance(delta: number) {
    if (!Number.isFinite(delta) || delta < 0)
      throw new Error("Elapsed time must be finite and nonnegative");
    const state = this.snapshot;
    if (!state.playing) return;
    let time = state.time + delta * state.rate,
      playing = true;
    if (time >= state.duration) {
      if (state.loop) time %= state.duration;
      else {
        time = state.duration;
        playing = false;
      }
    }
    this.snapshot = { ...state, time, playing };
  }
  start() {
    const tick = (now: number) => {
      const wasPlaying = this.snapshot.playing;
      this.advance(this.last ? Math.min((now - this.last) / 1000, 0.1) : 0);
      this.last = now;
      if (wasPlaying && now - this.emitted > 1000 / 30) {
        this.emit();
        this.emitted = now;
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(this.frame);
      this.last = 0;
    };
  }
}
