import type { Sample } from "../shared/schema";

/** Original procedural synthesis. All event timing comes from the supplied sample. */
export class TelemetryAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private harmonic: OscillatorNode | null = null;
  private whine: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private wind: GainNode | null = null;
  private shift: GainNode | null = null;
  private previousGear = 0;
  private previousTime = 0;
  private enabled = false;

  async enable() {
    if (!this.context) {
      this.context = new AudioContext();
      const ctx = this.context;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      this.filter = ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 1800;
      this.filter.Q.value = 0.7;
      this.filter.connect(this.master);
      this.engine = ctx.createOscillator();
      this.engine.type = "sawtooth";
      this.engine.connect(this.filter);
      this.engine.start();
      this.harmonic = ctx.createOscillator();
      this.harmonic.type = "triangle";
      const hg = ctx.createGain();
      hg.gain.value = 0.2;
      this.harmonic.connect(hg);
      hg.connect(this.filter);
      this.harmonic.start();
      this.whine = ctx.createOscillator();
      this.whine.type = "sine";
      const wg = ctx.createGain();
      wg.gain.value = 0.05;
      this.whine.connect(wg);
      wg.connect(this.master);
      this.whine.start();
      // A deterministic, original noise buffer supplies wind and short gear events.
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
        channel = buffer.getChannelData(0);
      let seed = 93;
      for (let i = 0; i < channel.length; i++) {
        seed = (seed * 16807) % 2147483647;
        channel[i] = ((seed / 2147483647) * 2 - 1) * 0.3;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      noise.connect(filter);
      this.wind = ctx.createGain();
      this.wind.gain.value = 0;
      filter.connect(this.wind);
      this.wind.connect(this.master);
      this.shift = ctx.createGain();
      this.shift.gain.value = 0;
      filter.connect(this.shift);
      this.shift.connect(this.master);
      noise.start();
    }
    await this.context.resume();
    this.enabled = true;
    this.previousGear = 0;
  }
  mute() {
    this.enabled = false;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
  }
  update(sample: Sample, playing: boolean) {
    if (!this.context || !this.master || !this.enabled) return;
    const t = this.context.currentTime;
    this.master.gain.setTargetAtTime(
      playing ? 0.035 * (0.3 + 0.7 * sample.throttle) : 0,
      t,
      0.025,
    );
    // Generic six-cylinder four-stroke firing frequency; this is not a named engine.
    const frequency = (sample.rpm / 60) * 3;
    this.engine?.frequency.setTargetAtTime(frequency, t, 0.018);
    this.harmonic?.frequency.setTargetAtTime(frequency * 2, t, 0.018);
    this.filter?.frequency.setTargetAtTime(
      750 + sample.throttle * 2600,
      t,
      0.025,
    );
    this.whine?.frequency.setTargetAtTime(200 + sample.speed * 14, t, 0.025);
    this.wind?.gain.setTargetAtTime(Math.min(0.5, sample.speed / 220), t, 0.03);
    const continuous =
      sample.time >= this.previousTime && sample.time - this.previousTime < 0.5;
    if (
      playing &&
      continuous &&
      this.previousGear &&
      sample.gear !== this.previousGear &&
      this.shift
    ) {
      this.shift.gain.cancelScheduledValues(t);
      this.shift.gain.setValueAtTime(0.9, t);
      this.shift.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    }
    this.previousGear = sample.gear;
    this.previousTime = sample.time;
  }
  dispose() {
    if (this.context) void this.context.close();
    this.context = null;
    this.master = null;
    this.enabled = false;
  }
}
