import { afterEach, describe, expect, it, vi } from "vitest";
import { TelemetryAudioEngine } from "../../packages/audio-engine";
import type { Sample } from "../../packages/shared/schema";

afterEach(() => vi.unstubAllGlobals());
const parameter = () => ({
  value: 0,
  setTargetAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
  setValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});
const gainNode = () => ({ gain: parameter(), connect: vi.fn() });
function audioContext() {
  const contexts: FakeContext[] = [];
  class FakeContext {
    sampleRate = 4;
    currentTime = 0;
    destination = {};
    gains: ReturnType<typeof gainNode>[] = [];
    resumes: { resolve: () => void; reject: (error: Error) => void }[] = [];
    closed = false;
    constructor() {
      contexts.push(this);
    }
    createGain() {
      const node = gainNode();
      this.gains.push(node);
      return node;
    }
    createOscillator() {
      return { frequency: parameter(), connect: vi.fn(), start: vi.fn() };
    }
    createBiquadFilter() {
      return { frequency: parameter(), Q: parameter(), connect: vi.fn() };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(4) };
    }
    createBufferSource() {
      return { connect: vi.fn(), start: vi.fn() };
    }
    resume() {
      return new Promise<void>((resolve, reject) =>
        this.resumes.push({ resolve, reject }),
      );
    }
    close() {
      this.closed = true;
      return Promise.resolve();
    }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return contexts;
}
const sample: Sample = {
  time: 20,
  distance: 1000,
  x: 0,
  y: 0,
  z: 0,
  speed: 50,
  rpm: 4000,
  gear: 3,
  throttle: 0.5,
  brake: 0,
  steering: 0,
  longitudinalG: 0,
  lateralG: 0,
  verticalG: 0,
  trackGradient: 0,
  cornerId: 0,
  sectorId: 1,
  offset: 0,
};

describe("audio activation ordering", () => {
  it("enables, mutes and re-enables through one context", async () => {
    const contexts = audioContext(),
      engine = new TelemetryAudioEngine();
    const first = engine.enable();
    contexts[0].resumes[0].resolve();
    await first;
    const master = contexts[0].gains[0].gain;
    engine.update(sample, true);
    expect(master.setTargetAtTime.mock.calls.at(-1)![0]).toBeGreaterThan(0);
    engine.mute();
    expect(master.setTargetAtTime.mock.calls.at(-1)![0]).toBe(0);
    master.setTargetAtTime.mockClear();
    engine.update(sample, true);
    expect(master.setTargetAtTime).not.toHaveBeenCalled();
    const second = engine.enable();
    contexts[0].resumes[1].resolve();
    await second;
    engine.update(sample, true);
    expect(master.setTargetAtTime.mock.calls.at(-1)![0]).toBeGreaterThan(0);
    expect(contexts).toHaveLength(1);
    engine.dispose();
    expect(contexts[0].closed).toBe(true);
  });
  it("does not reactivate output when an older enable finishes after mute", async () => {
    const contexts = audioContext(),
      engine = new TelemetryAudioEngine();
    const old = engine.enable(),
      current = engine.enable();
    contexts[0].resumes[1].resolve();
    await current;
    engine.mute();
    const master = contexts[0].gains[0].gain;
    master.setTargetAtTime.mockClear();
    contexts[0].resumes[0].resolve();
    await old;
    engine.update(sample, true);
    expect(master.setTargetAtTime).not.toHaveBeenCalled();
    engine.dispose();
  });
  it("cannot activate a replacement context from a disposed context's completion", async () => {
    const contexts = audioContext(),
      engine = new TelemetryAudioEngine();
    const old = engine.enable();
    engine.dispose();
    const current = engine.enable();
    const master = contexts[1].gains[0].gain;
    contexts[0].resumes[0].resolve();
    await old;
    engine.update(sample, true);
    expect(master.setTargetAtTime).not.toHaveBeenCalled();
    expect(contexts[0].closed).toBe(true);
    contexts[1].resumes[0].resolve();
    await current;
    engine.update(sample, true);
    expect(master.setTargetAtTime.mock.calls.at(-1)![0]).toBeGreaterThan(0);
    engine.dispose();
  });
});
