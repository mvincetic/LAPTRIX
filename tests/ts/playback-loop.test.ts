import { describe, expect, it, vi } from "vitest";
import { PlaybackClock } from "../../packages/telemetry";

describe("explicit playback intervals", () => {
  it.each([
    [0, 20],
    [80, 100],
  ])("restarts intervals adjoining lap boundaries (%s–%s)", (start, end) => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.focusLoop(start, end);
    clock.seek(end);
    clock.play(true);
    expect(clock.getSnapshot().time).toBe(start);
    clock.advance(end - start + 1);
    expect(clock.getSnapshot().time).toBe(start + 1);
  });
  it("selects an interval without starting paused playback", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.seek(10);
    clock.loop(false);
    clock.focusLoop(30, 40);
    expect(clock.getSnapshot()).toMatchObject({
      time: 30,
      playing: false,
      loop: true,
      loopRange: { start: 30, end: 40 },
    });
    clock.advance(5);
    expect(clock.getSnapshot().time).toBe(30);
  });
  it("retains current playback and wraps elapsed remainder at the selected rate", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.seek(35);
    clock.play(true);
    clock.rate(2);
    clock.focusLoop(30, 40);
    expect(clock.getSnapshot()).toMatchObject({ time: 35, playing: true });
    clock.advance(3); // 35 + 6 = 41, one second into the next interval.
    expect(clock.getSnapshot().time).toBe(31);
    clock.advance(57); // 31 + 114 = 145, five seconds into the interval.
    expect(clock.getSnapshot().time).toBe(35);
    clock.advance(2.5); // Exact endpoint wraps to the selected start.
    expect(clock.getSnapshot().time).toBe(30);
  });
  it("keeps inside inspection and restores full-lap looping on an outside seek", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.focusLoop(30, 40);
    clock.seek(34);
    expect(clock.getSnapshot().loopRange).toEqual({ start: 30, end: 40 });
    clock.seek(40);
    clock.play(true);
    expect(clock.getSnapshot().time).toBe(30);
    clock.seek(20);
    expect(clock.getSnapshot()).toMatchObject({
      time: 20,
      playing: true,
      loop: true,
      loopRange: null,
    });
    clock.advance(25);
    expect(clock.getSnapshot().time).toBe(45);
  });
  it("clears the interval through full-lap or disabled looping without moving the cursor", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.focusLoop(30, 40);
    clock.seek(35);
    clock.play(true);
    clock.loop(true);
    expect(clock.getSnapshot()).toMatchObject({
      time: 35,
      playing: true,
      loop: true,
      loopRange: null,
    });
    clock.focusLoop(30, 40);
    clock.loop(false);
    clock.advance(100);
    expect(clock.getSnapshot()).toMatchObject({
      time: 100,
      playing: false,
      loop: false,
      loopRange: null,
    });
  });
  it("notifies mode changes and resets an old interval on a new lap", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    clock.focusLoop(30, 40);
    expect(listener).toHaveBeenCalledTimes(1);
    clock.seek(0);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(clock.getSnapshot().loopRange).toBeNull();
    clock.focusLoop(30, 40);
    clock.configure(20);
    expect(listener).toHaveBeenCalledTimes(4);
    expect(clock.getSnapshot()).toMatchObject({
      time: 0,
      playing: false,
      duration: 20,
      loopRange: null,
    });
    unsubscribe();
  });
  it("rejects invalid interval bounds atomically", () => {
    const clock = new PlaybackClock();
    clock.configure(100);
    clock.focusLoop(30, 40);
    const before = clock.getSnapshot();
    const listener = vi.fn();
    clock.subscribe(listener);
    for (const [start, end] of [
      [NaN, 40],
      [30, NaN],
      [-1, 40],
      [40, 30],
      [30, 101],
      [30, 30],
      [0, Infinity],
    ]) {
      expect(() => clock.focusLoop(start, end)).toThrow();
      expect(clock.getSnapshot()).toBe(before);
    }
    expect(listener).not.toHaveBeenCalled();
  });
});
