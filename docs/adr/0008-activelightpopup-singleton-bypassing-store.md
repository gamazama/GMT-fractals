# ADR-0008: activeLightPopup singleton bypassing the store

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine-gmt/features/lighting/utils/GizmoMath`, `engine-gmt/topbar/CenterHUD.tsx`

## Context

The Light Studio HUD writes its hovered/active light index every
frame to drive the viewport gizmo's range-circle highlight. Going
through the store would force a React re-render per move;
subscribing the gizmo to the store via selector still couples
HUD ⇄ canvas through React.

## Decision

Introduce a module-mutable singleton `activeLightPopup` in
`features/lighting/utils/GizmoMath`. Both `CenterHUD` and the gizmo
read/write it directly; `state.openLightPopupIndex` mirrors it for
tutorial trigger consumption.

## Consequences

- Performance bypass at the cost of an undocumented cross-component
  contract.
- Anyone adding a second writer (e.g. `LightPanelControls`) must
  remember to update both surfaces.
- Captured here so future agents don't "tidy up" the singleton.
