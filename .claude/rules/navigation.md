---
paths:
  - "engine-gmt/navigation/**"
  - "engine-gmt/engine/controllers/CameraController.ts"
---

# Navigation + cursor-anchored gestures

Read first: the JSDoc header at `engine-gmt/navigation/Navigation.tsx:1-115`.
Don't stop at the effect roster — the load-bearing `@invariant` (any per-frame
camera driver must open a camera InteractionSession or it renders as a single
tiled strip) is at lines 101-114, at the very end of that header.

Decisions: ADRs 0046-0047.

## Gesture wiring rules

These were learned the hard way — violating them produces gestures that work in
isolation and break in combination:

- **No ref-counting across gesture paths.** Two paths incrementing a shared counter
  will desync the moment one of them exits early.
- **Open on move, not on down.** A menu or handle that commits on pointerdown
  steals the drag.
- **Drag hooks are JSX-only.** Don't call them from imperative handlers.
- Drag flight uses a synchronous `dragstart` → `dragend` signal, not an async one.

## Don't reach for a flag

"Lock the camera while picking" as a Navigation flag is a local fix. Extending the
`selectMovementLock` predicate is the generic one. Reach for the predicate.

## Guards

`Navigation.tsx` mounts ONLY under `app-gmt.html` — `app-gmt/AppGmt.tsx` is its
sole importer (via `engine-gmt/navigation/index.ts`). A guard that boots any other
entry point cannot go red on a Navigation regression, however relevant its name.

```
npm run typecheck        # event constants, ref types, prop contracts
npm run smoke:engine-gmt # app-gmt.html boot — Navigation mounts, 0 pageerrors
npm run smoke:orbit      # app-gmt.html orbit drag → sceneOffset   (~25s; see below)
npm run test:nav-replay  # node, ~1.5 s: the fly integrator replays a scripted flight to the last bit
npm run smoke:fly        # app-gmt.html, Fly mode, the real handlers: keys, wheel, drag-look, the session (~60 s)
```

**The fly integrator moved to the engine on 2026-10-08** (ADR-0133):
`engine/plugins/navigation/FlyIntegrator.ts`, which hands each displacement to a sink.
`engine-gmt/engine/controllers/CameraController.ts` and `engine-gmt/navigation/modifiers.ts` are
re-exports; GMT's sink is `emitOffsetShift` in `Navigation.tsx`. **The input hook moved the same
day**: `engine/plugins/navigation/useNavigationInput.ts` is renderer-free and store-free, and
`useInputController.ts` is a wrapper that hands it the canvas, the lock, the timeline-hover
suppression, the HUD exclusions, the orthographic wheel and the ADR-0061 session, and runs its
`frame(delta)` from `useFrame`. `smoke:fly` is the guard for the sink AND the hook's wiring: W / S
along the view, A / D and Space / C at right angles, Shift, the wheel's speed, a text field, a
look drag, and the store's `interacting` flag while a key is held. Twelve lines, each seen red
(the record is in its header). It does not cover roll, Alt, the sticks, invert-Y or the
orthographic wheel.

`test:nav-replay` (`debug/test-nav-replay.mts`, golden `debug/nav-replay-golden.json`) is the only
guard on the fly integrator's numbers, `FlyIntegrator.update`: 17 scripted segments, every displacement
and the camera quaternion compared as float64 bit patterns. Falsified 2026-10-08 -
`DIST_INCREASE_LERP_RATE` 1.2 -> 1.3 reds six segments; 69 of 71 further single breaks red, the
other two bit-identical by construction; falsified again after the move (both default floors, the
ease rate, the sink's sign, `CAMERA_PRECISE_MULT` in the engine file). It reaches
`engine-gmt/navigation/**` through ONE file, the `modifiers.ts` re-export. It does not open `Navigation.tsx`,
`useInputController.ts` or `usePhysicsProbe.ts` - `smoke:fly` covers the first two; the distance
probe is still unguarded. Never re-record its
golden to make a refactor pass; `--update` needs an ADR that mentions `nav-replay`.

`smoke:orbit` is the only browser guard that drives a real camera gesture through
this file. **It is GREEN as of 2026-07-29 and was fixed that day** — it had been
permanently RED on unmodified `main` (last assertion: "accumulation did not
advance after orbit settled"), so it could not tell a regression from its own
baseline. Cause: headless Chromium falls back to SwiftShader, where one
1200×800 path-trace sample after the gesture settles costs **13.2–15.2 s**
measured over 6 clean trials, against an 8 s poll window. Only the window
changed (`ACCUM_TIMEOUT_MS`, grep it in `debug/smoke-orbit.mts`); no assertion
was touched. Falsified after the fix in both directions — gating out
`absorbOrbitPosition` in `Navigation.tsx` reds assertion 1, forcing `holdActive`
true in `FractalEngine.ts` reds assertion 2.

⚠ **What a green `smoke:orbit` does not prove: that anything was rendered.**
`accumulationCount` is assigned from the band scheduler (`band.sampleCount` in
`engine-gmt/engine/FractalEngine.ts`) outside `RenderPipeline.render()` whenever
progressive tiling is active, so a hard `return` at the top of `render()` leaves
this smoke exit 0 — and *faster* (0.0 s vs ~13 s), because a dead pipeline does
no work. `frameCount` and `convergenceValue` do not discriminate either. Treat
it as a guard on the gesture and the accumulation-hold release, not on pixels.

**Not guards for this file, despite once being listed here.**
`smoke:canvas-pan-zoom`, `smoke:canvas-menu` and `smoke:bc-drag` all boot
`fluid-toy.html`, which imports only `engine-gmt/support` + `engine-gmt/feedback`
and never `engine-gmt/navigation`. `test:interaction` and `test:interaction:wiring`
are node-only pure-logic tests over the InteractionSession machine.
`test:interaction:coverage` is a static source scan of slider / scrub / drawing
producers and contains zero references to Navigation — so the camera
`pokeInteraction` invariant in the file header is NOT mechanically covered by it.
`smoke:deep-zoom-orbit` is unrelated: "orbit" there is the deep-zoom *reference
orbit* (pure-CPU `computeReferenceOrbit`), not the camera.
