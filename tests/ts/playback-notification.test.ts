import { afterEach, expect, it, vi } from "vitest";
import { PlaybackClock } from "../../packages/telemetry";

afterEach(() => vi.unstubAllGlobals());

it("publishes a non-looping finish even inside the normal notification interval", () => {
  let frame: FrameRequestCallback = () => {};
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const clock = new PlaybackClock();
  clock.configure(1);
  clock.loop(false);
  clock.seek(0.95);
  clock.play(true);
  const updates: ReturnType<typeof clock.getSnapshot>[] = [];
  const unsubscribe = clock.subscribe(() => updates.push(clock.getSnapshot()));
  const stop = clock.start();
  try {
    frame(100);
    frame(120);
    frame(140);
    expect(updates.at(-1)).toMatchObject({ time: 0.99, playing: true });
    // The final frame is only 16 ms after the previous 30 Hz notification.
    frame(156);
    expect(clock.getSnapshot()).toMatchObject({ time: 1, playing: false });
    expect(updates.at(-1)).toMatchObject({ time: 1, playing: false });
    const count = updates.length;
    frame(176);
    frame(200);
    expect(updates).toHaveLength(count);
  } finally {
    stop();
    unsubscribe();
  }
});
