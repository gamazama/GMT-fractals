# ADR-0132: Modulating a display-pass parameter does not restart accumulation

- **Status:** Accepted
- **Date:** 2026-10-04
- **Relates to:** ADR-0078 (`noAccumReset` / `preserveOnApply` — what the flag already meant for a
  slider drag), ADR-0107 (the four modulation sinks), ADR-0109 (one modulation dispatcher), ADR-0061
  (`isSceneAnimating` as the autonomous-animation axis), ADR-0131 (found with the same tooling).
  Code: `engine/features/modulation/targetRouting.ts` (grep `routingInvalidatesAccumulation`,
  `targetInvalidatesAccumulation`), `engine/animation/AnimationSystem.tsx` (grep `resetExempt`),
  `engine-gmt/renderer/renderInteractionState.ts` (grep `hasLiveModulationSource`),
  `engine-gmt/renderer/GmtRendererTickDriver.tsx` (grep `hasActiveModulation`).
  Guards: `npm run test:modulation-coverage` (blocks [9] and [10]), `npm run test:interaction:wiring`.

## Context

22 of the 443 offered modulation targets are applied in the display pass: bloom, chromatic
aberration, colour grading, droste. They are declared `noAccumReset`, and dragging one of their
sliders has never restarted accumulation — the fractal stays converged and only the post-process
changes.

Modulating one did restart it, twice over:

- `AnimationSystem.tick` emitted one blanket `RESET_ACCUM` whenever any offset moved by more than an
  epsilon. The uniform write itself carried `noAccumReset`; the blanket reset undid it.
- `GmtRendererTickDriver` reported `isSceneAnimating` for any enabled LFO or audio rule, whatever it
  targeted. That flag turns adaptive resolution on and progressive tiling off.

So an LFO or an audio rule on bloom intensity re-traced the whole fractal on every frame to animate a
number the trace never reads. Measured at 2168×1384 on an RTX 2070: 24.7 ms of GPU per frame, 140 W,
and the image held at one sample — noisy, never converging — for as long as the music played.

## Decision

One function answers "does moving this target change the traced image": `routingInvalidatesAccumulation`
in `targetRouting.ts`. Both callers ask it.

- The tick resets accumulation only for moved offsets whose target invalidates.
- The scene counts as animating only if a live source's target invalidates
  (`hasLiveModulationSource(state, invalidates)`); the unfiltered form is unchanged.

**Only a uniform-sink scalar or vec axis declared `noAccumReset` is exempt.** Everything else
invalidates, including two sinks that look harmless:

- `display-only` / `none` — a uniformless engine-fork app (fluid-toy) reads modulated values straight
  off the store and may key its own accumulation on the reset. Exempting them here would change that
  app from the outside.
- `engine-mods` and `render-state` — camera, rotation, lights, optics move the traced image whatever
  the param config says.

The render loop keeps ticking for a display-only modulation without a dedicated term: every modulated
`UNIFORM` emit already re-arms the convergence-stop wake.

## Consequences

- With bloom alone modulated the image keeps converging, and once it has, a frame costs 2–4 ms at
  2168×1384 (0.5–1.3 ms at 888×664) and the card draws 41–50 W instead of 140.
- A formula parameter, a camera, a light, or a mix that includes one behaves exactly as before.
- **Flagging a param `noAccumReset` now also says it may be modulated without a re-trace.** That was
  already the flag's meaning for a drag; it is now load-bearing for modulation too. A trace-affecting
  uniform wrongly flagged would show a stale image under modulation where before it showed one under
  a drag.
- With a filter, an LFO-sourced rule needs its own clause in the predicate: the LFO feeding it may
  target a display-pass param while the rule drives a formula param. Pinned in
  `test:interaction:wiring`.
- The guards run the classifier on synthetic routings as well as on the catalogue. No offered
  engine-mods, render-state or display-only target is flagged `noAccumReset` today, so the catalogue
  alone could not tell this rule from "exempt anything flagged" — that looser rule passed every
  catalogue assertion until the synthetic ones were added.
- Timeline PLAYBACK of a keyframed display-pass param is unchanged: `isPlaying` still marks the scene
  as animating. The same reasoning would apply there and was not taken.
