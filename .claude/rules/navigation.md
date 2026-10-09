---
paths:
  - "engine-gmt/navigation/**"
  - "engine-gmt/engine/controllers/CameraController.ts"
---

# Navigation + cursor-anchored gestures

Read first: the JSDoc header of `engine-gmt/navigation/Navigation.tsx`, to its end — the
load-bearing `@invariant` (any per-frame camera driver must open a camera
InteractionSession or it renders as a single tiled strip) closes it.

Decisions: ADRs 0046-0047.

## Gesture wiring rules

- **No ref-counting across gesture paths.** Two paths incrementing a shared counter
  desync the moment one of them exits early.
- **Open on move, not on down.** A menu or handle that commits on pointerdown steals the drag.
- **Drag hooks are JSX-only.** Don't call them from imperative handlers.
- Drag flight uses a synchronous `dragstart` → `dragend` signal, not an async one.
- "Lock the camera while picking" is not a Navigation flag: extend the
  `selectMovementLock` predicate.

## Guards

`Navigation.tsx` mounts ONLY under `app-gmt.html` (`app-gmt/AppGmt.tsx` is its sole
importer), so a guard that boots any other entry point cannot go red on it.

```
npm run typecheck        # event constants, ref types, prop contracts
npm run smoke:engine-gmt # app-gmt.html boot — Navigation mounts, 0 pageerrors
npm run smoke:orbit      # app-gmt.html orbit drag → sceneOffset   (~25s; see below)
npm run test:nav-replay  # node, ~1.5 s: the fly integrator replays a scripted flight to the last bit
npm run smoke:fly        # app-gmt.html, Fly mode, the real handlers: keys, wheel, drag-look, the session (~60 s)
```

- **The fly integrator and the input hook live in the engine** (ADR-0133):
  `engine/plugins/navigation/FlyIntegrator.ts` hands each displacement to a sink, and
  `useNavigationInput.ts` beside it is renderer-free and store-free.
  `engine-gmt/engine/controllers/CameraController.ts` and `engine-gmt/navigation/modifiers.ts`
  are re-exports; GMT's sink is `emitOffsetShift` in `Navigation.tsx`; `useInputController.ts`
  wraps the hook with the canvas, the lock, the HUD exclusions, the orthographic wheel and
  the ADR-0061 session.
- `smoke:fly` guards the sink and the hook's wiring. It does not cover roll, Alt, the
  sticks, invert-Y or the orthographic wheel.
- `test:nav-replay` (`debug/test-nav-replay.mts`, golden `debug/nav-replay-golden.json`) is
  the only guard on `FlyIntegrator.update`'s numbers, compared as float64 bit patterns. It
  reaches this tree through the `modifiers.ts` re-export alone; the distance probe
  (`usePhysicsProbe.ts`) is unguarded. Never re-record its golden to make a refactor pass;
  `--update` needs an ADR that mentions `nav-replay`.
- `smoke:orbit` is the only browser guard that drives a real camera gesture through this
  file. Headless SwiftShader needs 13–15 s for the path-trace sample after the gesture
  (grep `ACCUM_TIMEOUT_MS` in `debug/smoke-orbit.mts`). ⚠ A green run does not prove
  anything was rendered: `accumulationCount` comes from the band scheduler, outside
  `RenderPipeline.render()`. It guards the gesture and the accumulation-hold release.
- **Not guards for this file:** `smoke:canvas-pan-zoom`, `smoke:canvas-menu` and
  `smoke:bc-drag` boot `fluid-toy.html`; `test:interaction`, `test:interaction:wiring` and
  `test:interaction:coverage` are node tests of the InteractionSession machine and never
  reference Navigation; `smoke:deep-zoom-orbit` is the deep-zoom reference orbit.
