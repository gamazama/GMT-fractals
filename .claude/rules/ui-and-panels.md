---
paths:
  - "components/**"
  - "engine/PanelManifest.ts"
  - "**/panels.ts"
---

# Shared UI primitives + the panel manifest

Read first: JSDoc on `components/AutoFeaturePanel.tsx` and `engine/PanelManifest.ts`,
plus [`docs/policy/shared-ui-coupling-rules.md`](../../docs/policy/shared-ui-coupling-rules.md).

Decisions: **ADR-0007** (single panel manifest, not per-feature dock declarations),
ADR-0021 (plugin slot registries), ADR-0057 (topbar Camera menu opts out with
`menu: null`), ADR-0013 (`componentRegistry` `ComponentType<any>` widening),
**ADR-0014** (store-context vs direct store in `components/`), ADR-0032
(StateLibrary primitives are fully controlled).

For the floating-surface primitives under `components/ui/**` — `<Layer>`, Modal,
FloatingPanel, AnchoredMenu, the tier table — see
[`layers-zindex.md`](./layers-zindex.md) and ADR-0060/0081/0082.

## Invariants

- **Purity is scoped to `components/ui/**`**: zero store imports, enforced by the
  `PreToolUse` hook in `.claude/hooks/guard.mjs`; capabilities arrive via props or opt-in
  React context (`components/contexts/StoreCallbacksContext.tsx`). The rest of
  `components/` is store-aware by design (ADR-0014) — don't "fix" a store-aware panel.
- **Panels are declarative compositions** of features, widgets, sections, separators and
  collapsibles. Layout lives in the manifest. Don't `component: 'panel-X'` around a
  manifest gap: extend the manifest (a new item type or prop) in a way another app could use.
- **Never create a parallel component.** If a widget nearly does what you need, improve the
  master. Widgets ported verbatim from GMT (FormulaSelect, AudioSpectrum, FlowEditor,
  EnginePanel) keep their internals.
- **Every lazily-imported surface goes through `lazyWithFallback`**
  (`components/ui/lazyWithFallback.tsx`), never bare `React.lazy`: a failed chunk fetch
  otherwise throws into the root `AppErrorBoundary` and takes the whole app down.

## The colour picker is mounted by three hosts

`components/EmbeddedColorPicker.tsx` is THE picker (every colour DDFS param, the gradient
editor's stop inspector, the drawing and lighting panels). See
[ADR-0116](../../docs/adr/0116-the-colour-picker-on-a-phone-and-without-a-pipette.md).

- It is **container-responsive, not viewport-responsive**: a ResizeObserver on its own root,
  three layout branches (`cols` / `rows` / `stack`), plus a `narrow` re-flow of the `soft`
  dialect. After adding a control to the soft dialect, `npm run shot:ge-picker` at 390 px must
  print nothing laid out past the picker's right edge.
- **Whether a narrow mount starts FOLDED is the host's declaration (`roomy`), not a
  measurement.** `AdvancedGradientEditor` passes it through as `pickerRoomy`.
- Its pipette is `window.EyeDropper` where that exists and a page-scoped pick
  (`components/gradient/pagePick.ts`) elsewhere. That hit-test honours `pointer-events`
  itself: this app's most pickable canvases are `pointer-events-none`.

## A slider's number field is the precision control

Every slider (`ScalarInput`) carries two drags: the track, and the number beside it. The
number moves a fixed band SLOWER than the track — at least `minSlowdown`×, at most
`maxSlowdown`× (GMT 2–10×, GE v2 2–2.5× via `NumberDragFeelProvider`) — and snaps to the
track's step. Grep `numberDragRate`. The rate needs the track's WIDTH, so only variants that
draw a track pass `getTrackPx`; vector cells and bare numbers keep the step rate on purpose.
A numeric control with its own drag code (Knob, DualAxisPad, native range inputs) does not
get this rule.

## The input skin reaches the panel itself

`AutoFeaturePanel` reads `useInputSkin()` (grep `softSkin`) for the chrome around a PARENT
param's children; under `soft` the raised ground, the bracket rail and the scrim go.
`InlineToggleButtons` reads the same context. The skin is a look on the master
(`components/inputs/skin.tsx`); app-gmt provides none and is unchanged.

## Guards

```
npm run typecheck
npm run smoke:boot        # renders the whole panel tree headlessly; fails on pageerrors
npm run smoke:interact    # DDFS state flow end-to-end (demo feature)
npm run smoke:ge-pagepick # the picker's pipette with `EyeDropper` deleted, and with it present
npm run test:number-drag-rate # the number-vs-track band (node, sub-second)
npm run smoke:lazy-fallback   # a lazy panel whose chunk can't be fetched shows a notice, app keeps running
```

- `smoke:lazy-fallback` covers the gradient editor's site only; the other five lazy sites
  share the helper but aren't exercised.
- `test:number-drag-rate` reaches `components/inputs/numberDragRate.ts` only. The wiring
  (`ScalarInput` handing the track width to `useDragValue`; the soft skin's stacked row) is
  unguarded.
- `smoke:ge-pagepick` is the only guard on `components/gradient/pagePick.ts` and the
  pipette branch; `BROWSER=firefox` runs it in firefox. It wants `npm run dev` on 3400.
- `smoke:ui-primitives` exercises `clampToViewport` only; its home is
  [`layers-zindex.md`](./layers-zindex.md). `smoke:screenshot` asserts nothing.
- What reaches a manifest-composed panel: `smoke:engine-demo` asserts two DDFS param labels
  and a `ScalarInput` thumb; `smoke:engine-demo-modulation` asserts `applyPanelManifest`
  swept an entry into `store.panels`. Neither asserts manifest structure and both run on
  the demo entry, so changes to `AutoFeaturePanel` / `PanelManifest` item handling need a
  manual pass.

(Names written without the `npm run` prefix are deliberate: `check:rule-guards` reads every
prefixed name in a rule as a citation.)
