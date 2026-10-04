# ADR-0131: Nothing on the page repaints every frame — the render worker shares a thread with the window's presents

- **Status:** Accepted
- **Date:** 2026-10-04
- **Relates to:** ADR-0062 (the frames-in-flight gate and the low-latency present this starves),
  ADR-0061 (interaction session; `isSceneAnimating`), ADR-0110 (audio analysis in a worklet — the
  subsystem this was first blamed on), ADR-0107 (live-modulation transport; the 20 Hz publish).
  Code: `tailwind.config.js` (grep `pulse-live`), `engine/components/gizmo/SinglePositionGizmo.tsx`
  (grep `writtenRef`), `components/inputs/ScalarInput.tsx` (grep `Live-modulation marker`),
  `engine-gmt/features/lighting/components/LightControls.tsx` (grep `animation-iteration-count`),
  `engine-gmt/engine/worker/framePerf.ts`, `engine-gmt/engine/worker/handleRenderTick.ts`
  (grep `gateRetryDelayMs`), `debug/bench-audio.mts`, `debug/smoke-idle-damage.mts`.
  Guards: `npm run smoke:idle-damage`; measurement: `npm run bench:audio`.

## Context

For two months GMT carried an open report: with audio modulation on, the fractal rendered at about
30 fps while the window was focused and 60 when it was not. Three rounds of mitigation on the audio
side (a slower store publish, a CPU-raster spectrum canvas, a quieter status poll) helped and did not
close it. The owner's verdict was that reasoning from the source had run out and only measurement
would settle it.

Measurement did, and the answer was not in the audio code. With a harness that drives real Chrome on
the real GPU (`bench:audio`) and reads the render worker from the inside (`framePerf.ts`):

- An LFO and an audio rule on the same parameter cost exactly the same: 5.8 ms of GPU per frame,
  60 fps (Mandelbulb, 888×664, RTX 2070). Analysis is ~0.1 ms a hop on its own thread.
- At the first window focus change, two runs in three fell to **14 fps and stayed there** — with the
  frame still costing 5.8 ms. The GPU was mostly idle.
- A Chrome trace of that state shows the GPU process's main thread 98 % busy, nearly all of it inside
  `DXGISwapChainImageBacking::Present`: about 15 ms of every 16.7 ms, blocked presenting the window.

That thread is the one that decodes every WebGL context's commands, including the render worker's.
The worker waits for a fence before it starts the next frame (ADR-0062); with the thread it depends
on available for under 2 ms per vsync, the fence took four vsyncs to come back.

The presents were coming from the page. Something in the DOM was changing on every frame:

| Source | When it runs | Rate |
|---|---|---|
| The slider's "modulated" dot — a smooth infinite `animate-pulse` | only while something is modulated | 60 presents/s |
| The slider's live marker — a 75 ms transition retargeted every 50 ms, so it never finished | only while something is modulated | 60/s |
| The light gizmo — `setAttribute` on six SVG lines every overlay tick, moved or not | whenever a point light's gizmo is up | 129 writes/s per line |
| Each point light's top-bar orb — an infinite `animate-ping` | whenever a point light exists | 60/s |
| The first-run "Press Tab" hint — an infinite `animate-pulse` | until a new user presses Tab twice | 60/s |

The first two only exist while something is modulated, which is why the slowdown arrived with audio.
The last three needed no audio at all, which is why it also depended on what happened to be on
screen. And a fully converged scene, with the render loop correctly stopped, was still presenting 60
times a second and holding the GPU at 36 W.

A stepped animation is different in kind, not degree: the compositor only presents when the value
changes. Measured, the same pulse with `steps(4, jump-none)` presents 3 times a second.

## Decision

**Nothing visible in app-gmt may change on every frame except the fractal canvas itself.**
Concretely:

1. **A state indicator that can stay on screen uses `animate-pulse-live`** — the stock pulse keyframes,
   stepped. Modulated, modular, playing, recording, pending, render progress, the update pill, the
   Tab hint. Plain `animate-pulse` remains for loaders that are gone within seconds. `animate-ping` /
   `animate-bounce` carry an iteration count unless the element is itself transient.
2. **An imperative `update()` driven from a tick writes on change.** `setAttribute` to the value
   already there still dirties SVG. `SinglePositionGizmo` keeps the last value written per node.
3. **No CSS transition on a value that is re-set faster than the transition lasts.** The slider's
   live marker steps at the publish rate instead of gliding.
4. **Performance claims about app-gmt are measured with `bench:audio`, and lead with Present
   blocking (`presMs`) and delivered frames.** The fps counter cannot distinguish a slow frame from a
   starved one; a GPU timer query cannot either, and under-reads when the card clocks down between
   frames.

The worker's frame probe (`framePerf.ts`) replaces a compile-time debug flag: it is switched on at
runtime (`proxy.setPerfProbe(true)`, or `?perf`), costs nothing while off, and reports GPU ms split
into trace and post, fence latency, gate skips, messages by type and the traced area.

Separately, and found with the same tools: the gate's retry timer is now paced from the measured
fence latency (one sleep to 80 % of it, then 1 ms polls) instead of a flat 4 ms, which was up to 4 ms
of idle GPU per frame on any scene that does not fit in a vsync.

## Consequences

- Through focus changes, 4 runs × 6 scenarios hold 60 fps where 2 runs in 3 used to collapse to 14.
  A converged scene presents 0 times a second and the GPU idles at 24 W.
- On GPU-bound scenes the same change is worth more than it looks: AmazingBox at 1528×1024 holds
  25 fps under modulation (was 14–20; the still image runs at 26). Gate pacing adds 5–10 % on scenes
  between one and two vsyncs per frame (MengerSponge 45 → 48–50 fps).
- **Three visible changes.** Persistent pulses step about three times a second instead of fading
  smoothly. Point-light orbs ping three times, then rest. The purple live marker moves in 20 Hz steps.
- `smoke:idle-damage` is a headless tripwire for the two causes found — a DOM node written every
  frame, a smooth infinite animation — in a still scene and a modulated one. It does not measure
  frame rate; only `bench:audio` on a real GPU does.
- **This is a rule about a browser internal, and it is Windows-shaped.** The blocking Present is
  Chrome's DXGI path. The wasted presents are real everywhere (battery, heat); the starvation was
  only measured on Windows.
- **Not closed by this ADR.** The bench reproduces a collapse that follows a focus *change*; the
  original report describes one that tracks focus *state*. The same mechanism is the likely reading,
  not a proven one, and the `@bug PRODUCTION:` on `connectSystemAudio` stays until the owner has
  confirmed it on their own profile.
- **Still exposed.** Any legitimate 60 Hz DOM motion could in principle bring the blocked state back.
  Timeline playback with the timeline open was measured and held 60. The structural fix — allow two
  frames in flight when the fence, not the GPU, is the limiter — trades a frame of latency and was
  deliberately not taken here.
