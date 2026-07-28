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
npm run smoke:orbit      # app-gmt.html orbit drag → sceneOffset   ⚠ see below
```

`smoke:orbit` is the only browser guard that drives a real camera gesture through
this file, and it is **currently RED on unmodified `main`** — its last assertion
("accumulation did not advance after orbit settled") fails. Its earlier assertions
still pass and remain informative (the drag does move `sceneOffset` by the expected
delta), so read its output rather than its exit code until that assertion is fixed.

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
