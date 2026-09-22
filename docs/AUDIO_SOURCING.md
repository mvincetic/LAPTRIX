# Formula audio sourcing — 2026-09-22

The current Web Audio engine in `packages/audio-engine/index.ts` uses sawtooth,
triangle and sine oscillators with deterministic noise. It follows RPM, throttle,
speed and gear telemetry, but contains no recorded engine. The user's description
of a robotic timbre is consistent with this limited synthesis. The driving-HUD
milestone does not claim to replace or improve that audio.

## Sources checked

- [Pole Position Production: F1 Williams FW29 2007](https://pole.se/product/f1-williams-fw29-2007/)
  is listed at US$449. It provides onboard/exterior recordings, steady revs,
  acceleration, ramps and shifts, including cockpit, intake and exhaust channels.
  This is an older V8 library, not evidence of a modern 2026 turbo-V6 recording.
  The [provider FAQ](https://pole.se/faqs/) says its collections generally do not
  supply ready-made fixed-RPM loops. Raw recording quality and a game-ready loop
  bank are separate requirements.
- [Pole's field-recording service](https://pole.se/field-recording/) offers vehicle
  sourcing, recording and post-production for games. Request an existing modern
  turbo-V6 onboard collection or a quote for a commissioned set. Availability and
  price for that specific target are not established by the public pages checked.
- [SONNISS GameAudioGDC](https://sonniss.com/gameaudiogdc/) offers free commercial
  media-production samples from its catalogue. This is a possible audition pool,
  not a verified complete modern Formula engine set. Check individual recording
  provenance and the [bundle licence](https://sonniss.com/gdc-bundle-license/).

The [Pole EULA](https://pole.se/eula/) permits synchronized game/interactive use
but restricts sharing unsynchronized files and unlicensed access. Before purchasing,
confirm coverage for LAPTRIX's browser asset delivery and development workflow.
Keep purchased masters out of the repository; retain licence/receipt and source
records separately and deliver only the agreed runtime derivative. No purchases,
downloads of engine recordings or messages to suppliers have been made.

## Proposed acquisition and integration

Prefer a real turbo-V6 recording set for the modern Formula presentation. Audition
dry cockpit/exhaust channels, stable RPM bands across the working range, acceleration
and overrun under load, throttle release, shifts and turbo detail. Exclude commentary,
music and other cars. Ask for RPM annotations, clean loop/edit points and permission
for runtime resampling, crossfading and web distribution. A short pass-by alone does
not support a convincing lap-length onboard engine.

After choosing an appropriately licensed source, build a bounded, documented bank
of on/off-throttle RPM loops, with short shift/transient layers and separate camera
mixes. Drive it from the existing telemetry and playback state. Validate crossfades,
seeks, lap wrap, pause/mute, activation failure and memory cleanup. Compare actual
recordings from the same lap/camera before and after; do not equate importing a WAV
with achieving realistic interactive sound. Do not obtain assets by extracting
commercial game files or copying broadcast/YouTube audio.
