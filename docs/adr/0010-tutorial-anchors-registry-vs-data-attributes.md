# ADR-0010: Tutorial anchors registry vs data-attributes

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/tutorial/anchors.ts`

## Context

An earlier design used `data-tut="anchor-name"` attributes scattered
across components. The overlay located them via
`document.querySelector('[data-tut=...]')` on every step entry.
Dynamically-rendered components (per-light gizmo labels) were awkward;
stale DOM (post-unmount) yielded zero-rect anchors.

## Decision

Replace data-attributes with a module-singleton `tutorAnchors`
registry. Components opt in via `useTutorAnchor(id)` returning a
ref-callback. The registry holds live `HTMLElement` references;
`get(id)` prefers visible entries; multiple components can register
the same id; the registry is notify-capable so the overlay subscribes
to layout changes.

## Consequences

- Late-registered anchors are observed for position updates but never
  added to the per-element ResizeObserver — pure resize of a
  late-registered anchor is not tracked (accepted drift, flagged in
  `Overlay.tsx:189-194`).
- `useTutorAnchor` is hook-bound; JSX `.map(...)` bodies need the
  non-hook `tutorAnchorRef(id)` factory and must memoise it.
