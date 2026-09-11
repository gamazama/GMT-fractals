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

- **Purity is scoped to the `components/ui/` subtree — not to all of `components/`.**
  `components/ui/**` is the pure primitive layer: zero store imports, enforced by
  the `PreToolUse` hook in `.claude/hooks/guard.mjs`. Capabilities arrive via
  props or opt-in React context (`components/contexts/StoreCallbacksContext.tsx`).
  The **rest** of `components/` is store-aware by design — roughly 29 of the 68
  top-level `components/*.tsx` read `useEngineStore` directly, and that is not a
  violation. ADR-0014 records this explicitly: the blanket "primitives must not
  import the store" line in `docs/history/engine/05_Shared_UI.md` is *aspirational,
  not enforced*, and the migration to `useStoreCallbacks()` is incremental. Don't
  "fix" a store-aware composed panel; do keep new `components/ui/**` code pure.
- **Panels are declarative compositions** of features, widgets, sections,
  separators and collapsibles. Layout decisions live in the manifest, not in
  hand-written panel components.

## The anti-pattern that matters

**Don't `component: 'panel-X'` your way out of a manifest gap.** That's how five
escape hatches become five forks. If a panel can't be expressed via `items`,
extend the manifest — a new item type, or a new prop on an existing one — so that
it can, in a way another app could also use.

## Never create a parallel component

If a widget nearly does what you need, find the master component and improve it.
Do not add a second near-identical one alongside it.

Self-contained widgets ported from GMT (FormulaSelect, AudioSpectrum, FlowEditor,
EnginePanel) were ported **verbatim** with path rewrites and registered in
`componentRegistry`. Don't rewrite their internals.

## The colour picker is mounted by three hosts, and answers to all of them

`components/EmbeddedColorPicker.tsx` is THE picker (every colour DDFS param, the gradient
editor's stop inspector, the drawing and lighting panels). Two things about it are easy to
break from the outside, both recorded in
[ADR-0116](../../docs/adr/0116-the-colour-picker-on-a-phone-and-without-a-pipette.md):

- It is **container-responsive, not viewport-responsive** — a ResizeObserver on its own root,
  three layout branches (`cols` / `rows` / `stack`), plus a `narrow` re-flow of the `soft`
  dialect for phones. Adding a control to the soft dialect means checking it at 390 px:
  `npm run shot:ge-picker` prints anything laid out past the picker's own right edge, and
  that list must stay empty. Anything past it is unreachable, not merely ugly.
- **Whether a narrow mount starts FOLDED is the host's declaration (`roomy`), not a
  measurement.** The picker sizes to its content and its host sizes to the picker, so asked
  from the inside a folded picker always reports a cramped box. `AdvancedGradientEditor`
  passes it through as `pickerRoomy`; only GE v2's hero sets it today.

Its pipette is `window.EyeDropper` where that exists and a page-scoped pick
(`components/gradient/pagePick.ts`) where it does not — Firefox, Safari, every phone. That
hit-test deliberately does not trust `elementsFromPoint` alone: it honours `pointer-events`,
and this app's most pickable canvases are `pointer-events-none`.

## Guards

```
npm run typecheck
npm run smoke:boot        # renders the whole panel tree headlessly; fails on pageerrors
npm run smoke:interact    # DDFS state flow end-to-end (demo feature)
npm run smoke:ge-pagepick # the picker's pipette with `EyeDropper` deleted, and with it present
```

`smoke:ge-pagepick` is the only guard on `components/gradient/pagePick.ts` and on the picker's
pipette branch; `BROWSER=firefox` runs the same four steps in real firefox. Like every `ge-*`
smoke it wants `npm run dev` on 3400.

**Known coverage gap — read before trusting a green run.** `smoke:ui-primitives`
is often cited here. It is a genuine guard, not a dead one, but it is narrow: it
exercises `clampToViewport` (`components/ui/viewportClamp.ts`) and nothing else,
renders no React component, and reaches **1 of the 129 files this rule scopes** —
measured, not estimated (`check:rule-guards --verbose` prints the ratio). Its home
is [`layers-zindex.md`](./layers-zindex.md), which scopes `components/ui/**`, and
the citation was moved there on 2026-07-29.

**`smoke:screenshot` is not a test of any of this** — deliberately written here
without the `npm run` prefix, because it must not become a citation. It launches
chromium at `localhost:3400/` (the GMT app; `/` and `/app-gmt.html` are the same
entry), waits a flat 2500 ms, writes `debug/scratch/engine-boot.png` and closes.
That is the entire program: no assertion, no `pageerror` handler, no console
handler, no comparison against a stored baseline. Measured 2026-08-02 — pointed
at `about:blank` it writes a 5.7 KB white PNG and exits 0; the only thing that
reds it is failing to reach a page at all. It is a capture for a human to look
at, and the PNG is gitignored (`debug/.gitignore` → `scratch/`), so it cannot
dirty the tree. `docs/history/engine/05_Shared_UI.md` says under "Testing
primitives" that primitives are *snapshot-tested* via that harness "when they
render in the demo feature". That is wrong twice: there is no snapshot
comparison anywhere in it, and it boots the GMT root entry, not the demo. The
history tree is append-only, so the correction lives here.

What *does* reach a manifest-composed panel, and exactly how far it goes:
`smoke:engine-demo` mounts the demo dock and asserts two DDFS param labels plus at
least one `ScalarInput` thumb actually rendered; `smoke:engine-demo-modulation`
asserts `applyPanelManifest` swept an entry into `store.panels`. Both of those
assertions were added by the 2026-07-29 guard sweep — before it, they were logged
and never checked. Neither asserts manifest **structure**: item order, sections,
separators, collapsibles and `component:` widget items are all unchecked, and both
run against the demo entry, not app-gmt's manifest. `smoke:boot` only proves the
tree renders without throwing. So changes to `AutoFeaturePanel` / `PanelManifest`
item handling still need a manual pass.

(Guard names in this paragraph are deliberately written without the `npm run`
prefix: `check:rule-guards` parses that prefix out of the whole rule body, so
prefixing a name here would mint a citation from a sentence explaining a gap.)
