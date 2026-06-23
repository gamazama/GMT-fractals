# ADR-0081: Click-to-front stacking for floating panels + a `takeover` Z tier under the panel band

**Date:** 2026-06-23
**Status:** Accepted
**Scope:** `components/ui/zIndex.ts`, `components/ui/panelStack.ts` (new), `components/ui/FloatingPanel.tsx`, `components/DraggableWindow.tsx`, `app-gmt/PalettePickerOverlay.tsx`, `app-gmt/AppGmt.tsx`
**Related:** ADR-0060 (floating-surface primitives + the `Z` scale)

> **Update 2026-06-23 (ADR-0082; decision unchanged):** `components/ui/panelStack.ts` is now a thin wrapper over the generalized `components/ui/layerStack.ts` (one ephemeral click-to-front order *per tier*; the panel band is the `'panel'` instance). All invariants here — session-local, never persisted, participating-only, the reserved 100–199 range — hold verbatim. The `Z.panel` references resolve through the new `Z` Proxy unchanged.

## Context

Every floating panel rendered at a fixed z for its whole lifetime: managed/standalone `DraggableWindow`s sat at `Z.panel` (100). With several windows open (Favients shelf, Audio/Drawing/ShaderCompiler feature windows, detached light panels, Settings), a panel could never be brought forward by clicking it — stacking was decided once, at mount, by render order. There was no `bringToFront`/focus mechanism anywhere in the tree.

A symptom of the same gap: the app-gmt Palette Picker overlay was a `Modal` at `Z.modal` (1000) — *above* the panel band by design — so the only way to keep the Favients shelf reachable for drag-onto while browsing was to shove that one panel to `Z.modal + 50` (1050) inline in `AppGmt`. A fork-shaped escape hatch that fixed one panel and would have fought any general raise system.

Alternatives considered:

- **Store-backed order on `PanelState`.** Only *managed* panels live in the panel registry; standalone `FloatingPanel`s (LoadFilter, Settings, RenderDialog, light panels) don't, so it wouldn't cover them — and it forces an edit to the duplicated `PanelState` in two `types/store.ts` trees. Rejected for the lighter, fully-covering option below.
- **Persist last-focused order across reloads.** "Which window did I click last" is correctly ephemeral; persisting it adds storage + migration for no user benefit. Rejected.
- **Promote panels above the modal tier so they clear the Palette overlay.** Demote the overlay instead (it's a browse surface, not a blocker) — see the new tier.

## Decision

**1. An ephemeral click-to-front stack** — `components/ui/panelStack.ts`, a tiny standalone zustand store holding one bottom→top order list keyed by opaque id. `FloatingPanel` joins it when it is a coordinate-mode window (`effectivePos` set) sitting at the **default** panel tier (`z === Z.panel`): it registers on mount (coming to the top), raises on any pointer-press inside it (capture phase, so a child's `stopPropagation` on the drag handle / resize grip can't swallow it), and renders at `Z.panel + rank`. With a handful of floaters this stays inside the `panel`→`popover` band (never reaches 200), so popovers/modals/overlays keep their tiers. Session-local; not persisted.

Panels with an **explicit elevated `z`** (SettingsPanel at `Z.modal`, RenderDialog at `600`) and **anchored** panels (no position, e.g. LoadFilterPanel) do **not** participate — they keep their fixed tier untouched. This is the participation gate's whole job: unify the common panel band without demoting deliberately-elevated tool/dialog windows.

**2. A new `Z.takeover` tier (90), below `Z.panel`** — for full-screen browse/scrim surfaces that must cover the dock + base chrome but sit *under* floating panels. The Palette Picker overlay moves from `Z.modal` to `Z.takeover`; the Favients `Z.modal + 50` special-case in `AppGmt` is deleted. Now *every* floating panel floats over the overlay via the normal stack — Favients included, with zero special-casing.

`DraggableWindow`'s old "standalone sits at `Z.panel + 100`" offset is dropped (superseded by last-clicked-wins); standalone windows now share the `Z.panel` base so they participate alongside managed ones.

## Consequences

- **New floating windows get click-to-front for free** if they're coordinate-mode at `Z.panel` (the `DraggableWindow` default). To opt a window *out* (keep it pinned at a tier), give it an explicit non-default `z` — that's also how SettingsPanel/RenderDialog stay elevated.
- **The Palette overlay now darkens the dock** (its `bg-black/85` scrim sits at `Z.takeover`, above the dock) while floating panels punch through on top — the intended drag-onto-shelf interaction. Visual nuance to be aware of: it's still built on `Modal` but is no longer "blocking" in the strict sense.
- **No store/type changes, no persistence.** Order resets on reload to mount order. The decision lives in `panelStack.ts` + `FloatingPanel.tsx` JSDoc; this ADR is the rationale.
- **`Z.takeover` is reusable** — any app's "full-width-but-under-panels" surface can adopt it instead of borrowing the modal tier.
- **Detached CenterHUD light panels participate** (coordinate-mode at `Z.panel`, even though `draggable={false}` — the raise is independent of FloatingPanel's header drag), so they finally click-to-front relative to each other.
- **Known limitation (deferred to the app-wide z pass):** topbar dropdowns render *under* floating panels and cannot be fixed by a z-value alone — the topbar is inside `MobileViewportShell` (`position: fixed` → a stacking context), while panels are portalled to `document.body`, so any shell-internal element is trapped below body-level portals. Putting topbar menus above panels requires portalling them. See `plans/z-index-app-audit.md`.
