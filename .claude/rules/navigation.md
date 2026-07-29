---
paths:
  - "engine-gmt/navigation/**"
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
```

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
