# ADR-0060: Floating-surface chrome consolidated onto `components/ui/` primitives + capture-phase Escape dismissal

**Date:** 2026-05-28
**Status:** Accepted
**Scope:** `components/ui/*`, `hooks/useDismiss.ts`, `app-gmt/main.tsx`, and the migrated surfaces (DraggableWindow, NewSceneModal, FeedbackPanel, AuthOverlay, AccountPanel, SubmitGalleryModal, BucketRenderResultModal, GradientContextMenu, GraphContextMenu, GlobalContextMenu, LoadFilterPanel)

## Context

Many UI surfaces hand-rolled their own "floating" chrome — a fixed/absolute box, a z-index, a portal, a viewport clamp, and outside-click / Escape dismissal. The patterns had drifted: some auto-closed, some didn't; z-indices ranged across ~15 ad-hoc values; each surface reimplemented the `setTimeout(0)`-deferred outside-click listener; Escape handling was inconsistent (some capture-phase, some none).

Dismissal in particular was fragile. Escape needs to (a) work even when a surface stops key propagation to keep typing off the fly-camera (`useInputController` listens on `window`), and (b) pick the right surface when several are open (nested modal + confirm).

Alternatives considered:

- **One primitive with a `mode` prop.** The audit found three genuinely distinct families (blocking modal, non-blocking positioned panel, trigger-anchored menu) — a single component would be prop-soup with heavy internal branching. Rejected.
- **A bubble-phase shared dismissal hook.** Couldn't beat surfaces that stop key propagation (the gradient menu's Escape died this way). Rejected.
- **Leave per-surface listeners, just share a hook.** Doesn't fix the z-index drift or the chrome duplication.

## Decision

A `components/ui/` primitive layer, consumed app-wide (app-gmt + sibling apps via `DraggableWindow`):

- **Three primitives** — `Modal` (blocking, backdrop, centred), `FloatingPanel` (non-blocking, positioned, opt-in drag/resize), `AnchoredMenu` (trigger-anchored, measure-then-flip-clamp). Each portals to `document.body`.
- **`useDismiss`** — the single dismissal hook. Outside-click is a deferred document `pointerdown` (capture). **Escape routes through the shortcut registry**: each open surface pushes its own scope, so the topmost wins and consumes the key (no double-fire across nested dialogs).
- **`installShortcuts({ capture: true })`** in `app-gmt/main.tsx` — the registry now dispatches in **capture phase** so Escape-dismissal fires before content handlers that stop propagation. The input-focus guard still protects typing.
- **`stopNavKeys`** — shared spread handler that stops nav keys reaching the fly-controller; `{ allowEscape: true }` lets Escape bubble to the registry. Replaces the per-surface `onKeyDown/onKeyUp/onKeyPress` guards.
- **`Z` scale** + **`clampToViewport`** — single stacking source; pure flip-clamp util (smoke-tested).
- Floating panels are **opt-in draggable**, not draggable-by-default.

Three surfaces are deliberately **left bespoke** because they don't fit the click/Escape + portalled model:

- **CenterHUD light popups** — hover-driven with anti-flicker bridge logic, anchored inline to a moving HUD element.
- **GlobalContextMenu** — recursive submenu layout (parent-relative positioning); only its *dismissal* was swapped to `useDismiss`, keeping its own flip-clamp + submenu rendering. A future `AnchoredMenu` with submenu support could finish this.
- **SubmitGalleryModal zoom overlay** — a click-anywhere full-bleed lightbox, not a centred card.

## Consequences

- **New floating surfaces build on the primitives** — pick `Modal`/`FloatingPanel`/`AnchoredMenu`, a `Z` tier, and (if it has inputs) spread `stopNavKeys`. Don't hand-roll portals/listeners/z-literals. The primitives' top-of-file JSDoc is the contract; this ADR is the rationale.
- **Shortcuts now dispatch in capture phase globally.** Anyone adding a shortcut should know it fires before content; the input-guard still gates typing. This was the enabling change for reliable Escape-dismissal.
- **Escape participates in the scope/priority model** (ADR-0022/0023 registry) — topmost open surface wins; nested confirm dismisses innermost-first.
- **z-index is single-sourced** via the `Z` scale; the auth/gallery ladder added `overlayResult`/`overlayTop` tiers (values preserved from the originals).
- **Two latent bugs fixed in passing:** floating panels now honour the panel manifest's `showIf` (they used to persist when their feature was disabled, unlike the dock); and modals' Escape-from-a-focused-field works (key-stops let Escape through).
- **The bespoke exceptions are documented here** so a future pass doesn't "consolidate" them by force and regress hover/submenu/lightbox behaviour.
