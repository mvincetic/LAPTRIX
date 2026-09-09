import { describe, it, expect } from "vitest";
import type { Sample } from "../../packages/shared/schema";
import {
  interpolate,
  PlaybackClock,
  formatTime,
} from "../../packages/telemetry";
const base: Sample = {
  distance: 0,
  time: 0,
  x: 0,
  y: 0,
  z: 0,
  speed: 10,
  rpm: 4000,
  gear: 1,
  throttle: 1,
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
const samples = [
  base,
  {
    ...base,
    distance: 100,
    time: 10,
    x: 100,
    y: 20,
    speed: 20,
    rpm: 8000,
    gear: 2,
    cornerId: 1,
  },
  { ...base, distance: 200, time: 20, x: 0, y: 0 },
];
describe("authoritative telemetry interpolation", () => {
  it("interpolates continuous values while keeping discrete fields stepped", () => {
    const s = interpolate(samples, 5);
    expect(s.x).toBe(50);
    expect(s.y).toBe(10);
    expect(s.rpm).toBe(6000);
    expect(s.gear).toBe(1);
    expect(s.cornerId).toBe(0);
    expect(interpolate(samples, 10).gear).toBe(2);
  });
  it("maps time and distance to identical telemetry samples", () => {
    expect(interpolate(samples, 5)).toEqual(
      interpolate(samples, 50, "distance"),
    );
  });
  it("clamps to boundaries without mutating the source", () => {
    expect(interpolate(samples, -10)).toEqual(base);
    expect(interpolate(samples, 100)).toEqual(samples[2]);
    const s = interpolate(samples, -1);
    s.gear = 8;
    expect(base.gear).toBe(1);
  });
  it("rejects empty and nonfinite cursor values", () => {
    expect(() => interpolate([], 3)).toThrow();
    expect(() => interpolate(samples, NaN)).toThrow();
  });
  it("formats minute rollover correctly", () => {
    expect(formatTime(59.9996)).toBe("1:00.000");
    expect(formatTime(71.544)).toBe("1:11.544");
  });
});
describe("playback clock", () => {
  it("rejects invalid clock inputs without corrupting its snapshot", () => {
    const clock = new PlaybackClock(),
      before = clock.getSnapshot();
    expect(() => clock.configure(0)).toThrow();
    expect(() => clock.seek(NaN)).toThrow();
    expect(() => clock.rate(-1)).toThrow();
    expect(() => clock.advance(Infinity)).toThrow();
    expect(clock.getSnapshot()).toEqual(before);
  });
  it("shares play, pause, seek, speed and looping timing", () => {
    const clock = new PlaybackClock();
    clock.configure(20);
    clock.play(true);
    clock.advance(2);
    expect(clock.getSnapshot().time).toBe(2);
    clock.rate(2);
    clock.advance(3);
    expect(clock.getSnapshot().time).toBe(8);
    clock.play(false);
    clock.advance(5);
    expect(clock.getSnapshot().time).toBe(8);
    clock.seek(19);
    clock.play(true);
    clock.advance(1);
    expect(clock.getSnapshot().time).toBe(1);
    clock.loop(false);
    clock.advance(20);
    expect(clock.getSnapshot().time).toBe(20);
    expect(clock.getSnapshot().playing).toBe(false);
    clock.play(true);
    expect(clock.getSnapshot().time).toBe(0);
  });
  it("notifies listeners and resets the clock when a new lap arrives", () => {
    const clock = new PlaybackClock();
    let count = 0;
    const unsubscribe = clock.subscribe(() => count++);
    clock.seek(1);
    clock.configure(30);
    expect(count).toBe(2);
    expect(clock.getSnapshot().time).toBe(0);
    unsubscribe();
    clock.play(true);
    expect(count).toBe(2);
  });
});
