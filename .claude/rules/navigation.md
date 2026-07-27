---
paths:
  - "engine-gmt/navigation/**"
---

# Navigation + cursor-anchored gestures

Read first: the JSDoc header at `engine-gmt/navigation/Navigation.tsx:1-97`.

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

```
npm run test:interaction
npm run test:interaction:wiring
npm run test:interaction:coverage
npm run smoke:canvas-pan-zoom
npm run smoke:canvas-menu
npm run smoke:orbit
npm run smoke:bc-drag
```
