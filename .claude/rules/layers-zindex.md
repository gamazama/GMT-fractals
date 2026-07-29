---
paths:
  - "components/ui/**"
  - "hooks/useDismiss.ts"
---

# Floating surfaces, layers and z-index

Read first: JSDoc on `components/ui/*` (especially `components/ui/zIndex.ts`),
`hooks/useDismiss.ts`, and [`plans/z-index-system-design.md`](../../plans/z-index-system-design.md).

Decisions: ADR-0060, ADR-0081, **ADR-0082**.

## The rule

**A new floating surface is `<Layer tier=…>`. Never a raw `z-[N]`.**

This is portal-vs-trap, not a style preference: an in-flow element under the shell
cannot beat a body portal no matter what z-index you give it. `<Layer>` is the
un-trappable portal primitive.

Stacking comes from the domain-tagged tier table plus `z(tier, rank)` / the `Z`
proxy in `components/ui/zIndex.ts`. `layerStack` / `layerHost` host them.
Modal, FloatingPanel and AnchoredMenu are the built-on primitives; `useDismiss`
and `stopNavKeys` handle dismissal and key containment.

## UI surface conventions

- No backdrop-click-to-close on complex modals — it destroys work.
- Prefer dockable panels over modals for anything the user keeps open while working.

## Guards

```
npm run test:zindex
npm run check:zindex
npm run smoke:ui-primitives   # clampToViewport only — see the reach note below
```

`smoke:ui-primitives` moved here from `ui-and-panels.md` on 2026-07-29: it imports
`components/ui/viewportClamp.ts`, which this rule scopes and that one only reached
at 1 file in 129. Know its reach before trusting it — it covers **1 of the 11
modules in `components/ui/`**, the flip-then-clamp helper behind `AnchoredMenu`.
`Layer`, `Modal`, `FloatingPanel`, `AnchoredMenu` itself, `layerStack`,
`panelStack`, `layerHost` and `stopNavKeys` have no runtime guard at all — they are
React hooks and components, so covering them needs mount infrastructure this repo
does not have yet. `test:zindex` and `check:zindex` cover `zIndex.ts` and the raw
`z-[N]` ban respectively; everything else in the directory is `tsc` plus a visual
pass.