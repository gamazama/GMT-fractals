# Floating Panel Consolidation — handoff prompt

> Run this in a fresh session. It is self-contained — do the investigation
> yourself; the notes below are leads, not verified facts.

## Context

GMT (dev/ workspace — `h:\GMT\workspace-gmt\dev`, NOT stable/) is a React 18 +
TypeScript + Zustand fractal renderer. Several UIs hand-roll their own
"floating panel" chrome: a fixed/absolute positioned box, a z-index, sometimes
an outside-click/Escape dismissal, sometimes a backdrop, sometimes drag. The
patterns have drifted apart and behaviour is inconsistent (some auto-close,
some don't; some block the scene, some don't; none are draggable except one).

Before coding, read per CLAUDE.md: `docs/01_System_Architecture.md`,
`docs/08_File_Structure.md`, and skim `docs/07_Code_Health.md` for any existing
notes on UI/overlay duplication.

## Goal

Introduce ONE shared floating-panel primitive and migrate the hand-rolled
panels onto it, without changing each panel's intended UX. The win is
consistency (dismissal, stacking, portal target, mobile behaviour) and less
duplicated chrome — not a visual redesign.

## Investigate first (don't trust this list)

- `components/DraggableWindow.tsx` appears to already implement drag + window
  chrome — evaluate whether it's the right base to generalise, or whether a
  thinner `FloatingPanel` primitive should sit beneath it.
- Find every ad-hoc floating/overlay surface and catalogue their behaviours
  (auto-close? backdrop/modal? draggable? portal? z-index? Escape? mobile?).
  Known/likely candidates — verify and extend:
  - `components/LoadFilterPanel.tsx` (non-blocking, auto-close via outside-click
    + Escape, fixed top-right, NOT draggable)
  - `components/NewSceneModal.tsx` (blocking modal w/ backdrop, Esc-to-close,
    in-modal confirm dialog)
  - the gallery overlay, auth overlay, account panel, feedback overlay (mounted
    in `app-gmt/AppGmt.tsx`)
  - the engine-core `Menu` popover (`engine/plugins/Menu.tsx`) — already has a
    reusable outside-click/popover pattern; decide if it overlaps or stays
    separate (it's a topbar dropdown, arguably a different primitive).
  - any context menus / gradient menu / graph sidebar popouts
- Note the z-index ladder currently in use (NewSceneModal uses z-[1100], its
  confirm uses z-[1200], LoadFilterPanel z-[1100]) and design a single source
  of truth for layering.

## Decisions to surface (ask the user)

- One primitive with props (`mode: 'modal' | 'floating'`, `draggable?`,
  `dismissOnOutside?`, `anchor?`) vs. two primitives (`Modal` + `FloatingPanel`).
- Whether floating panels should become draggable by default (the user floated
  this idea for the Load panel — confirm scope).
- Portal target + a shared z-index scale.
- Mobile behaviour (some panels may need to dock or go full-screen on small
  viewports — see `hooks/useMobileLayout` and `MobileMenuHost` in Menu.tsx).

## Constraints

- Pure refactor: each migrated panel must keep its current dismissal + blocking
  behaviour unless the user opts into a change.
- Keep engine-core (`engine/plugins/*`) generic — a GMT-specific FloatingPanel
  belongs in GMT (`components/` or `engine-gmt/`), not in the engine-core
  plugin layer. If a primitive is genuinely app-agnostic it may live in
  engine-core, but don't pull GMT concerns down into it.
- The user does visual smoke testing — don't claim panels look/behave correctly
  after migration; state what changed and what needs a visual pass.
- `npx tsc --noEmit` must stay clean; migrate panels incrementally (one per
  commit) so regressions are bisectable.

## Suggested sequencing

1. Audit + catalogue (output a short table of panels × behaviours).
2. Agree the primitive's API with the user.
3. Build the primitive + tests.
4. Migrate panels one at a time, smoke-testing each.

---

## Outcome (2026-05-28) — DONE

Shipped (all staged, `tsc` + `npm run smoke:ui-primitives` clean). Rationale:
[`docs/adr/0060-floating-panel-primitives.md`](../docs/adr/0060-floating-panel-primitives.md);
usage contract is the top-of-file JSDoc on each `components/ui/` primitive.

**Decision: three primitives, not one.** The audit found three genuinely
distinct families, so `Modal` (blocking) / `FloatingPanel` (positioned,
non-blocking) / `AnchoredMenu` (trigger-anchored) — over `components/ui/` —
plus `useDismiss`, the `Z` scale, `clampToViewport`, and `stopNavKeys`.

**Key choices made along the way:**
- Floating panels are **opt-in draggable** (not draggable-by-default).
- Escape routes through the shortcut registry; to make that robust the registry
  was switched to **capture phase** (`app-gmt/main.tsx`). Topmost open surface wins.
- z-values fold onto the `Z` scale (value-preserving) — added `overlayResult`/`overlayTop` tiers for the auth/gallery ladder.

**Migrated:** DraggableWindow; NewSceneModal, FeedbackPanel (promoted to a
dockable manifest panel), AuthOverlay, AccountPanel, SubmitGalleryModal,
BucketRenderResultModal; GradientContextMenu, GraphContextMenu; GlobalContextMenu
(dismissal-only); LoadFilterPanel.

**Deferred / left bespoke (deliberate):**
- **CenterHUD light popups** — hover-driven, anchored to a moving HUD element, anti-flicker bridge logic. Doesn't fit the click/Escape + portalled model.
- **GlobalContextMenu** clamp + recursive submenu layout — `AnchoredMenu` is a flat single-anchor; only its dismissal was swapped. A future richer `AnchoredMenu` with submenu support could finish this.
- **SubmitGalleryModal zoom overlay** — click-anywhere lightbox, not a centred card.

**Also surfaced + fixed:** floating panels now honour the panel manifest's
`showIf` (they used to persist when their feature was disabled, unlike the dock);
modals' Escape-from-a-focused-field regression (key-stops now let Escape through).

