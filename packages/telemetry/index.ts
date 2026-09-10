import {
  isTimingReference,
  type Corner,
  type Lap,
  type Reference,
  type Sample,
} from "../shared/schema";

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
  reference: Reference | null,
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
  const wraps =
    current.cornerAnalysis === "closed-windows-v1" &&
    corner.exitIndex < corner.entryIndex;
  return corner.time - (exit - entry + (wraps ? reference.lapTime : 0));
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
    if (key === "normalLoadG") {
      if (a.normalLoadG !== undefined && b.normalLoadG !== undefined)
        result.normalLoadG =
          a.normalLoadG + (b.normalLoadG - a.normalLoadG) * f;
      else delete result.normalLoadG;
      continue;
    }
    if (!["gear", "cornerId", "sectorId"].includes(key))
      result[key] = a[key] + (b[key] - a[key]) * f;
  }
  return result;
}
export function lapDeltaAt(
  current: Lap,
  reference: Reference,
  distance: number,
): number | null {
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
  if (isTimingReference(reference)) return null;
  // Match normalized progress rather than raw racing-line length for comparable laps.
  const fraction = Math.max(0, Math.min(1, distance / current.length));
  return (
    interpolate(current.samples, fraction * current.length, "distance").time -
    interpolate(reference.samples, fraction * reference.length, "distance").time
  );
}

/** Compare the same physical intervals, including references with unrelated sample counts. */
export function referenceSectorTimes(
  current: Lap,
  reference: Reference | null,
): (number | null)[] {
  if (!reference) return current.sectors.map(() => null);
  if (
    current.alignment &&
    reference.alignment &&
    current.alignment.trackFingerprint === reference.alignment.trackFingerprint
  ) {
    const distance = current.samples.map((s) => s.distance);
    const times = reference.samples.map((s) => s.time);
    const atDistance = (at: number) =>
      interpolateValues(
        reference.alignment!.progress,
        times,
        interpolateValues(distance, current.alignment!.progress, at),
      );
    return current.sectors.map(
      (s) => atDistance(s.endDistance) - atDistance(s.startDistance),
    );
  }
  return isTimingReference(reference)
    ? current.sectors.map(() => null)
    : current.sectors.map((_, i) => reference.sectors[i]?.time ?? null);
}
export function formatTime(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, "0")}`;
}

/** Prepare axes once for cursor updates; merge both grids so fine reference events survive plotting. */
export function prepareTimeComparison(
  current: Lap,
  reference: Reference | null,
) {
  if (
    !current.alignment ||
    !reference?.alignment ||
    current.alignment.trackFingerprint !== reference.alignment.trackFingerprint
  )
    return null;
  const currentProgress = current.alignment.progress,
    referenceProgress = reference.alignment.progress;
  const currentTime = current.samples.map((s) => s.time),
    currentDistance = current.samples.map((s) => s.distance);
  const referenceTime = reference.samples.map((s) => s.time);
  const atTime = (time: number) => {
    const progress = interpolateValues(currentTime, currentProgress, time);
    return (
      Math.max(0, Math.min(current.lapTime, time)) -
      interpolateValues(referenceProgress, referenceTime, progress)
    );
  };
  const atDistance = (distance: number) => {
    const progress = interpolateValues(
      currentDistance,
      currentProgress,
      distance,
    );
    return (
      interpolateValues(currentDistance, currentTime, distance) -
      interpolateValues(referenceProgress, referenceTime, progress)
    );
  };
  const progress = Array.from(
    new Set([...currentProgress, ...referenceProgress]),
  ).sort((a, b) => a - b);
  const samples = progress.map((p) => {
    const time = interpolateValues(currentProgress, currentTime, p);
    return {
      time,
      distance: interpolateValues(currentProgress, currentDistance, p),
      delta: time - interpolateValues(referenceProgress, referenceTime, p),
    };
  });
  return { atTime, atDistance, samples };
}
export function signed(value: number, digits = 3) {
  const text = value.toFixed(digits);
  return Number(text) === 0
    ? (0).toFixed(digits)
    : `${value > 0 ? "+" : ""}${text}`;
}

/** Negative comparison deltas mean improvement; tone follows visible precision. */
export function comparisonTone(value: number | null, digits = 3) {
  if (value === null || Number(value.toFixed(digits)) === 0) return "neutral";
  return value < 0 ? "positive" : "negative";
}

/** Native channels and positions are comparable only on a matching declared source. */
export function alignedNativeReference(
  current: Lap | null,
  reference: Reference | null,
): Lap | null {
  if (!current?.alignment || !reference || isTimingReference(reference))
    return null;
  return current.alignment.trackFingerprint ===
    reference.alignment?.trackFingerprint
    ? reference
    : null;
}

/** Map native reference channels onto current-lap axes without dropping either grid's knots. */
export function prepareTelemetryComparison(
  current: Lap,
  reference: Reference | null,
) {
  const native = alignedNativeReference(current, reference);
  if (!native) return null;
  const currentProgress = current.alignment!.progress;
  const referenceProgress = native.alignment!.progress;
  const currentTime = current.samples.map((sample) => sample.time);
  const currentDistance = current.samples.map((sample) => sample.distance);
  const referenceTime = native.samples.map((sample) => sample.time);
  const progress = Array.from(
    new Set([...currentProgress, ...referenceProgress]),
  ).sort((a, b) => a - b);
  const atProgress = (position: number) =>
    interpolate(
      native.samples,
      interpolateValues(referenceProgress, referenceTime, position),
    );
  const points = progress.map((position) => ({
    progress: position,
    sample: atProgress(position),
    time: interpolateValues(currentProgress, currentTime, position),
    distance: interpolateValues(currentProgress, currentDistance, position),
  }));
  return {
    reference: native,
    points,
    atTime: (time: number) =>
      atProgress(interpolateValues(currentTime, currentProgress, time)),
  };
}

/** A completed ghost holds the finish pose until the shared current-lap clock restarts. */
export function ghostPose(
  lap: Pick<Lap, "samples" | "lapTime">,
  elapsedTime: number,
) {
  if (!Number.isFinite(elapsedTime))
    throw new Error("Playback time must be finite");
  const time = Math.max(0, Math.min(lap.lapTime, elapsedTime));
  const sample = interpolate(lap.samples, time);
  const next = interpolate(
    lap.samples,
    (time + Math.min(0.15, lap.lapTime / 4)) % lap.lapTime,
  );
  const dx = next.x - sample.x,
    dy = next.y - sample.y,
    dz = next.z - sample.z;
  return {
    sample,
    yaw: Math.atan2(dx, dz),
    pitch: -Math.atan2(dy, Math.hypot(dx, dz)),
    finished: time >= lap.lapTime,
  };
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
      if (
        wasPlaying &&
        (!this.snapshot.playing || now - this.emitted > 1000 / 30)
      ) {
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
