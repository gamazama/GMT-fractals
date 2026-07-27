---
paths:
  - "hooks/useMobileLayout.ts"
  - "engine/components/**"
  - "engine/HardwareDetection.ts"
---

# Mobile layout

Read first: JSDoc on `hooks/useMobileLayout.ts` and
`engine/components/{Landscape,Mobile}*` — address-bar collapse and the layout
primitives. `engine/HardwareDetection.ts` owns the detection primitive itself.

Decisions: ADRs 0038-0039.

## Watch out

- **`isMobileViewport()` in `engine/HardwareDetection.ts` is the single source of
  truth for the 768px / `(pointer: coarse)` breakpoint** — `useMobileLayout.ts`
  imports it. Change the threshold there, not at a call site. One un-migrated
  copy survives inline in `store/slices/viewportSlice.ts` (`isMobile()`, used only
  for the default DPR); keep the two in step until the planned
  `@engine/environment` plugin absorbs both.
- `detectHardwareProfile(gl)` is NOT cached — each call with a GL context
  allocates and deletes a 1x1 RGBA32F framebuffer + texture. Detect once at boot.
- `MobileViewportShell` has a fixed-position stacking trap — a fixed ancestor
  creates a containing block that in-flow z-index can't escape. See the layers rule.
- Mobile float-format support differs from desktop. The `?diag` query param is the
  workflow for diagnosing device-specific render failures.

## Guards

```
npm run smoke:viewport
npm run smoke:viewport-fixed
```