import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaybackClock } from "../../packages/telemetry";

afterEach(() => vi.unstubAllGlobals());

function scheduler() {
  let next = 0;
  const queued = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = next++;
    queued.set(id, callback);
    return id;
  });
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", (id: number) => queued.delete(id));
  return {
    queued,
    request,
    step(time: number) {
      expect(queued.size).toBe(1);
      const [id, callback] = [...queued][0];
      queued.delete(id);
      callback(time);
    },
  };
}

describe("playback scheduling follows active work", () => {
  it("stays asleep while paused, including inspection and loop controls", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    const stop = clock.start();
    clock.configure(100);
    clock.seek(30);
    clock.rate(4);
    clock.focusLoop(20, 40);
    clock.loop(true);
    clock.play(false);
    expect(clock.getSnapshot()).toMatchObject({ time: 30, playing: false });
    expect(frames.request).not.toHaveBeenCalled();
    expect(frames.queued.size).toBe(0);
    stop();
  });
  it("wakes once on play and resumes without adding time spent paused", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(100);
    const stop = clock.start();
    clock.play(true);
    clock.play(true);
    frames.step(0);
    frames.step(20);
    expect(clock.getSnapshot().time).toBeCloseTo(0.02, 12);
    clock.play(false);
    expect(frames.queued.size).toBe(0);
    clock.play(true);
    frames.step(100000);
    expect(clock.getSnapshot().time).toBeCloseTo(0.02, 12);
    frames.step(100020);
    expect(clock.getSnapshot().time).toBeCloseTo(0.04, 12);
    stop();
    expect(frames.queued.size).toBe(0);
  });
  it("retains the 0.1-second delayed-frame cap and requested playback rate", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(100);
    clock.rate(2);
    clock.play(true);
    const stop = clock.start();
    frames.step(100);
    frames.step(10100);
    expect(clock.getSnapshot().time).toBeCloseTo(0.2, 12);
    expect(frames.queued.size).toBe(1);
    stop();
  });
  it("shares one frame chain across start owners and cleans up only the last", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(100);
    clock.play(true);
    const first = clock.start(),
      second = clock.start();
    expect(frames.queued.size).toBe(1);
    frames.step(100);
    first();
    first();
    expect(frames.queued.size).toBe(1);
    frames.step(120);
    second();
    expect(frames.queued.size).toBe(0);
    const at = clock.getSnapshot().time;
    const restarted = clock.start();
    frames.step(10000);
    expect(clock.getSnapshot().time).toBe(at);
    restarted();
    expect(frames.queued.size).toBe(0);
    clock.play(true);
    expect(frames.queued.size).toBe(0);
  });
  it("cancels pending work when a new lap resets playback", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(100);
    clock.focusLoop(20, 40);
    const stop = clock.start();
    clock.play(true);
    frames.step(100);
    frames.step(120);
    clock.configure(50);
    expect(frames.queued.size).toBe(0);
    expect(clock.getSnapshot()).toMatchObject({
      time: 0,
      duration: 50,
      playing: false,
      loopRange: null,
    });
    clock.play(true);
    frames.step(10000);
    expect(clock.getSnapshot().time).toBe(0);
    stop();
  });
  it("stops scheduling at a non-looping finish and wakes for replay", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(1);
    clock.loop(false);
    clock.seek(0.95);
    const stop = clock.start();
    clock.play(true);
    frames.step(100);
    frames.step(170);
    expect(clock.getSnapshot()).toMatchObject({ time: 1, playing: false });
    expect(frames.queued.size).toBe(0);
    clock.play(true);
    expect(clock.getSnapshot().time).toBe(0);
    frames.step(10000);
    frames.step(10020);
    expect(clock.getSnapshot().time).toBeCloseTo(0.02, 12);
    stop();
  });
  it("honors a listener pausing during a frame notification", () => {
    const frames = scheduler(),
      clock = new PlaybackClock();
    clock.configure(100);
    const stop = clock.start();
    const unsubscribe = clock.subscribe(() => {
      const state = clock.getSnapshot();
      if (state.playing && state.time > 0) clock.play(false);
    });
    clock.play(true);
    frames.step(100);
    frames.step(140);
    expect(clock.getSnapshot()).toMatchObject({ time: 0.04, playing: false });
    expect(frames.queued.size).toBe(0);
    unsubscribe();
    stop();
  });
});
