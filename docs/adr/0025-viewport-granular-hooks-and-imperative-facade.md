# ADR-0025: Viewport granular hooks + imperative façade, not a single useViewport()

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Viewport.tsx`, `store/slices/viewportSlice.ts`, viewport hooks

## Context

Consumers vary widely — the FPS HUD only needs
`fps` / `fpsSmoothed`; the canvas only needs `canvasPixelSize`; the
badge needs `adaptiveSuppressed` + `adaptiveConfig`. A unified
`useViewport()` would re-render every consumer on any change.

## Decision

Five granular hooks (`useQualityFraction`, `useViewportSize`,
`useViewportFps`, `useViewportInteraction`, `useViewportMode`) + an
imperative `viewport.*` façade (`frameTick`, `reportFps`,
`holdAdaptive`, `suppressAdaptive`, `setConfig`). The planned
`useViewport` / `setAdaptive` / `setMode` / `onResize` callback
surface from `docs/engine/10_Viewport.md` was deliberately not built.

## Consequences

- Each consumer re-renders only on its tracked slice.
- Apps wire imperative changes via the façade or store actions; there
  is no `<PerformanceWarning>` / `<ViewportArea canvasSlot>` chrome.
